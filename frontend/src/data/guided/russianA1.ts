/**
 * Russian A1 guided tier — 10 paths × 10 lessons, bright-only, contentStatus
 * 'draft' until reviewed. Authoring contract (tmp\RUSSIAN_A1_P1_P10_SPEC.md):
 * one-turn A1 phrases, вы-register throughout, Cyrillic with ё written where it
 * belongs, and ZERO gendered learner forms — no past tense (-л/-ла) and no
 * short-adjective agreement (рад/рада) anywhere in learner lines. Chunks join
 * with single spaces to the corePhrase. Slugs are ASCII transliterations.
 * TTS-FROZEN (2026-07-17): the bright ElevenLabs batch ran for all 10 paths
 * (profiles russian_a1_bright_p{n}_multiv2_v1, roster Maria/Alan/Nina/Mark) —
 * ids and TTS-bearing text (corePhrase/chunks/trophyWord) must NOT change
 * without a regeneration plan.
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

const RUSSIAN_GUIDED_TODAY_STEPS: GuidedLessonStep[] = ['scene', 'matchPairs', 'build', 'type', 'speak', 'complete']

// Typists routinely write е for ё — every answer that contains ё must also
// accept the е-spelling. Target text itself always keeps ё.
export function russianAccepted(answer: string): string[] {
  const folded = answer.replace(/ё/g, 'е').replace(/Ё/g, 'Е')
  return folded === answer ? [answer] : [answer, folded]
}

type RussianVariantInput = {
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

type RussianLessonInput = {
  slug: string
  title: GuidedBaseContentText
  situation: GuidedLessonDefinition['situation']
  pedagogicalGoal: string
  variant: GuidedLessonVibeVariant
}

export function makeBrightRussianVariant(input: RussianVariantInput): GuidedLessonVibeVariant {
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

export function makeRussianPracticalLessons(
  metadata: GuidedPathMetadata,
  inputs: RussianLessonInput[],
  completionSituation: { de: string; en: string },
): GuidedLessonDefinition[] {
  return inputs.map((lessonInput, index) => {
    const lessonNumber = index + 1
    const pathNumber = metadata.id.replace('russian-a1-practical-', '')
    const id = `russian-a1-practical-${pathNumber}-lesson-${lessonNumber}-${lessonInput.slug}`
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
      steps: RUSSIAN_GUIDED_TODAY_STEPS,
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

export type { RussianLessonInput, RussianVariantInput }

export const GUIDED_TODAY_PATH_RUSSIAN_ONE_METADATA: GuidedPathMetadata = {
  id: 'russian-a1-practical-1',
  title: 'Russian A1 Practical 1',
  shortTitle: 'A1 Practical 1',
  subtitle: { de: 'Erster Kontakt auf Russisch', en: 'First contact in Russian' },
  level: 'A1',
  baseLanguage: 'German',
  targetLanguage: 'Russian',
  estimatedMinutes: 5,
}

const russianA1Practical1Inputs: RussianLessonInput[] = [
  {
    slug: 'zdravstvuyte-english-question',
    title: { de: 'Sprechen Sie Englisch?', en: 'Do you speak English?' },
    situation: {
      de: 'An der Rezeption begrüßt du die Person am Schalter und fragst höflich, ob sie Englisch spricht.',
      en: 'At a reception desk, greet the staff member and politely ask whether they speak English.',
    },
    pedagogicalGoal: 'Eine formelle Begrüßung sicher mit einer einfachen Sprachfrage verbinden.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Здравствуйте, вы говорите по-английски?',
        baseText: { de: 'Guten Tag, sprechen Sie Englisch?', en: 'Hello, do you speak English?' },
      },
      meaning: {
        de: 'Eine höfliche erste Frage, wenn du Unterstützung in einer gemeinsamen Sprache brauchst.',
        en: 'A polite first question when you need help in a shared language.',
      },
      chunks: [
        { id: 'zdravstvuyte-english-question-greeting', targetText: 'Здравствуйте,', baseText: { de: 'Guten Tag,', en: 'Hello,' } },
        { id: 'zdravstvuyte-english-question-speak', targetText: 'вы говорите', baseText: { de: 'sprechen Sie', en: 'do you speak' } },
        { id: 'zdravstvuyte-english-question-english', targetText: 'по-английски?', baseText: { de: 'Englisch?', en: 'English?' } },
      ],
      lessonItems: [
        { id: 'zdravstvuyte-english-question-item-greeting', targetText: 'здравствуйте', baseText: { de: 'guten Tag', en: 'hello / good day' }, acceptedAnswers: ['здравствуйте'] },
        { id: 'zdravstvuyte-english-question-item-speak', targetText: 'говорить', baseText: { de: 'sprechen', en: 'to speak' }, acceptedAnswers: ['говорить'] },
        { id: 'zdravstvuyte-english-question-item-english', targetText: 'по-английски', baseText: { de: 'auf Englisch', en: 'in English' }, acceptedAnswers: ['по-английски'] },
        { id: 'zdravstvuyte-english-question-item-language', targetText: 'язык', baseText: { de: 'Sprache', en: 'language' }, acceptedAnswers: ['язык'] },
      ],
      buildChips: ['Здравствуйте,', 'вы говорите', 'по-английски?', 'Доброе утро,', 'по-немецки?'],
      typeRecall: {
        before: 'Здравствуйте, вы говорите ', answer: 'по-английски', after: '?',
        acceptedAnswers: russianAccepted('по-английски'),
        fallbackChoices: ['по-английски', 'по-русски', 'по-французски', 'по-китайски'],
      },
      speakTarget: {
        baseCue: { de: 'Guten Tag, sprechen Sie Englisch?', en: 'Hello, do you speak English?' },
        targetPhrase: 'Здравствуйте, вы говорите по-английски?',
        requiredTokens: ['Здравствуйте', 'вы', 'говорите'],
        optionalTokens: ['по-английски'],
      },
      sceneCaption: {
        de: 'Eine ruhige Rezeption; die Person hinter dem Schalter wartet offen auf deine erste Frage.',
        en: 'A quiet reception desk; the staff member waits attentively for your first question.',
      },
      trophyWord: {
        word: 'говорить', meaning: { de: 'sprechen', en: 'to speak' },
        example: 'Вы хорошо говорите по-русски.',
        whyThisWord: { de: 'Dieses Verb öffnet Gespräche über Sprachen und Verständigung.', en: 'This verb opens conversations about languages and mutual understanding.' },
      },
      placeholderCaption: { de: 'Helle Empfangstheke mit Stadtplan und Namensschild.', en: 'A bright reception counter with a city map and name badge.' },
      songMood: 'welcoming first connection',
      visualNotes: 'Region-neutral hotel reception, open posture, morning light, focus on a respectful first contact.',
    }),
  },
  {
    slug: 'ya-eshchyo-russian-speaking',
    title: { de: 'Noch kein Russisch', en: 'Not speaking Russian yet' },
    situation: {
      de: 'Eine Person spricht dich auf Russisch an; du erklärst knapp, dass du die Sprache noch nicht sprichst.',
      en: 'Someone addresses you in Russian, and you briefly explain that you do not speak the language yet.',
    },
    pedagogicalGoal: 'Mit einer neutralen Präsensform eine aktuelle Sprachgrenze ausdrücken.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Я ещё не говорю по-русски.',
        baseText: { de: 'Ich spreche noch kein Russisch.', en: 'I do not speak Russian yet.' },
      },
      meaning: {
        de: 'Eine ehrliche, freundliche Erklärung, die offenlässt, dass du noch lernst.',
        en: 'An honest, friendly explanation that leaves room for the fact that you are still learning.',
      },
      chunks: [
        { id: 'ya-eshchyo-russian-speaking-not-yet', targetText: 'Я ещё не говорю', baseText: { de: 'Ich spreche noch nicht', en: 'I do not speak yet' } },
        { id: 'ya-eshchyo-russian-speaking-russian', targetText: 'по-русски.', baseText: { de: 'auf Russisch.', en: 'in Russian.' } },
      ],
      lessonItems: [
        { id: 'ya-eshchyo-russian-speaking-item-yet', targetText: 'ещё', baseText: { de: 'noch', en: 'yet / still' }, acceptedAnswers: russianAccepted('ещё') },
        { id: 'ya-eshchyo-russian-speaking-item-speak', targetText: 'говорить', baseText: { de: 'sprechen', en: 'to speak' }, acceptedAnswers: ['говорить'] },
        { id: 'ya-eshchyo-russian-speaking-item-russian', targetText: 'по-русски', baseText: { de: 'auf Russisch', en: 'in Russian' }, acceptedAnswers: ['по-русски'] },
        { id: 'ya-eshchyo-russian-speaking-item-language', targetText: 'русский язык', baseText: { de: 'russische Sprache', en: 'Russian language' }, acceptedAnswers: ['русский язык'] },
      ],
      buildChips: ['Я ещё не говорю', 'по-русски.', 'Я немного понимаю', 'по-английски.'],
      typeRecall: {
        before: 'Я ещё не ', answer: 'говорю', after: ' по-русски.',
        acceptedAnswers: russianAccepted('говорю'),
        fallbackChoices: ['говорю', 'читаю', 'пишу', 'живу'],
      },
      speakTarget: {
        baseCue: { de: 'Ich spreche noch kein Russisch.', en: 'I do not speak Russian yet.' },
        targetPhrase: 'Я ещё не говорю по-русски.',
        requiredTokens: ['Я', 'ещё', 'говорю'],
        optionalTokens: ['не', 'по-русски'],
      },
      sceneCaption: {
        de: 'An einem Informationsschalter beginnt die andere Person schnell zu sprechen und wartet auf deine Reaktion.',
        en: 'At an information desk, the other person begins speaking quickly and waits for your response.',
      },
      trophyWord: {
        word: 'ещё', meaning: { de: 'noch', en: 'yet / still' },
        example: 'У вас есть ещё чай?',
        whyThisWord: { de: 'Das kleine Adverb macht deutlich, dass ein Zustand vorläufig ist oder etwas zusätzlich gewünscht wird.', en: 'This small adverb shows that a situation is temporary or that something additional is wanted.' },
      },
      placeholderCaption: { de: 'Informationsschalter mit geöffnetem Reiseführer und geduldigem Blickkontakt.', en: 'An information desk with an open phrasebook and patient eye contact.' },
      songMood: 'honest beginner courage',
      visualNotes: 'Public information counter, small phrasebook, supportive expression, no national landmark dependency.',
    }),
  },
  {
    slug: 'govorite-medlenno-slowly',
    title: { de: 'Bitte langsam', en: 'Slowly, please' },
    situation: {
      de: 'Die Person am Fahrkartenschalter spricht zu schnell; du bittest höflich um ein langsameres Tempo.',
      en: 'The person at the ticket counter is speaking too quickly, so you politely ask for a slower pace.',
    },
    pedagogicalGoal: 'Eine höfliche Aufforderung mit einem klaren Tempo-Adverb bilden.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Говорите медленно, пожалуйста.',
        baseText: { de: 'Sprechen Sie bitte langsam.', en: 'Please speak slowly.' },
      },
      meaning: { de: 'Eine direkte, respektvolle Bitte um verständlicheres Sprechen.', en: 'A direct, respectful request for speech that is easier to follow.' },
      chunks: [
        { id: 'govorite-medlenno-slowly-pace', targetText: 'Говорите медленно,', baseText: { de: 'Sprechen Sie langsam,', en: 'Speak slowly,' } },
        { id: 'govorite-medlenno-slowly-please', targetText: 'пожалуйста.', baseText: { de: 'bitte.', en: 'please.' } },
      ],
      lessonItems: [
        { id: 'govorite-medlenno-slowly-item-speak', targetText: 'говорить', baseText: { de: 'sprechen', en: 'to speak' }, acceptedAnswers: ['говорить'] },
        { id: 'govorite-medlenno-slowly-item-slowly', targetText: 'медленно', baseText: { de: 'langsam', en: 'slowly' }, acceptedAnswers: ['медленно'] },
        { id: 'govorite-medlenno-slowly-item-please', targetText: 'пожалуйста', baseText: { de: 'bitte', en: 'please' }, acceptedAnswers: ['пожалуйста'] },
        { id: 'govorite-medlenno-slowly-item-speech', targetText: 'речь', baseText: { de: 'Rede / Sprache', en: 'speech' }, acceptedAnswers: ['речь'] },
      ],
      buildChips: ['Говорите медленно,', 'пожалуйста.', 'Повторите ещё раз,', 'спасибо.'],
      typeRecall: {
        before: 'Говорите ', answer: 'медленно', after: ', пожалуйста.',
        acceptedAnswers: russianAccepted('медленно'),
        fallbackChoices: ['медленно', 'громко', 'снова', 'здесь'],
      },
      speakTarget: {
        baseCue: { de: 'Sprechen Sie bitte langsam.', en: 'Please speak slowly.' },
        targetPhrase: 'Говорите медленно, пожалуйста.',
        requiredTokens: ['Говорите', 'медленно', 'пожалуйста'],
        optionalTokens: [],
      },
      sceneCaption: {
        de: 'Vor dir liegen Fahrplan und Notizblock; die Erklärung am Schalter läuft hörbar zu schnell.',
        en: 'A timetable and notepad lie in front of you while the explanation at the counter moves noticeably fast.',
      },
      trophyWord: {
        word: 'медленно', meaning: { de: 'langsam', en: 'slowly' },
        example: 'Говорите медленно, пожалуйста.',
        whyThisWord: { de: 'Dieses Tempo-Wort macht schwierige Gespräche sofort handhabbarer.', en: 'This pace word makes difficult conversations manageable immediately.' },
      },
      placeholderCaption: { de: 'Fahrkartenschalter mit Fahrplan, Stift und ruhiger Handbewegung.', en: 'A ticket counter with a timetable, pen, and calming hand gesture.' },
      songMood: 'patient listening rhythm',
      visualNotes: 'Regional rail ticket window, measured hand gesture, visual rhythm slowing from busy to calm.',
    }),
  },
  {
    slug: 'izvinite-ne-ponimayu-understand',
    title: { de: 'Ich verstehe nicht', en: 'I do not understand' },
    situation: {
      de: 'An einem Kiosk bleibt eine Erklärung unklar; du signalisierst höflich, dass du sie nicht verstehst.',
      en: 'At a kiosk, an explanation remains unclear, so you politely signal that you do not understand it.',
    },
    pedagogicalGoal: 'Ein Verständnisproblem mit Entschuldigung und Präsensform neutral benennen.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Извините, я не понимаю.',
        baseText: { de: 'Entschuldigen Sie, ich verstehe nicht.', en: 'Excuse me, I do not understand.' },
      },
      meaning: { de: 'Eine höfliche Reparaturphrase, bevor die andere Person etwas neu erklärt.', en: 'A polite repair phrase before the other person explains something again.' },
      chunks: [
        { id: 'izvinite-ne-ponimayu-understand-apology', targetText: 'Извините,', baseText: { de: 'Entschuldigen Sie,', en: 'Excuse me,' } },
        { id: 'izvinite-ne-ponimayu-understand-problem', targetText: 'я не понимаю.', baseText: { de: 'ich verstehe nicht.', en: 'I do not understand.' } },
      ],
      lessonItems: [
        { id: 'izvinite-ne-ponimayu-understand-item-excuse', targetText: 'извините', baseText: { de: 'entschuldigen Sie', en: 'excuse me' }, acceptedAnswers: ['извините'] },
        { id: 'izvinite-ne-ponimayu-understand-item-understand', targetText: 'понимать', baseText: { de: 'verstehen', en: 'to understand' }, acceptedAnswers: ['понимать'] },
        { id: 'izvinite-ne-ponimayu-understand-item-explanation', targetText: 'объяснение', baseText: { de: 'Erklärung', en: 'explanation' }, acceptedAnswers: ['объяснение'] },
        { id: 'izvinite-ne-ponimayu-understand-item-question', targetText: 'вопрос', baseText: { de: 'Frage', en: 'question' }, acceptedAnswers: ['вопрос'] },
      ],
      buildChips: ['Извините,', 'я не понимаю.', 'я всё понимаю.', 'повторите, пожалуйста.'],
      typeRecall: {
        before: 'Извините, я не ', answer: 'понимаю', after: '.',
        acceptedAnswers: russianAccepted('понимаю'),
        fallbackChoices: ['понимаю', 'слышу', 'знаю', 'читаю'],
      },
      speakTarget: {
        baseCue: { de: 'Entschuldigen Sie, ich verstehe nicht.', en: 'Excuse me, I do not understand.' },
        targetPhrase: 'Извините, я не понимаю.',
        requiredTokens: ['Извините', 'я', 'понимаю'],
        optionalTokens: ['не'],
      },
      sceneCaption: {
        de: 'Die Verkäuferin zeigt auf mehrere ähnliche Produkte; die Erklärung lässt dich noch unsicher.',
        en: 'The shop assistant points to several similar products, and the explanation still leaves you uncertain.',
      },
      trophyWord: {
        word: 'понимать', meaning: { de: 'verstehen', en: 'to understand' },
        example: 'Вы понимаете этот вопрос?',
        whyThisWord: { de: 'Das Verb benennt klar, ob eine Erklärung angekommen ist.', en: 'This verb clearly states whether an explanation has landed.' },
      },
      placeholderCaption: { de: 'Kioskregal mit ähnlichen Produkten und fragendem Blick.', en: 'A kiosk shelf with similar products and an uncertain glance.' },
      songMood: 'gentle conversational repair',
      visualNotes: 'Small street kiosk, two similar packages, respectful pause before clarification.',
    }),
  },
  {
    slug: 'kak-nazyvaetsya-name',
    title: { de: 'Wie heißt das?', en: 'What is this called?' },
    situation: {
      de: 'In einer Bäckerei zeigst du auf ein unbekanntes Gebäck und möchtest seinen Namen erfahren.',
      en: 'In a bakery, you point to an unfamiliar pastry and want to learn its name.',
    },
    pedagogicalGoal: 'Mit einer kurzen Wie-heißt-das-Frage konkreten Wortschatz erfragen.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Как это называется?',
        baseText: { de: 'Wie heißt das?', en: 'What is this called?' },
      },
      meaning: { de: 'Eine kompakte Frage nach dem Namen eines sichtbaren Gegenstands.', en: 'A compact question for the name of a visible object.' },
      chunks: [
        { id: 'kak-nazyvaetsya-name-prompt', targetText: 'Как это', baseText: { de: 'Wie wird das', en: 'What is this' } },
        { id: 'kak-nazyvaetsya-name-called', targetText: 'называется?', baseText: { de: 'genannt?', en: 'called?' } },
      ],
      lessonItems: [
        { id: 'kak-nazyvaetsya-name-item-call', targetText: 'называться', baseText: { de: 'heißen / genannt werden', en: 'to be called' }, acceptedAnswers: ['называться'] },
        { id: 'kak-nazyvaetsya-name-item-name', targetText: 'название', baseText: { de: 'Name / Bezeichnung', en: 'name / title' }, acceptedAnswers: ['название'] },
        { id: 'kak-nazyvaetsya-name-item-object', targetText: 'предмет', baseText: { de: 'Gegenstand', en: 'object' }, acceptedAnswers: ['предмет'] },
        { id: 'kak-nazyvaetsya-name-item-word', targetText: 'слово', baseText: { de: 'Wort', en: 'word' }, acceptedAnswers: ['слово'] },
      ],
      buildChips: ['Как это', 'называется?', 'Где это', 'продаётся?'],
      typeRecall: {
        before: 'Как это ', answer: 'называется', after: '?',
        acceptedAnswers: russianAccepted('называется'),
        fallbackChoices: ['называется', 'находится', 'работает', 'открывается'],
      },
      speakTarget: {
        baseCue: { de: 'Wie heißt das?', en: 'What is this called?' },
        targetPhrase: 'Как это называется?',
        requiredTokens: ['Как', 'это', 'называется'],
        optionalTokens: [],
      },
      sceneCaption: {
        de: 'In der Vitrine liegt ein Gebäck ohne gut lesbares Schild; die Bedienung folgt deinem Zeigefinger.',
        en: 'A pastry sits behind the glass without a readable label, and the staff member follows your pointing finger.',
      },
      trophyWord: {
        word: 'называться', meaning: { de: 'heißen', en: 'to be called' },
        example: 'Скажите, как называется эта улица?',
        whyThisWord: { de: 'Mit diesem Verb kannst du Namen von Speisen, Orten und Dingen erfragen.', en: 'This verb lets you ask for the names of foods, places, and objects.' },
      },
      placeholderCaption: { de: 'Bäckereivitrine mit einem unbeschrifteten goldenen Gebäck.', en: 'A bakery case with one unlabeled golden pastry.' },
      songMood: 'curious word discovery',
      visualNotes: 'Neighborhood bakery display, one unfamiliar pastry, label space visible but unreadable.',
    }),
  },
  {
    slug: 'bolshoe-spasibo-help',
    title: { de: 'Vielen Dank für die Hilfe', en: 'Thank you very much for the help' },
    situation: {
      de: 'Eine Mitarbeiterin hat dir den richtigen Ausgang auf einem Plan gezeigt; du bedankst dich herzlich.',
      en: 'A staff member has shown you the correct exit on a map, and you offer warm thanks.',
    },
    pedagogicalGoal: 'Dank mit einem konkreten Anlass als feste höfliche Einheit ausdrücken.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Большое спасибо за помощь.',
        baseText: { de: 'Vielen Dank für die Hilfe.', en: 'Thank you very much for the help.' },
      },
      meaning: { de: 'Ein herzlicher, aber alltagstauglicher Dank nach praktischer Unterstützung.', en: 'Warm but everyday thanks after receiving practical assistance.' },
      chunks: [
        { id: 'bolshoe-spasibo-help-thanks', targetText: 'Большое спасибо', baseText: { de: 'Vielen Dank', en: 'Thank you very much' } },
        { id: 'bolshoe-spasibo-help-assistance', targetText: 'за помощь.', baseText: { de: 'für die Hilfe.', en: 'for the help.' } },
      ],
      lessonItems: [
        { id: 'bolshoe-spasibo-help-item-thanks', targetText: 'большое спасибо', baseText: { de: 'vielen Dank', en: 'thank you very much' }, acceptedAnswers: ['большое спасибо'] },
        { id: 'bolshoe-spasibo-help-item-help', targetText: 'помощь', baseText: { de: 'Hilfe', en: 'help' }, acceptedAnswers: ['помощь'] },
        { id: 'bolshoe-spasibo-help-item-gratitude', targetText: 'благодарность', baseText: { de: 'Dankbarkeit', en: 'gratitude' }, acceptedAnswers: ['благодарность'] },
        { id: 'bolshoe-spasibo-help-item-staff', targetText: 'сотрудник', baseText: { de: 'Mitarbeiter', en: 'staff member' }, acceptedAnswers: ['сотрудник'] },
      ],
      buildChips: ['Большое спасибо', 'за помощь.', 'за билет.', 'До встречи.'],
      typeRecall: {
        before: 'Большое спасибо за ', answer: 'помощь', after: '.',
        acceptedAnswers: russianAccepted('помощь'),
        fallbackChoices: ['помощь', 'совет', 'ответ', 'билет'],
      },
      speakTarget: {
        baseCue: { de: 'Vielen Dank für die Hilfe.', en: 'Thank you very much for the help.' },
        targetPhrase: 'Большое спасибо за помощь.',
        requiredTokens: ['Большое', 'спасибо', 'помощь'],
        optionalTokens: ['за'],
      },
      sceneCaption: {
        de: 'Auf dem Stationsplan ist der passende Ausgang markiert; die helfende Person legt den Stift beiseite.',
        en: 'The correct exit is marked on the station map as the helpful staff member sets the pen down.',
      },
      trophyWord: {
        word: 'помощь', meaning: { de: 'Hilfe', en: 'help' },
        example: 'Вам нужна помощь?',
        whyThisWord: { de: 'Das Nomen benennt praktische Unterstützung in Geschäften, Stationen und Hotels.', en: 'This noun names practical assistance in shops, stations, and hotels.' },
      },
      placeholderCaption: { de: 'Stationsplan mit eingekreistem Ausgang und abgelegtem Stift.', en: 'A station map with a circled exit and a pen set aside.' },
      songMood: 'bright grateful relief',
      visualNotes: 'Transit map close-up, circled exit, appreciative eye contact, gentle golden highlight.',
    }),
  },
  {
    slug: 'izvinite-mozhno-sprosit-attention',
    title: { de: 'Darf ich etwas fragen?', en: 'May I ask something?' },
    situation: {
      de: 'In einer Bahnhofshalle möchtest du eine fremde Person höflich ansprechen, bevor du deine Frage stellst.',
      en: 'In a station hall, you want to get a stranger’s attention politely before asking your question.',
    },
    pedagogicalGoal: 'Mit Entschuldigung und Erlaubnisformel respektvoll Aufmerksamkeit gewinnen.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Извините, можно спросить?',
        baseText: { de: 'Entschuldigen Sie, darf ich etwas fragen?', en: 'Excuse me, may I ask something?' },
      },
      meaning: { de: 'Ein höflicher Gesprächsöffner, bevor du eine fremde Person um Auskunft bittest.', en: 'A polite opener before asking a stranger for information.' },
      chunks: [
        { id: 'izvinite-mozhno-sprosit-attention-excuse', targetText: 'Извините,', baseText: { de: 'Entschuldigen Sie,', en: 'Excuse me,' } },
        { id: 'izvinite-mozhno-sprosit-attention-ask', targetText: 'можно спросить?', baseText: { de: 'darf ich etwas fragen?', en: 'may I ask something?' } },
      ],
      lessonItems: [
        { id: 'izvinite-mozhno-sprosit-attention-item-excuse', targetText: 'извините', baseText: { de: 'entschuldigen Sie', en: 'excuse me' }, acceptedAnswers: ['извините'] },
        { id: 'izvinite-mozhno-sprosit-attention-item-ask', targetText: 'спросить', baseText: { de: 'fragen', en: 'to ask' }, acceptedAnswers: ['спросить'] },
        { id: 'izvinite-mozhno-sprosit-attention-item-question', targetText: 'вопрос', baseText: { de: 'Frage', en: 'question' }, acceptedAnswers: ['вопрос'] },
        { id: 'izvinite-mozhno-sprosit-attention-item-attention', targetText: 'внимание', baseText: { de: 'Aufmerksamkeit', en: 'attention' }, acceptedAnswers: ['внимание'] },
      ],
      buildChips: ['Извините,', 'можно спросить?', 'можно пройти?', 'Спасибо за ответ.'],
      typeRecall: {
        before: 'Извините, можно ', answer: 'спросить', after: '?',
        acceptedAnswers: russianAccepted('спросить'),
        fallbackChoices: ['спросить', 'пройти', 'войти', 'подождать'],
      },
      speakTarget: {
        baseCue: { de: 'Entschuldigen Sie, darf ich etwas fragen?', en: 'Excuse me, may I ask something?' },
        targetPhrase: 'Извините, можно спросить?',
        requiredTokens: ['Извините', 'можно', 'спросить'],
        optionalTokens: [],
      },
      sceneCaption: {
        de: 'Eine Person steht nahe dem großen Abfahrtsplan; zwischen euch ist genug Abstand für eine höfliche Ansprache.',
        en: 'Someone stands near the large departures board, with enough space between you for a respectful approach.',
      },
      trophyWord: {
        word: 'спросить', meaning: { de: 'fragen', en: 'to ask' },
        example: 'Можно спросить ваш адрес?',
        whyThisWord: { de: 'Der Infinitiv hilft dir, um Erlaubnis für eine kurze Frage zu bitten.', en: 'The infinitive helps you ask permission to pose a brief question.' },
      },
      placeholderCaption: { de: 'Geräumige Bahnhofshalle mit Abfahrtsplan und wartender Person.', en: 'A spacious station hall with a departures board and a waiting traveler.' },
      songMood: 'respectful opening gesture',
      visualNotes: 'Regional station concourse, departures board, considerate distance, calm invitation to speak.',
    }),
  },
  {
    slug: 'da-moy-zakaz-confirm',
    title: { de: 'Ja, meine Bestellung', en: 'Yes, my order' },
    situation: {
      de: 'Am Abholbereich hält die Bedienung einen Becher mit deiner Nummer hoch und wartet auf Bestätigung.',
      en: 'At the pickup counter, the staff member holds up a cup with your number and waits for confirmation.',
    },
    pedagogicalGoal: 'Eine klare Ja-Bestätigung mit einem sichtbaren Gegenstand verbinden.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Да, это мой заказ.',
        baseText: { de: 'Ja, das ist meine Bestellung.', en: 'Yes, that is my order.' },
      },
      meaning: { de: 'Eine kurze Bestätigung, wenn Personal deine Bestellung überprüft.', en: 'A short confirmation when staff are checking your order.' },
      chunks: [
        { id: 'da-moy-zakaz-confirm-yes', targetText: 'Да,', baseText: { de: 'Ja,', en: 'Yes,' } },
        { id: 'da-moy-zakaz-confirm-order', targetText: 'это мой заказ.', baseText: { de: 'das ist meine Bestellung.', en: 'that is my order.' } },
      ],
      lessonItems: [
        { id: 'da-moy-zakaz-confirm-item-order', targetText: 'заказ', baseText: { de: 'Bestellung', en: 'order' }, acceptedAnswers: ['заказ'] },
        { id: 'da-moy-zakaz-confirm-item-number', targetText: 'номер', baseText: { de: 'Nummer', en: 'number' }, acceptedAnswers: ['номер'] },
        { id: 'da-moy-zakaz-confirm-item-confirmation', targetText: 'подтверждение', baseText: { de: 'Bestätigung', en: 'confirmation' }, acceptedAnswers: ['подтверждение'] },
        { id: 'da-moy-zakaz-confirm-item-counter', targetText: 'стойка', baseText: { de: 'Theke', en: 'counter' }, acceptedAnswers: ['стойка'] },
      ],
      buildChips: ['Да,', 'это мой заказ.', 'Нет,', 'это ваш чек.'],
      typeRecall: {
        before: 'Да, это мой ', answer: 'заказ', after: '.',
        acceptedAnswers: russianAccepted('заказ'),
        fallbackChoices: ['заказ', 'стол', 'билет', 'чек'],
      },
      speakTarget: {
        baseCue: { de: 'Ja, das ist meine Bestellung.', en: 'Yes, that is my order.' },
        targetPhrase: 'Да, это мой заказ.',
        requiredTokens: ['Да', 'мой', 'заказ'],
        optionalTokens: ['это'],
      },
      sceneCaption: {
        de: 'Am Abholbrett steht nur noch ein beschrifteter Becher; die Bedienung zeigt auf die Nummer.',
        en: 'Only one labeled cup remains on the pickup shelf, and the staff member points to its number.',
      },
      trophyWord: {
        word: 'заказ', meaning: { de: 'Bestellung', en: 'order' },
        example: 'Ваш заказ уже на стойке.',
        whyThisWord: { de: 'Das Nomen verbindet Bestellen, Abholen und Nachfragen in Café oder Restaurant.', en: 'This noun connects ordering, pickup, and questions in a cafe or restaurant.' },
      },
      placeholderCaption: { de: 'Ein einzelner beschrifteter Becher auf einem Café-Abholbrett.', en: 'A single labeled cup on a cafe pickup shelf.' },
      songMood: 'quick cheerful confirmation',
      visualNotes: 'Cafe pickup counter, one numbered cup, concise confirmation moment, clean uncluttered frame.',
    }),
  },
  {
    slug: 'skazhite-gde-tualet-bathroom',
    title: { de: 'Wo ist die Toilette?', en: 'Where is the bathroom?' },
    situation: {
      de: 'In einem Bahnhof findest du kein eindeutiges Schild und fragst einen Mitarbeiter nach der Toilette.',
      en: 'At a station, you cannot find a clear sign and ask a staff member for the bathroom.',
    },
    pedagogicalGoal: 'Eine höflich eingeleitete Wo-Frage nach einem wichtigen Ort stellen.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Скажите, пожалуйста, где туалет?',
        baseText: { de: 'Können Sie mir bitte sagen, wo die Toilette ist?', en: 'Could you tell me where the bathroom is?' },
      },
      meaning: { de: 'Eine höfliche Ortsfrage für Bahnhof, Café oder Museum.', en: 'A polite location question for a station, cafe, or museum.' },
      chunks: [
        { id: 'skazhite-gde-tualet-bathroom-opener', targetText: 'Скажите, пожалуйста,', baseText: { de: 'Sagen Sie bitte,', en: 'Could you tell me,' } },
        { id: 'skazhite-gde-tualet-bathroom-location', targetText: 'где туалет?', baseText: { de: 'wo ist die Toilette?', en: 'where is the bathroom?' } },
      ],
      lessonItems: [
        { id: 'skazhite-gde-tualet-bathroom-item-say', targetText: 'сказать', baseText: { de: 'sagen', en: 'to say / tell' }, acceptedAnswers: ['сказать'] },
        { id: 'skazhite-gde-tualet-bathroom-item-bathroom', targetText: 'туалет', baseText: { de: 'Toilette', en: 'bathroom' }, acceptedAnswers: ['туалет'] },
        { id: 'skazhite-gde-tualet-bathroom-item-sign', targetText: 'указатель', baseText: { de: 'Wegweiser', en: 'direction sign' }, acceptedAnswers: ['указатель'] },
        { id: 'skazhite-gde-tualet-bathroom-item-hallway', targetText: 'коридор', baseText: { de: 'Flur', en: 'hallway' }, acceptedAnswers: ['коридор'] },
      ],
      buildChips: ['Скажите, пожалуйста,', 'где туалет?', 'где выход?', 'Покажите на карте.'],
      typeRecall: {
        before: 'Скажите, пожалуйста, где ', answer: 'туалет', after: '?',
        acceptedAnswers: russianAccepted('туалет'),
        fallbackChoices: ['туалет', 'выход', 'лифт', 'вход'],
      },
      speakTarget: {
        baseCue: { de: 'Können Sie mir bitte sagen, wo die Toilette ist?', en: 'Could you tell me where the bathroom is?' },
        targetPhrase: 'Скажите, пожалуйста, где туалет?',
        requiredTokens: ['Скажите', 'пожалуйста', 'туалет'],
        optionalTokens: ['где'],
      },
      sceneCaption: {
        de: 'Im Bahnhofskorridor zeigen mehrere Pfeile in verschiedene Richtungen, aber das gesuchte Symbol fehlt.',
        en: 'Several arrows point down the station corridor, but the symbol you need is missing.',
      },
      trophyWord: {
        word: 'туалет', meaning: { de: 'Toilette', en: 'bathroom' },
        example: 'Туалет находится рядом.',
        whyThisWord: { de: 'Dieses konkrete Ortswort ist unterwegs unverzichtbar und leicht wiederzuerkennen.', en: 'This concrete place word is essential while traveling and easy to recognize again.' },
      },
      placeholderCaption: { de: 'Bahnhofskorridor mit mehreren Richtungspfeilen, aber ohne Toilettensymbol.', en: 'A station corridor with several directional arrows but no bathroom symbol.' },
      songMood: 'practical wayfinding clarity',
      visualNotes: 'Clean transit corridor, branching signs, staff desk in view, practical low-stress urgency.',
    }),
  },
  {
    slug: 'spasibo-do-svidaniya-goodbye',
    title: { de: 'Danke und auf Wiedersehen', en: 'Thank you and goodbye' },
    situation: {
      de: 'Du verlässt die Rezeption nach der Auskunft und verabschiedest dich höflich von der Person am Schalter.',
      en: 'You leave the reception area after getting information and politely say goodbye to the staff member.',
    },
    pedagogicalGoal: 'Dank und formellen Abschied als natürliche Schlussformel verbinden.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Спасибо вам, до свидания.',
        baseText: { de: 'Danke Ihnen, auf Wiedersehen.', en: 'Thank you, goodbye.' },
      },
      meaning: { de: 'Ein warmer, formeller Abschluss für eine kurze hilfreiche Begegnung.', en: 'A warm, formal close to a brief helpful encounter.' },
      chunks: [
        { id: 'spasibo-do-svidaniya-goodbye-thanks', targetText: 'Спасибо вам,', baseText: { de: 'Danke Ihnen,', en: 'Thank you,' } },
        { id: 'spasibo-do-svidaniya-goodbye-farewell', targetText: 'до свидания.', baseText: { de: 'auf Wiedersehen.', en: 'goodbye.' } },
      ],
      lessonItems: [
        { id: 'spasibo-do-svidaniya-goodbye-item-thanks', targetText: 'спасибо', baseText: { de: 'danke', en: 'thank you' }, acceptedAnswers: ['спасибо'] },
        { id: 'spasibo-do-svidaniya-goodbye-item-goodbye', targetText: 'до свидания', baseText: { de: 'auf Wiedersehen', en: 'goodbye' }, acceptedAnswers: ['до свидания'] },
        { id: 'spasibo-do-svidaniya-goodbye-item-farewell', targetText: 'прощание', baseText: { de: 'Abschied', en: 'farewell' }, acceptedAnswers: ['прощание'] },
        { id: 'spasibo-do-svidaniya-goodbye-item-door', targetText: 'дверь', baseText: { de: 'Tür', en: 'door' }, acceptedAnswers: ['дверь'] },
      ],
      buildChips: ['Спасибо вам,', 'до свидания.', 'До завтра,', 'всего доброго.'],
      typeRecall: {
        before: 'Спасибо вам, до ', answer: 'свидания', after: '.',
        acceptedAnswers: russianAccepted('свидания'),
        fallbackChoices: ['свидания', 'вокзала', 'ужина', 'адреса'],
      },
      speakTarget: {
        baseCue: { de: 'Danke Ihnen, auf Wiedersehen.', en: 'Thank you, goodbye.' },
        targetPhrase: 'Спасибо вам, до свидания.',
        requiredTokens: ['Спасибо', 'вам', 'свидания'],
        optionalTokens: ['до'],
      },
      sceneCaption: {
        de: 'Die Eingangstür steht offen; hinter dir bleibt der ruhige Empfangstresen.',
        en: 'The entrance door is open, with the quiet reception desk remaining behind you.',
      },
      trophyWord: {
        word: 'спасибо', meaning: { de: 'danke', en: 'thank you' },
        example: 'Спасибо, приходите ещё.',
        whyThisWord: { de: 'Das häufigste Dankeswort beendet kleine Begegnungen freundlich und sicher.', en: 'The most common word of thanks closes small encounters warmly and safely.' },
      },
      placeholderCaption: { de: 'Offene Eingangstür, Empfangstheke und freundliche Abschiedsgeste.', en: 'An open entrance door, reception counter, and friendly farewell gesture.' },
      songMood: 'warm formal farewell',
      visualNotes: 'Reception doorway at late afternoon, subtle wave, staff remaining at the counter, gentle closure.',
    }),
  },
]

export const RUSSIAN_A1_PRACTICAL_1_LESSONS: GuidedLessonDefinition[] = makeRussianPracticalLessons(
  GUIDED_TODAY_PATH_RUSSIAN_ONE_METADATA,
  russianA1Practical1Inputs,
  { de: 'Du hast Russisch A1 Praxis 1 abgeschlossen.', en: 'You have completed Russian A1 Practical 1.' },
)

export const GUIDED_TODAY_PATH_RUSSIAN_TWO_METADATA: GuidedPathMetadata = {
  id: 'russian-a1-practical-2',
  title: 'Russian A1 Practical 2',
  shortTitle: 'A1 Practical 2',
  subtitle: { de: 'Kleine Hilfen und einfache Entscheidungen', en: 'Small help and simple choices' },
  level: 'A1',
  baseLanguage: 'German',
  targetLanguage: 'Russian',
  estimatedMinutes: 5,
}

const russianA1Practical2Inputs: RussianLessonInput[] = [
  {
    slug: 'vy-mozhete-pomoch-help',
    title: { de: 'Können Sie mir helfen?', en: 'Can you help me?' },
    situation: {
      de: 'Vor einem Fahrkartenautomaten kommst du nicht weiter und bittest eine Mitarbeiterin um Hilfe.',
      en: 'You are stuck at a ticket machine and ask a staff member for help.',
    },
    pedagogicalGoal: 'Mit einer höflichen Können-Sie-Frage direkt um praktische Hilfe bitten.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Вы можете мне помочь?',
        baseText: { de: 'Können Sie mir helfen?', en: 'Can you help me?' },
      },
      meaning: { de: 'Eine vielseitige höfliche Bitte, wenn du allein nicht weiterkommst.', en: 'A versatile polite request when you cannot proceed on your own.' },
      chunks: [
        { id: 'vy-mozhete-pomoch-help-can', targetText: 'Вы можете', baseText: { de: 'Können Sie', en: 'Can you' } },
        { id: 'vy-mozhete-pomoch-help-assist', targetText: 'мне помочь?', baseText: { de: 'mir helfen?', en: 'help me?' } },
      ],
      lessonItems: [
        { id: 'vy-mozhete-pomoch-help-item-can', targetText: 'мочь', baseText: { de: 'können', en: 'can / to be able' }, acceptedAnswers: ['мочь'] },
        { id: 'vy-mozhete-pomoch-help-item-help', targetText: 'помочь', baseText: { de: 'helfen', en: 'to help' }, acceptedAnswers: ['помочь'] },
        { id: 'vy-mozhete-pomoch-help-item-machine', targetText: 'автомат', baseText: { de: 'Automat', en: 'machine' }, acceptedAnswers: ['автомат'] },
        { id: 'vy-mozhete-pomoch-help-item-ticket', targetText: 'билет', baseText: { de: 'Fahrkarte', en: 'ticket' }, acceptedAnswers: ['билет'] },
      ],
      buildChips: ['Вы можете', 'мне помочь?', 'Вы знаете', 'этот автомат?'],
      typeRecall: {
        before: 'Вы можете мне ', answer: 'помочь', after: '?',
        acceptedAnswers: russianAccepted('помочь'),
        fallbackChoices: ['помочь', 'позвонить', 'показать', 'подождать'],
      },
      speakTarget: {
        baseCue: { de: 'Können Sie mir helfen?', en: 'Can you help me?' },
        targetPhrase: 'Вы можете мне помочь?',
        requiredTokens: ['Вы', 'можете', 'помочь'],
        optionalTokens: ['мне'],
      },
      sceneCaption: {
        de: 'Der Fahrkartenautomat zeigt mehrere unbekannte Optionen; eine Mitarbeiterin steht in erreichbarer Nähe.',
        en: 'The ticket machine shows several unfamiliar options, and a staff member stands within reach.',
      },
      trophyWord: {
        word: 'помочь', meaning: { de: 'helfen', en: 'to help' },
        example: 'Вы можете помочь с билетом?',
        whyThisWord: { de: 'Der Infinitiv macht aus einer höflichen Fähigkeitsfrage eine konkrete Bitte um Unterstützung.', en: 'The infinitive turns a polite ability question into a concrete request for assistance.' },
      },
      placeholderCaption: { de: 'Fahrkartenautomat mit offenem Menü und Mitarbeiterin am Bahnsteigzugang.', en: 'A ticket machine with an open menu and a staff member near the platform entrance.' },
      songMood: 'hopeful practical assistance',
      visualNotes: 'Station ticket machine, confusing menu tiles, staff member approaching with an open helpful gesture.',
    }),
  },
  {
    slug: 'zapishite-eto-write',
    title: { de: 'Bitte schreiben Sie das auf', en: 'Please write that down' },
    situation: {
      de: 'An der Hotelrezeption hörst du einen Straßennamen, kannst ihn aber nicht sicher notieren.',
      en: 'At a hotel reception desk, you hear a street name but cannot write it down confidently.',
    },
    pedagogicalGoal: 'Mit einem höflichen Imperativ um eine schriftliche Notiz bitten.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Запишите это, пожалуйста.',
        baseText: { de: 'Schreiben Sie das bitte auf.', en: 'Please write that down.' },
      },
      meaning: { de: 'Eine praktische Bitte, wenn Hören allein nicht zuverlässig genug ist.', en: 'A practical request when hearing alone is not reliable enough.' },
      chunks: [
        { id: 'zapishite-eto-write-action', targetText: 'Запишите это,', baseText: { de: 'Schreiben Sie das auf,', en: 'Write that down,' } },
        { id: 'zapishite-eto-write-please', targetText: 'пожалуйста.', baseText: { de: 'bitte.', en: 'please.' } },
      ],
      lessonItems: [
        { id: 'zapishite-eto-write-item-write', targetText: 'записать', baseText: { de: 'aufschreiben', en: 'to write down' }, acceptedAnswers: ['записать'] },
        { id: 'zapishite-eto-write-item-address', targetText: 'адрес', baseText: { de: 'Adresse', en: 'address' }, acceptedAnswers: ['адрес'] },
        { id: 'zapishite-eto-write-item-paper', targetText: 'бумага', baseText: { de: 'Papier', en: 'paper' }, acceptedAnswers: ['бумага'] },
        { id: 'zapishite-eto-write-item-pen', targetText: 'ручка', baseText: { de: 'Stift', en: 'pen' }, acceptedAnswers: ['ручка'] },
      ],
      buildChips: ['Запишите это,', 'пожалуйста.', 'Покажите адрес,', 'на экране.'],
      typeRecall: {
        before: '', answer: 'Запишите', after: ' это, пожалуйста.',
        acceptedAnswers: russianAccepted('Запишите'),
        fallbackChoices: ['Запишите', 'Покажите', 'Скажите', 'Повторите'],
      },
      speakTarget: {
        baseCue: { de: 'Schreiben Sie das bitte auf.', en: 'Please write that down.' },
        targetPhrase: 'Запишите это, пожалуйста.',
        requiredTokens: ['Запишите', 'это', 'пожалуйста'],
        optionalTokens: [],
      },
      sceneCaption: {
        de: 'Auf dem Empfangstresen liegen ein leerer Notizzettel und ein Stift neben deinem Handy.',
        en: 'A blank note and pen lie on the reception counter beside your phone.',
      },
      trophyWord: {
        word: 'записать', meaning: { de: 'aufschreiben', en: 'to write down' },
        example: 'Запишите адрес, пожалуйста.',
        whyThisWord: { de: 'Das Verb verwandelt schwer verständliche Namen oder Zahlen in eine sichtbare Notiz.', en: 'This verb turns hard-to-hear names or numbers into a visible note.' },
      },
      placeholderCaption: { de: 'Leerer Notizzettel, blauer Stift und geöffnetes Handy auf einer Rezeption.', en: 'A blank note, blue pen, and open phone on a reception desk.' },
      songMood: 'clear written reassurance',
      visualNotes: 'Reception desktop close-up, blank paper centered, pen offered across the counter, crisp daylight.',
    }),
  },
  {
    slug: 'pokazhite-na-karte-map',
    title: { de: 'Auf der Karte zeigen', en: 'Show me on the map' },
    situation: {
      de: 'In einer Metrostation öffnest du den Stadtplan auf deinem Handy und bittest um einen sichtbaren Hinweis.',
      en: 'In a metro station, you open the city map on your phone and ask for a visual pointer.',
    },
    pedagogicalGoal: 'Eine höfliche Zeigebitte mit dem festen Ortsblock für die Karte verbinden.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Покажите это на карте.',
        baseText: { de: 'Zeigen Sie das auf der Karte.', en: 'Show me that on the map.' },
      },
      meaning: { de: 'Eine gezielte Bitte, wenn eine Route visuell leichter zu verstehen ist.', en: 'A focused request when a route is easier to understand visually.' },
      chunks: [
        { id: 'pokazhite-na-karte-map-show', targetText: 'Покажите это', baseText: { de: 'Zeigen Sie das', en: 'Show me that' } },
        { id: 'pokazhite-na-karte-map-location', targetText: 'на карте.', baseText: { de: 'auf der Karte.', en: 'on the map.' } },
      ],
      lessonItems: [
        { id: 'pokazhite-na-karte-map-item-show', targetText: 'показать', baseText: { de: 'zeigen', en: 'to show' }, acceptedAnswers: ['показать'] },
        { id: 'pokazhite-na-karte-map-item-map', targetText: 'карта', baseText: { de: 'Karte / Stadtplan', en: 'map' }, acceptedAnswers: ['карта'] },
        { id: 'pokazhite-na-karte-map-item-route', targetText: 'маршрут', baseText: { de: 'Route', en: 'route' }, acceptedAnswers: ['маршрут'] },
        { id: 'pokazhite-na-karte-map-item-screen', targetText: 'экран', baseText: { de: 'Bildschirm', en: 'screen' }, acceptedAnswers: ['экран'] },
      ],
      buildChips: ['Покажите это', 'на карте.', 'Отметьте вход', 'на билете.'],
      typeRecall: {
        before: 'Покажите это на ', answer: 'карте', after: '.',
        acceptedAnswers: russianAccepted('карте'),
        fallbackChoices: ['карте', 'билете', 'столе', 'пакете'],
      },
      speakTarget: {
        baseCue: { de: 'Zeigen Sie das auf der Karte.', en: 'Show me that on the map.' },
        targetPhrase: 'Покажите это на карте.',
        requiredTokens: ['Покажите', 'это', 'карте'],
        optionalTokens: ['на'],
      },
      sceneCaption: {
        de: 'Auf deinem Handy ist eine dichte Straßenkarte geöffnet; der Zielpunkt ist noch nicht markiert.',
        en: 'A dense street map is open on your phone, and the destination is not marked yet.',
      },
      trophyWord: {
        word: 'карта', meaning: { de: 'Karte', en: 'map' },
        example: 'Карта есть на стойке.',
        whyThisWord: { de: 'Das Nomen ist für Wege nützlich und bezeichnet je nach Kontext auch eine Zahlungskarte.', en: 'The noun is useful for directions and can also mean a payment card depending on context.' },
      },
      placeholderCaption: { de: 'Handy mit dichtem Stadtplan und noch unmarkiertem Zielpunkt.', en: 'A phone with a dense city map and an unmarked destination point.' },
      songMood: 'focused route discovery',
      visualNotes: 'Metro concourse, phone map centered between two people, finger hovering before the route is shown.',
    }),
  },
  {
    slug: 'kakoy-variant-luchshe-choice',
    title: { de: 'Welche Variante ist besser?', en: 'Which option is better?' },
    situation: {
      de: 'Im Café stehen zwei ähnliche Getränke auf der Karte; du bittest die Bedienung um eine einfache Empfehlung.',
      en: 'At a cafe, two similar drinks are listed, and you ask the staff member for a simple recommendation.',
    },
    pedagogicalGoal: 'Mit Fragewort, Auswahlwort und Vergleichsadverb eine kurze Empfehlung erfragen.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Какой вариант лучше?',
        baseText: { de: 'Welche Variante ist besser?', en: 'Which option is better?' },
      },
      meaning: { de: 'Eine einfache Auswahlfrage zwischen sichtbaren Möglichkeiten.', en: 'A simple choice question between visible options.' },
      chunks: [
        { id: 'kakoy-variant-luchshe-choice-option', targetText: 'Какой вариант', baseText: { de: 'Welche Variante', en: 'Which option' } },
        { id: 'kakoy-variant-luchshe-choice-better', targetText: 'лучше?', baseText: { de: 'ist besser?', en: 'is better?' } },
      ],
      lessonItems: [
        { id: 'kakoy-variant-luchshe-choice-item-option', targetText: 'вариант', baseText: { de: 'Variante / Option', en: 'option' }, acceptedAnswers: ['вариант'] },
        { id: 'kakoy-variant-luchshe-choice-item-better', targetText: 'лучше', baseText: { de: 'besser', en: 'better' }, acceptedAnswers: ['лучше'] },
        { id: 'kakoy-variant-luchshe-choice-item-choice', targetText: 'выбор', baseText: { de: 'Auswahl', en: 'choice' }, acceptedAnswers: ['выбор'] },
        { id: 'kakoy-variant-luchshe-choice-item-advice', targetText: 'совет', baseText: { de: 'Rat / Empfehlung', en: 'advice' }, acceptedAnswers: ['совет'] },
      ],
      buildChips: ['Какой вариант', 'лучше?', 'Какой напиток', 'дешевле?'],
      typeRecall: {
        before: 'Какой ', answer: 'вариант', after: ' лучше?',
        acceptedAnswers: russianAccepted('вариант'),
        fallbackChoices: ['вариант', 'напиток', 'размер', 'маршрут'],
      },
      speakTarget: {
        baseCue: { de: 'Welche Variante ist besser?', en: 'Which option is better?' },
        targetPhrase: 'Какой вариант лучше?',
        requiredTokens: ['Какой', 'вариант', 'лучше'],
        optionalTokens: [],
      },
      sceneCaption: {
        de: 'Auf der Getränkekarte sind zwei ähnliche Becher abgebildet; beide Preise sind gut sichtbar.',
        en: 'Two similar cups appear on the drinks menu, with both prices clearly visible.',
      },
      trophyWord: {
        word: 'вариант', meaning: { de: 'Variante / Option', en: 'option' },
        example: 'Этот вариант вам подходит?',
        whyThisWord: { de: 'Das Nomen ist eine neutrale Wahlhilfe für Speisen, Größen, Wege und Termine.', en: 'This noun is a neutral choice tool for foods, sizes, routes, and times.' },
      },
      placeholderCaption: { de: 'Café-Menü mit zwei ähnlichen Getränken und klaren Preisen.', en: 'A cafe menu with two similar drinks and clear prices.' },
      songMood: 'lighthearted simple decision',
      visualNotes: 'Modern cafe menu board, two comparable drinks side by side, clean visual balance and friendly staff.',
    }),
  },
  {
    slug: 'eshchyo-pirozhki-more',
    title: { de: 'Noch mehr Piroschki?', en: 'Any more pastries?' },
    situation: {
      de: 'In einer Bäckerei liegt nur noch ein Piroschok in der Auslage; du fragst, ob es weitere gibt.',
      en: 'At a bakery, only one pirozhok remains in the display, and you ask whether there are more.',
    },
    pedagogicalGoal: 'Mit einer Haben-Sie-Frage nach zusätzlicher konkreter Ware fragen.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'У вас есть ещё пирожки?',
        baseText: { de: 'Haben Sie noch Piroschki?', en: 'Do you have any more pirozhki?' },
      },
      meaning: { de: 'Eine natürliche Nachfrage, wenn die sichtbare Auswahl fast aufgebraucht ist.', en: 'A natural follow-up when the visible selection is almost gone.' },
      chunks: [
        { id: 'eshchyo-pirozhki-more-have', targetText: 'У вас есть', baseText: { de: 'Haben Sie', en: 'Do you have' } },
        { id: 'eshchyo-pirozhki-more-pastries', targetText: 'ещё пирожки?', baseText: { de: 'noch Piroschki?', en: 'any more pirozhki?' } },
      ],
      lessonItems: [
        { id: 'eshchyo-pirozhki-more-item-pastry', targetText: 'пирожок', baseText: { de: 'gefülltes Gebäck', en: 'filled pastry' }, acceptedAnswers: ['пирожок'] },
        { id: 'eshchyo-pirozhki-more-item-more', targetText: 'ещё', baseText: { de: 'noch / mehr', en: 'more / still' }, acceptedAnswers: russianAccepted('ещё') },
        { id: 'eshchyo-pirozhki-more-item-baking', targetText: 'выпечка', baseText: { de: 'Backwaren', en: 'baked goods' }, acceptedAnswers: ['выпечка'] },
        { id: 'eshchyo-pirozhki-more-item-display', targetText: 'витрина', baseText: { de: 'Auslage / Vitrine', en: 'display case' }, acceptedAnswers: ['витрина'] },
      ],
      buildChips: ['У вас есть', 'ещё пирожки?', 'Сегодня есть', 'свежий хлеб?'],
      typeRecall: {
        before: 'У вас есть ещё ', answer: 'пирожки', after: '?',
        acceptedAnswers: russianAccepted('пирожки'),
        fallbackChoices: ['пирожки', 'булочки', 'салаты', 'напитки'],
      },
      speakTarget: {
        baseCue: { de: 'Haben Sie noch Piroschki?', en: 'Do you have any more pirozhki?' },
        targetPhrase: 'У вас есть ещё пирожки?',
        requiredTokens: ['есть', 'ещё', 'пирожки'],
        optionalTokens: ['У', 'вас'],
      },
      sceneCaption: {
        de: 'In der warmen Vitrine liegt ein einziges gefülltes Gebäck neben einem leeren Blech.',
        en: 'One filled pastry sits in the warm display beside an empty tray.',
      },
      trophyWord: {
        word: 'пирожок', meaning: { de: 'gefülltes Gebäck', en: 'filled pastry' },
        example: 'Пирожок с капустой, пожалуйста.',
        whyThisWord: { de: 'Dieses häufige Gebäckwort hilft in Bäckereien, Cafés und kleinen Imbissen.', en: 'This common pastry word helps in bakeries, cafes, and small snack counters.' },
      },
      placeholderCaption: { de: 'Warme Bäckereivitrine mit einem letzten Piroschki und leerem Blech.', en: 'A warm bakery display with one last pirozhok and an empty tray.' },
      songMood: 'cozy bakery curiosity',
      visualNotes: 'Neighborhood bakery, last filled pastry under warm lights, empty tray suggesting more may be coming.',
    }),
  },
  {
    slug: 'kartoy-mozhno-oplatit-card',
    title: { de: 'Mit Karte zahlen', en: 'Pay by card' },
    situation: {
      de: 'An einer kleinen Café-Kasse siehst du kein eindeutiges Kartensymbol und fragst nach Kartenzahlung.',
      en: 'At a small cafe register, you see no clear card symbol and ask whether card payment is possible.',
    },
    pedagogicalGoal: 'Die Zahlungsart als festen Instrumentalblock mit einer Möglichkeitsfrage verwenden.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Картой можно оплатить?',
        baseText: { de: 'Kann man mit Karte bezahlen?', en: 'Can I pay by card?' },
      },
      meaning: { de: 'Eine kompakte und natürliche Frage vor dem Bezahlen.', en: 'A compact, natural question before paying.' },
      chunks: [
        { id: 'kartoy-mozhno-oplatit-card-method', targetText: 'Картой можно', baseText: { de: 'Kann man mit Karte', en: 'Can I use a card' } },
        { id: 'kartoy-mozhno-oplatit-card-pay', targetText: 'оплатить?', baseText: { de: 'bezahlen?', en: 'to pay?' } },
      ],
      lessonItems: [
        { id: 'kartoy-mozhno-oplatit-card-item-card', targetText: 'карта', baseText: { de: 'Karte', en: 'card' }, acceptedAnswers: ['карта'] },
        { id: 'kartoy-mozhno-oplatit-card-item-pay', targetText: 'оплатить', baseText: { de: 'bezahlen', en: 'to pay' }, acceptedAnswers: ['оплатить'] },
        { id: 'kartoy-mozhno-oplatit-card-item-terminal', targetText: 'терминал', baseText: { de: 'Kartenterminal', en: 'payment terminal' }, acceptedAnswers: ['терминал'] },
        { id: 'kartoy-mozhno-oplatit-card-item-cash', targetText: 'наличные', baseText: { de: 'Bargeld', en: 'cash' }, acceptedAnswers: ['наличные'] },
      ],
      buildChips: ['Картой можно', 'оплатить?', 'Наличными можно', 'терминал?'],
      typeRecall: {
        before: 'Картой можно ', answer: 'оплатить', after: '?',
        acceptedAnswers: russianAccepted('оплатить'),
        fallbackChoices: ['оплатить', 'заказать', 'проверить', 'получить'],
      },
      speakTarget: {
        baseCue: { de: 'Kann man mit Karte bezahlen?', en: 'Can I pay by card?' },
        targetPhrase: 'Картой можно оплатить?',
        requiredTokens: ['Картой', 'можно', 'оплатить'],
        optionalTokens: [],
      },
      sceneCaption: {
        de: 'Neben der Kasse steht ein kleines Terminal ohne sichtbaren Hinweis; deine Bankkarte ist bereit.',
        en: 'A small terminal sits beside the register without a visible sign, and your bank card is ready.',
      },
      trophyWord: {
        word: 'оплатить', meaning: { de: 'bezahlen', en: 'to pay' },
        example: 'Можно оплатить картой?',
        whyThisWord: { de: 'Das Verb ist an Kassen besonders nützlich, wenn du die Zahlungsart klären möchtest.', en: 'This verb is especially useful at registers when you need to clarify the payment method.' },
      },
      placeholderCaption: { de: 'Kleine Café-Kasse mit unbeschriftetem Terminal und bereitgehaltener Bankkarte.', en: 'A small cafe register with an unlabeled terminal and a bank card held ready.' },
      songMood: 'smooth modern checkout',
      visualNotes: 'Compact cafe till, contactless terminal, bank card in hand, confident but questioning posture.',
    }),
  },
  {
    slug: 'paket-chek-please',
    title: { de: 'Tüte und Beleg, bitte', en: 'A bag and receipt, please' },
    situation: {
      de: 'Nach einem kleinen Einkauf liegen deine Waren noch lose an der Kasse; du brauchst eine Tüte und den Beleg.',
      en: 'After a small purchase, your items are still loose at the register, and you need a bag and the receipt.',
    },
    pedagogicalGoal: 'Zwei konkrete Dinge in einer kompakten höflichen Bitte verbinden.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Пакет и чек, пожалуйста.',
        baseText: { de: 'Eine Tüte und den Beleg, bitte.', en: 'A bag and the receipt, please.' },
      },
      meaning: { de: 'Eine knappe Bitte für die letzten Dinge beim Bezahlen.', en: 'A concise request for the last things needed at checkout.' },
      chunks: [
        { id: 'paket-chek-please-items', targetText: 'Пакет и чек,', baseText: { de: 'Eine Tüte und den Beleg,', en: 'A bag and the receipt,' } },
        { id: 'paket-chek-please-politeness', targetText: 'пожалуйста.', baseText: { de: 'bitte.', en: 'please.' } },
      ],
      lessonItems: [
        { id: 'paket-chek-please-item-bag', targetText: 'пакет', baseText: { de: 'Tüte', en: 'bag' }, acceptedAnswers: ['пакет'] },
        { id: 'paket-chek-please-item-receipt', targetText: 'чек', baseText: { de: 'Kassenbeleg', en: 'receipt' }, acceptedAnswers: ['чек'] },
        { id: 'paket-chek-please-item-register', targetText: 'касса', baseText: { de: 'Kasse', en: 'register' }, acceptedAnswers: ['касса'] },
        { id: 'paket-chek-please-item-purchase', targetText: 'покупка', baseText: { de: 'Einkauf', en: 'purchase' }, acceptedAnswers: ['покупка'] },
      ],
      buildChips: ['Пакет и чек,', 'пожалуйста.', 'Салфетку и ложку,', 'не нужно.'],
      typeRecall: {
        before: 'Пакет и ', answer: 'чек', after: ', пожалуйста.',
        acceptedAnswers: russianAccepted('чек'),
        fallbackChoices: ['чек', 'салфетку', 'ложку', 'крышку'],
      },
      speakTarget: {
        baseCue: { de: 'Eine Tüte und den Beleg, bitte.', en: 'A bag and the receipt, please.' },
        targetPhrase: 'Пакет и чек, пожалуйста.',
        requiredTokens: ['Пакет', 'чек', 'пожалуйста'],
        optionalTokens: ['и'],
      },
      sceneCaption: {
        de: 'Zwei kleine Einkäufe liegen neben dem Drucker; die Tüten hängen noch hinter der Kasse.',
        en: 'Two small purchases sit beside the receipt printer, while the bags still hang behind the register.',
      },
      trophyWord: {
        word: 'чек', meaning: { de: 'Kassenbeleg', en: 'receipt' },
        example: 'Ваш чек в пакете.',
        whyThisWord: { de: 'Das kurze Nomen hilft beim Bezahlen, Umtauschen und Prüfen eines Einkaufs.', en: 'This short noun helps with payment, returns, and checking a purchase.' },
      },
      placeholderCaption: { de: 'Kassentresen mit zwei Einkäufen, Belegdrucker und hängenden Tüten.', en: 'A checkout counter with two purchases, a receipt printer, and hanging bags.' },
      songMood: 'tidy checkout finish',
      visualNotes: 'Small grocery counter, receipt printer active, loose items waiting, paper and reusable bags behind staff.',
    }),
  },
  {
    slug: 'u-menya-bron-reservation',
    title: { de: 'Ich habe eine Reservierung', en: 'I have a reservation' },
    situation: {
      de: 'Am Eingang eines Restaurants meldest du dich für einen bereits reservierten Tisch an.',
      en: 'At a restaurant entrance, you check in for a table that is already reserved.',
    },
    pedagogicalGoal: 'Eine vorhandene Reservierung mit einer neutralen Haben-Konstruktion nennen.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'У меня есть бронь.',
        baseText: { de: 'Ich habe eine Reservierung.', en: 'I have a reservation.' },
      },
      meaning: { de: 'Ein ruhiger erster Satz beim Ankommen in Restaurant oder Hotel.', en: 'A calm opening sentence when arriving at a restaurant or hotel.' },
      chunks: [
        { id: 'u-menya-bron-reservation-have', targetText: 'У меня есть', baseText: { de: 'Ich habe', en: 'I have' } },
        { id: 'u-menya-bron-reservation-booking', targetText: 'бронь.', baseText: { de: 'eine Reservierung.', en: 'a reservation.' } },
      ],
      lessonItems: [
        { id: 'u-menya-bron-reservation-item-booking', targetText: 'бронь', baseText: { de: 'Reservierung', en: 'reservation' }, acceptedAnswers: ['бронь'] },
        { id: 'u-menya-bron-reservation-item-table', targetText: 'столик', baseText: { de: 'kleiner Tisch', en: 'table' }, acceptedAnswers: ['столик'] },
        { id: 'u-menya-bron-reservation-item-restaurant', targetText: 'ресторан', baseText: { de: 'Restaurant', en: 'restaurant' }, acceptedAnswers: ['ресторан'] },
        { id: 'u-menya-bron-reservation-item-list', targetText: 'список', baseText: { de: 'Liste', en: 'list' }, acceptedAnswers: ['список'] },
      ],
      buildChips: ['У меня есть', 'бронь.', 'Мне нужен', 'свободный столик.'],
      typeRecall: {
        before: 'У меня есть ', answer: 'бронь', after: '.',
        acceptedAnswers: russianAccepted('бронь'),
        fallbackChoices: ['бронь', 'билет', 'номер', 'паспорт'],
      },
      speakTarget: {
        baseCue: { de: 'Ich habe eine Reservierung.', en: 'I have a reservation.' },
        targetPhrase: 'У меня есть бронь.',
        requiredTokens: ['меня', 'есть', 'бронь'],
        optionalTokens: ['У'],
      },
      sceneCaption: {
        de: 'Am kleinen Empfangspult liegt eine Namensliste; dahinter wartet ein gedeckter Tisch.',
        en: 'A name list lies on the small host stand, with a set table waiting beyond it.',
      },
      trophyWord: {
        word: 'бронь', meaning: { de: 'Reservierung', en: 'reservation' },
        example: 'Ваша бронь уже в списке.',
        whyThisWord: { de: 'Das alltagstaugliche Nomen bringt dich im Restaurant oder Hotel schnell zum richtigen Eintrag.', en: 'This everyday noun gets you to the correct entry quickly in a restaurant or hotel.' },
      },
      placeholderCaption: { de: 'Restaurantpult mit Namensliste und gedecktem Tisch im Hintergrund.', en: 'A restaurant host stand with a name list and a set table in the background.' },
      songMood: 'welcoming booked arrival',
      visualNotes: 'Neighborhood restaurant entrance, simple reservation ledger, table set but no person seated, calm welcome.',
    }),
  },
  {
    slug: 'skazhite-adres-pravilnyy-correct',
    title: { de: 'Ist die Adresse richtig?', en: 'Is the address correct?' },
    situation: {
      de: 'Vor einer Taxifahrt zeigst du die Adresse auf deinem Handy und möchtest sie kurz bestätigen lassen.',
      en: 'Before a taxi ride, you show the address on your phone and want to confirm it briefly.',
    },
    pedagogicalGoal: 'Eine konkrete Information mit einem höflichen Auftakt überprüfen.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Скажите, это правильный адрес?',
        baseText: { de: 'Können Sie mir sagen, ob das die richtige Adresse ist?', en: 'Could you tell me whether this is the correct address?' },
      },
      meaning: { de: 'Eine kurze Sicherheitsfrage, bevor eine Fahrt oder Lieferung beginnt.', en: 'A short safety check before a ride or delivery begins.' },
      chunks: [
        { id: 'skazhite-adres-pravilnyy-correct-opener', targetText: 'Скажите,', baseText: { de: 'Sagen Sie,', en: 'Could you tell me,' } },
        { id: 'skazhite-adres-pravilnyy-correct-address', targetText: 'это правильный адрес?', baseText: { de: 'ist das die richtige Adresse?', en: 'is this the correct address?' } },
      ],
      lessonItems: [
        { id: 'skazhite-adres-pravilnyy-correct-item-address', targetText: 'адрес', baseText: { de: 'Adresse', en: 'address' }, acceptedAnswers: ['адрес'] },
        { id: 'skazhite-adres-pravilnyy-correct-item-correct', targetText: 'правильный', baseText: { de: 'richtig', en: 'correct' }, acceptedAnswers: ['правильный'] },
        { id: 'skazhite-adres-pravilnyy-correct-item-check', targetText: 'проверить', baseText: { de: 'prüfen', en: 'to check' }, acceptedAnswers: ['проверить'] },
        { id: 'skazhite-adres-pravilnyy-correct-item-street', targetText: 'улица', baseText: { de: 'Straße', en: 'street' }, acceptedAnswers: ['улица'] },
      ],
      buildChips: ['Скажите,', 'это правильный адрес?', 'это правильный номер?', 'Покажите дорогу.'],
      typeRecall: {
        before: 'Скажите, это ', answer: 'правильный', after: ' адрес?',
        acceptedAnswers: russianAccepted('правильный'),
        fallbackChoices: ['правильный', 'новый', 'старый', 'домашний'],
      },
      speakTarget: {
        baseCue: { de: 'Können Sie mir sagen, ob das die richtige Adresse ist?', en: 'Could you tell me whether this is the correct address?' },
        targetPhrase: 'Скажите, это правильный адрес?',
        requiredTokens: ['Скажите', 'адрес', 'правильный'],
        optionalTokens: ['это'],
      },
      sceneCaption: {
        de: 'Auf deinem Handy stehen Straße und Hausnummer; der Fahrer blickt vom Display zu dir.',
        en: 'The street and building number are visible on your phone as the driver looks from the screen to you.',
      },
      trophyWord: {
        word: 'адрес', meaning: { de: 'Adresse', en: 'address' },
        example: 'Запишите ваш адрес, пожалуйста.',
        whyThisWord: { de: 'Das Nomen ist bei Fahrten, Reservierungen und Lieferungen eine zentrale Kontrollinformation.', en: 'This noun is a central piece of checking information for rides, bookings, and deliveries.' },
      },
      placeholderCaption: { de: 'Handydisplay mit Straße und Hausnummer neben einem Taxi-Dashboard.', en: 'A phone showing a street and building number beside a taxi dashboard.' },
      songMood: 'careful travel confirmation',
      visualNotes: 'Taxi interior before departure, phone address in focus, driver waiting for confirmation, neutral city outside.',
    }),
  },
  {
    slug: 'odnu-minutu-moment',
    title: { de: 'Einen Moment, bitte', en: 'One moment, please' },
    situation: {
      de: 'An der Kasse suchst du noch nach deiner Bankkarte und bittest kurz um Geduld.',
      en: 'At the register, you are still looking for your bank card and ask for a brief pause.',
    },
    pedagogicalGoal: 'Eine feste höfliche Zeitphrase für eine sehr kurze Verzögerung verwenden.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Одну минуту, пожалуйста.',
        baseText: { de: 'Eine Minute, bitte.', en: 'One moment, please.' },
      },
      meaning: { de: 'Eine höfliche Bitte um einen kurzen Aufschub im Alltag.', en: 'A polite request for a short delay in an everyday situation.' },
      chunks: [
        { id: 'odnu-minutu-moment-time', targetText: 'Одну минуту,', baseText: { de: 'Eine Minute,', en: 'One moment,' } },
        { id: 'odnu-minutu-moment-please', targetText: 'пожалуйста.', baseText: { de: 'bitte.', en: 'please.' } },
      ],
      lessonItems: [
        { id: 'odnu-minutu-moment-item-minute', targetText: 'минута', baseText: { de: 'Minute', en: 'minute' }, acceptedAnswers: ['минута'] },
        { id: 'odnu-minutu-moment-item-wait', targetText: 'подождать', baseText: { de: 'warten', en: 'to wait' }, acceptedAnswers: ['подождать'] },
        { id: 'odnu-minutu-moment-item-wallet', targetText: 'кошелёк', baseText: { de: 'Geldbörse', en: 'wallet' }, acceptedAnswers: russianAccepted('кошелёк') },
        { id: 'odnu-minutu-moment-item-time', targetText: 'время', baseText: { de: 'Zeit', en: 'time' }, acceptedAnswers: ['время'] },
      ],
      buildChips: ['Одну минуту,', 'пожалуйста.', 'Секунду,', 'я ищу карту.'],
      typeRecall: {
        before: 'Одну ', answer: 'минуту', after: ', пожалуйста.',
        acceptedAnswers: russianAccepted('минуту'),
        fallbackChoices: ['минуту', 'кассу', 'остановку', 'бутылку'],
      },
      speakTarget: {
        baseCue: { de: 'Eine Minute, bitte.', en: 'One moment, please.' },
        targetPhrase: 'Одну минуту, пожалуйста.',
        requiredTokens: ['Одну', 'минуту', 'пожалуйста'],
        optionalTokens: [],
      },
      sceneCaption: {
        de: 'Deine offene Tasche liegt am Kassentresen; die Karte ist zwischen mehreren Fächern noch nicht zu sehen.',
        en: 'Your open bag rests on the counter, and the card is not yet visible among its compartments.',
      },
      trophyWord: {
        word: 'минута', meaning: { de: 'Minute', en: 'minute' },
        example: 'У вас есть минута?',
        whyThisWord: { de: 'Das Zeitwort hält kleine Verzögerungen freundlich und konkret.', en: 'This time word keeps small delays friendly and concrete.' },
      },
      placeholderCaption: { de: 'Offene Tasche mit Geldbörse und mehreren Kartenfächern an der Kasse.', en: 'An open bag with a wallet and several card slots at the register.' },
      songMood: 'patient pocket search',
      visualNotes: 'Checkout counter, open wallet compartments, cashier waiting without pressure, gentle suspended beat.',
    }),
  },
]

export const RUSSIAN_A1_PRACTICAL_2_LESSONS: GuidedLessonDefinition[] = makeRussianPracticalLessons(
  GUIDED_TODAY_PATH_RUSSIAN_TWO_METADATA,
  russianA1Practical2Inputs,
  { de: 'Du hast Russisch A1 Praxis 2 abgeschlossen.', en: 'You have completed Russian A1 Practical 2.' },
)

export const GUIDED_TODAY_PATH_RUSSIAN_THREE_METADATA: GuidedPathMetadata = {
  id: 'russian-a1-practical-3',
  title: 'Russian A1 Practical 3',
  shortTitle: 'A1 Practical 3',
  subtitle: { de: 'Wege und einfache Fahrten', en: 'Directions and simple transit' },
  level: 'A1',
  baseLanguage: 'German',
  targetLanguage: 'Russian',
  estimatedMinutes: 5,
}

const russianA1Practical3Inputs: RussianLessonInput[] = [
  {
    slug: 'skazhite-napravo-nalevo-direction',
    title: { de: 'Rechts oder links?', en: 'Right or left?' },
    situation: {
      de: 'Am Ende eines Stationsgangs teilt sich der Weg; du fragst einen Mitarbeiter nach der richtigen Seite.',
      en: 'At the end of a station corridor, the route splits, and you ask a staff member which side to take.',
    },
    pedagogicalGoal: 'Zwei grundlegende Richtungsadverbien in einer höflich eingeleiteten Wahlfrage unterscheiden.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Скажите, направо или налево?',
        baseText: { de: 'Sagen Sie, nach rechts oder nach links?', en: 'Could you tell me, right or left?' },
      },
      meaning: { de: 'Eine schnelle Richtungsfrage an einer sichtbaren Abzweigung.', en: 'A quick direction question at a visible fork.' },
      chunks: [
        { id: 'skazhite-napravo-nalevo-direction-opener', targetText: 'Скажите,', baseText: { de: 'Sagen Sie,', en: 'Could you tell me,' } },
        { id: 'skazhite-napravo-nalevo-direction-choice', targetText: 'направо или налево?', baseText: { de: 'nach rechts oder nach links?', en: 'right or left?' } },
      ],
      lessonItems: [
        { id: 'skazhite-napravo-nalevo-direction-item-right', targetText: 'направо', baseText: { de: 'nach rechts', en: 'to the right' }, acceptedAnswers: ['направо'] },
        { id: 'skazhite-napravo-nalevo-direction-item-left', targetText: 'налево', baseText: { de: 'nach links', en: 'to the left' }, acceptedAnswers: ['налево'] },
        { id: 'skazhite-napravo-nalevo-direction-item-straight', targetText: 'прямо', baseText: { de: 'geradeaus', en: 'straight ahead' }, acceptedAnswers: ['прямо'] },
        { id: 'skazhite-napravo-nalevo-direction-item-turn', targetText: 'поворот', baseText: { de: 'Abzweigung / Kurve', en: 'turn' }, acceptedAnswers: ['поворот'] },
      ],
      buildChips: ['Скажите,', 'направо или налево?', 'идти прямо?', 'Выход рядом?'],
      typeRecall: {
        before: 'Скажите, ', answer: 'направо', after: ' или налево?',
        acceptedAnswers: russianAccepted('направо'),
        fallbackChoices: ['направо', 'прямо', 'назад', 'вверх'],
      },
      speakTarget: {
        baseCue: { de: 'Sagen Sie, nach rechts oder nach links?', en: 'Could you tell me, right or left?' },
        targetPhrase: 'Скажите, направо или налево?',
        requiredTokens: ['Скажите', 'направо', 'налево'],
        optionalTokens: ['или'],
      },
      sceneCaption: {
        de: 'Der Stationsgang teilt sich unter zwei Pfeilen; das Zielschild ist aus deiner Position verdeckt.',
        en: 'The station corridor splits beneath two arrows, and the destination sign is obscured from where you stand.',
      },
      trophyWord: {
        word: 'направо', meaning: { de: 'nach rechts', en: 'to the right' },
        example: 'Поверните направо, пожалуйста.',
        whyThisWord: { de: 'Das Richtungswort ist an Kreuzungen, in Bahnhöfen und in Gebäuden sofort einsetzbar.', en: 'This direction word works immediately at intersections, in stations, and inside buildings.' },
      },
      placeholderCaption: { de: 'Geteilter Stationsgang mit zwei großen Pfeilen und verdecktem Zielschild.', en: 'A split station corridor with two large arrows and an obscured destination sign.' },
      songMood: 'crisp directional choice',
      visualNotes: 'Underground passage fork, bold arrows, no readable destination answer, balanced left-right composition.',
    }),
  },
  {
    slug: 'skazhite-eto-daleko-far',
    title: { de: 'Ist es weit?', en: 'Is it far?' },
    situation: {
      de: 'Vor dem Bahnhof zeigt jemand auf eine Straße; du möchtest wissen, ob das Ziel weit entfernt ist.',
      en: 'Outside the station, someone points down a street, and you want to know whether the destination is far away.',
    },
    pedagogicalGoal: 'Mit einem prädikativen Adverb knapp nach Entfernung fragen.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Скажите, это далеко?',
        baseText: { de: 'Können Sie mir sagen, ob es weit ist?', en: 'Could you tell me if it is far?' },
      },
      meaning: { de: 'Eine kurze Entfernungsfrage, bevor du dich für den Weg entscheidest.', en: 'A short distance question before choosing how to travel.' },
      chunks: [
        { id: 'skazhite-eto-daleko-far-opener', targetText: 'Скажите,', baseText: { de: 'Sagen Sie,', en: 'Could you tell me,' } },
        { id: 'skazhite-eto-daleko-far-distance', targetText: 'это далеко?', baseText: { de: 'ist es weit?', en: 'is it far?' } },
      ],
      lessonItems: [
        { id: 'skazhite-eto-daleko-far-item-far', targetText: 'далеко', baseText: { de: 'weit', en: 'far' }, acceptedAnswers: ['далеко'] },
        { id: 'skazhite-eto-daleko-far-item-distance', targetText: 'расстояние', baseText: { de: 'Entfernung', en: 'distance' }, acceptedAnswers: ['расстояние'] },
        { id: 'skazhite-eto-daleko-far-item-walk', targetText: 'идти', baseText: { de: 'zu Fuß gehen', en: 'to walk / go' }, acceptedAnswers: ['идти'] },
        { id: 'skazhite-eto-daleko-far-item-kilometer', targetText: 'километр', baseText: { de: 'Kilometer', en: 'kilometer' }, acceptedAnswers: ['километр'] },
      ],
      buildChips: ['Скажите,', 'это далеко?', 'это рядом?', 'туда пешком?'],
      typeRecall: {
        before: 'Скажите, это ', answer: 'далеко', after: '?',
        acceptedAnswers: russianAccepted('далеко'),
        fallbackChoices: ['далеко', 'открыто', 'бесплатно', 'опасно'],
      },
      speakTarget: {
        baseCue: { de: 'Können Sie mir sagen, ob es weit ist?', en: 'Could you tell me if it is far?' },
        targetPhrase: 'Скажите, это далеко?',
        requiredTokens: ['Скажите', 'это', 'далеко'],
        optionalTokens: [],
      },
      sceneCaption: {
        de: 'Vom Bahnhofsvorplatz führt eine lange Straße aus dem Blickfeld; dein Gepäck steht neben dir.',
        en: 'A long street leads out of sight from the station square, with your luggage beside you.',
      },
      trophyWord: {
        word: 'далеко', meaning: { de: 'weit', en: 'far' },
        example: 'Скажите, до вокзала далеко?',
        whyThisWord: { de: 'Das Adverb hilft dir, zwischen Gehen, öffentlichem Verkehr und Taxi zu wählen.', en: 'This adverb helps you choose between walking, public transport, and a taxi.' },
      },
      placeholderCaption: { de: 'Lange Straße ab dem Bahnhofsvorplatz, Reisetasche im Vordergrund.', en: 'A long street from the station square with a travel bag in the foreground.' },
      songMood: 'open-road distance check',
      visualNotes: 'Neutral regional station exterior, street perspective fading ahead, compact luggage, uncertain scale.',
    }),
  },
  {
    slug: 'apteka-seychas-otkryta-open',
    title: { de: 'Ist die Apotheke geöffnet?', en: 'Is the pharmacy open?' },
    situation: {
      de: 'Vor einer Apotheke ist die Tür geschlossen, aber innen brennt Licht; du fragst, ob sie jetzt geöffnet ist.',
      en: 'Outside a pharmacy, the door is closed but the lights are on, so you ask whether it is open now.',
    },
    pedagogicalGoal: 'Eine Öffnungsfrage mit einem sichtbaren Ort und dem Zeitadverb für jetzt bilden.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Аптека сейчас открыта?',
        baseText: { de: 'Ist die Apotheke jetzt geöffnet?', en: 'Is the pharmacy open now?' },
      },
      meaning: { de: 'Eine direkte Statusfrage an der Tür oder bei einer Person in der Nähe.', en: 'A direct status question at the door or to someone nearby.' },
      chunks: [
        { id: 'apteka-seychas-otkryta-open-place', targetText: 'Аптека', baseText: { de: 'Die Apotheke', en: 'The pharmacy' } },
        { id: 'apteka-seychas-otkryta-open-status', targetText: 'сейчас открыта?', baseText: { de: 'ist jetzt geöffnet?', en: 'is open now?' } },
      ],
      lessonItems: [
        { id: 'apteka-seychas-otkryta-open-item-pharmacy', targetText: 'аптека', baseText: { de: 'Apotheke', en: 'pharmacy' }, acceptedAnswers: ['аптека'] },
        { id: 'apteka-seychas-otkryta-open-item-now', targetText: 'сейчас', baseText: { de: 'jetzt', en: 'now' }, acceptedAnswers: ['сейчас'] },
        { id: 'apteka-seychas-otkryta-open-item-open', targetText: 'открытый', baseText: { de: 'geöffnet / offen', en: 'open' }, acceptedAnswers: ['открытый'] },
        { id: 'apteka-seychas-otkryta-open-item-medicine', targetText: 'лекарство', baseText: { de: 'Medikament', en: 'medicine' }, acceptedAnswers: ['лекарство'] },
      ],
      buildChips: ['Аптека', 'сейчас открыта?', 'Кафе', 'уже закрыто?'],
      typeRecall: {
        before: 'Аптека сейчас ', answer: 'открыта', after: '?',
        acceptedAnswers: russianAccepted('открыта'),
        fallbackChoices: ['открыта', 'закрыта', 'занята', 'пуста'],
      },
      speakTarget: {
        baseCue: { de: 'Ist die Apotheke jetzt geöffnet?', en: 'Is the pharmacy open now?' },
        targetPhrase: 'Аптека сейчас открыта?',
        requiredTokens: ['Аптека', 'сейчас', 'открыта'],
        optionalTokens: [],
      },
      sceneCaption: {
        de: 'Das grüne Apothekenschild leuchtet, doch die geschlossene Glastür hat keinen klaren Zeitenhinweis.',
        en: 'The green pharmacy sign is lit, but the closed glass door has no clear hours notice.',
      },
      trophyWord: {
        word: 'аптека', meaning: { de: 'Apotheke', en: 'pharmacy' },
        example: 'Покажите, где аптека.',
        whyThisWord: { de: 'Dieses Ortswort ist für Medikamente und kleine gesundheitliche Bedürfnisse unterwegs zentral.', en: 'This place word is central for medicine and small health needs while traveling.' },
      },
      placeholderCaption: { de: 'Leuchtendes Apothekenschild über einer geschlossenen Glastür ohne klare Öffnungszeit.', en: 'A lit pharmacy sign above a closed glass door without clear opening hours.' },
      songMood: 'quiet evening uncertainty',
      visualNotes: 'Region-neutral pharmacy storefront, green cross glow, interior lights on, ambiguous closed door.',
    }),
  },
  {
    slug: 'kakaya-liniya-metro-line',
    title: { de: 'Welche Metrolinie?', en: 'Which metro line?' },
    situation: {
      de: 'Vor einem mehrfarbigen Metroplan möchtest du wissen, welche Linie zu deinem Ziel führt.',
      en: 'In front of a multicolored metro map, you want to know which line goes toward your destination.',
    },
    pedagogicalGoal: 'Nach einer konkreten Verkehrslinie fragen, ohne Liniennummern oder Fälle zu analysieren.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Какая линия метро идёт туда?',
        baseText: { de: 'Welche Metrolinie fährt dorthin?', en: 'Which metro line goes there?' },
      },
      meaning: { de: 'Eine praktische Linienfrage vor dem Betreten des Bahnsteigs.', en: 'A practical line question before entering the platform area.' },
      chunks: [
        { id: 'kakaya-liniya-metro-line-route', targetText: 'Какая линия метро', baseText: { de: 'Welche Metrolinie', en: 'Which metro line' } },
        { id: 'kakaya-liniya-metro-line-destination', targetText: 'идёт туда?', baseText: { de: 'fährt dorthin?', en: 'goes there?' } },
      ],
      lessonItems: [
        { id: 'kakaya-liniya-metro-line-item-line', targetText: 'линия', baseText: { de: 'Linie', en: 'line' }, acceptedAnswers: ['линия'] },
        { id: 'kakaya-liniya-metro-line-item-metro', targetText: 'метро', baseText: { de: 'Metro / U-Bahn', en: 'metro / subway' }, acceptedAnswers: ['метро'] },
        { id: 'kakaya-liniya-metro-line-item-go', targetText: 'идти', baseText: { de: 'gehen / führen', en: 'to go / lead' }, acceptedAnswers: ['идти'] },
        { id: 'kakaya-liniya-metro-line-item-direction', targetText: 'направление', baseText: { de: 'Richtung', en: 'direction' }, acceptedAnswers: ['направление'] },
      ],
      buildChips: ['Какая линия метро', 'идёт туда?', 'Какой автобус', 'едет сюда?'],
      typeRecall: {
        before: 'Какая ', answer: 'линия', after: ' метро идёт туда?',
        acceptedAnswers: russianAccepted('линия'),
        fallbackChoices: ['линия', 'дорога', 'касса', 'аптека'],
      },
      speakTarget: {
        baseCue: { de: 'Welche Metrolinie fährt dorthin?', en: 'Which metro line goes there?' },
        targetPhrase: 'Какая линия метро идёт туда?',
        requiredTokens: ['Какая', 'линия', 'идёт'],
        optionalTokens: ['метро', 'туда'],
      },
      sceneCaption: {
        de: 'Auf dem Metroplan kreuzen sich mehrere farbige Linien; dein Ziel ist nur als Punkt markiert.',
        en: 'Several colored lines cross on the metro map, while your destination appears only as a point.',
      },
      trophyWord: {
        word: 'линия', meaning: { de: 'Linie', en: 'line' },
        example: 'Какая линия метро вам нужна?',
        whyThisWord: { de: 'Das Nomen ordnet Metropläne und macht Umstiege leichter besprechbar.', en: 'This noun organizes metro maps and makes transfers easier to discuss.' },
      },
      placeholderCaption: { de: 'Mehrfarbiger Metroplan mit markiertem Zielpunkt und mehreren möglichen Linien.', en: 'A multicolored metro map with a marked destination and several possible lines.' },
      songMood: 'colorful metro puzzle',
      visualNotes: 'Generic Russian metro map, intersecting color routes, one destination dot, no readable solution highlighted.',
    }),
  },
  {
    slug: 'kakaya-ostanovka-stop',
    title: { de: 'Welche Haltestelle?', en: 'Which stop?' },
    situation: {
      de: 'Im Bus siehst du die Haltestellenliste, weißt aber nicht, wo du aussteigen sollst.',
      en: 'On a bus, you can see the stop list but do not know which stop you need.',
    },
    pedagogicalGoal: 'Mit einer neutralen Brauchen-Konstruktion nach der passenden Haltestelle fragen.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Какая остановка мне нужна?',
        baseText: { de: 'Welche Haltestelle brauche ich?', en: 'Which stop do I need?' },
      },
      meaning: { de: 'Eine kurze Frage, wenn der Zielname bekannt, die passende Haltestelle aber unklar ist.', en: 'A short question when you know the destination but not the correct stop.' },
      chunks: [
        { id: 'kakaya-ostanovka-stop-place', targetText: 'Какая остановка', baseText: { de: 'Welche Haltestelle', en: 'Which stop' } },
        { id: 'kakaya-ostanovka-stop-needed', targetText: 'мне нужна?', baseText: { de: 'brauche ich?', en: 'do I need?' } },
      ],
      lessonItems: [
        { id: 'kakaya-ostanovka-stop-item-stop', targetText: 'остановка', baseText: { de: 'Haltestelle', en: 'stop' }, acceptedAnswers: ['остановка'] },
        { id: 'kakaya-ostanovka-stop-item-need', targetText: 'нужный', baseText: { de: 'benötigt / passend', en: 'needed / right' }, acceptedAnswers: ['нужный'] },
        { id: 'kakaya-ostanovka-stop-item-bus', targetText: 'автобус', baseText: { de: 'Bus', en: 'bus' }, acceptedAnswers: ['автобус'] },
        { id: 'kakaya-ostanovka-stop-item-announcement', targetText: 'объявление', baseText: { de: 'Ansage', en: 'announcement' }, acceptedAnswers: ['объявление'] },
      ],
      buildChips: ['Какая остановка', 'мне нужна?', 'Какой автобус', 'идёт дальше?'],
      typeRecall: {
        before: 'Какая ', answer: 'остановка', after: ' мне нужна?',
        acceptedAnswers: russianAccepted('остановка'),
        fallbackChoices: ['остановка', 'дорога', 'касса', 'аптека'],
      },
      speakTarget: {
        baseCue: { de: 'Welche Haltestelle brauche ich?', en: 'Which stop do I need?' },
        targetPhrase: 'Какая остановка мне нужна?',
        requiredTokens: ['Какая', 'остановка', 'нужна'],
        optionalTokens: ['мне'],
      },
      sceneCaption: {
        de: 'Über dem Busfenster hängt eine lange Haltestellenliste; dein Ziel steht auf dem Handy.',
        en: 'A long stop list hangs above the bus window, while your destination is visible on your phone.',
      },
      trophyWord: {
        word: 'остановка', meaning: { de: 'Haltestelle', en: 'stop' },
        example: 'Скажите, где следующая остановка.',
        whyThisWord: { de: 'Das Nomen verbindet Bus, Straßenbahn und andere Verkehrsmittel mit deinem Ausstiegspunkt.', en: 'This noun connects buses, trams, and other transport with the place where you get off.' },
      },
      placeholderCaption: { de: 'Busfenster mit langer Haltestellenliste und Zieladresse auf dem Handy.', en: 'A bus window with a long stop list and a destination address on a phone.' },
      songMood: 'attentive bus navigation',
      visualNotes: 'Modern city bus interior, stop strip overhead, phone destination below, no stop highlighted as the answer.',
    }),
  },
  {
    slug: 'odin-bilet-ticket',
    title: { de: 'Eine Fahrkarte, bitte', en: 'One ticket, please' },
    situation: {
      de: 'Am Schalter einer Regionalbahn kaufst du eine einzelne Fahrkarte.',
      en: 'At a regional rail ticket window, you buy one ticket.',
    },
    pedagogicalGoal: 'Zahlwort und Verkehrsnomen als feste Bestelleinheit mit Höflichkeitsformel verwenden.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Один билет, пожалуйста.',
        baseText: { de: 'Eine Fahrkarte, bitte.', en: 'One ticket, please.' },
      },
      meaning: { de: 'Eine minimale, natürliche Bestellung am Schalter.', en: 'A minimal, natural purchase request at a ticket window.' },
      chunks: [
        { id: 'odin-bilet-ticket-request', targetText: 'Один билет,', baseText: { de: 'Eine Fahrkarte,', en: 'One ticket,' } },
        { id: 'odin-bilet-ticket-please', targetText: 'пожалуйста.', baseText: { de: 'bitte.', en: 'please.' } },
      ],
      lessonItems: [
        { id: 'odin-bilet-ticket-item-ticket', targetText: 'билет', baseText: { de: 'Fahrkarte / Ticket', en: 'ticket' }, acceptedAnswers: ['билет'] },
        { id: 'odin-bilet-ticket-item-one', targetText: 'один', baseText: { de: 'eins / ein', en: 'one' }, acceptedAnswers: ['один'] },
        { id: 'odin-bilet-ticket-item-turnstile', targetText: 'турникет', baseText: { de: 'Drehkreuz', en: 'turnstile' }, acceptedAnswers: ['турникет'] },
        { id: 'odin-bilet-ticket-item-ride', targetText: 'поездка', baseText: { de: 'Fahrt', en: 'ride / trip' }, acceptedAnswers: ['поездка'] },
      ],
      buildChips: ['Один билет,', 'пожалуйста.', 'Два билета,', 'до вокзала.'],
      typeRecall: {
        before: 'Один ', answer: 'билет', after: ', пожалуйста.',
        acceptedAnswers: russianAccepted('билет'),
        fallbackChoices: ['билет', 'чек', 'пакет', 'паспорт'],
      },
      speakTarget: {
        baseCue: { de: 'Eine Fahrkarte, bitte.', en: 'One ticket, please.' },
        targetPhrase: 'Один билет, пожалуйста.',
        requiredTokens: ['Один', 'билет', 'пожалуйста'],
        optionalTokens: [],
      },
      sceneCaption: {
        de: 'Hinter dem Schalter leuchtet die Zielanzeige; vor dir steht das Kartenlesegerät bereit.',
        en: 'The destination display glows behind the window, and the payment terminal is ready in front of you.',
      },
      trophyWord: {
        word: 'билет', meaning: { de: 'Fahrkarte / Ticket', en: 'ticket' },
        example: 'Покажите билет, пожалуйста.',
        whyThisWord: { de: 'Das Nomen begleitet dich vom Kauf über das Drehkreuz bis zur Kontrolle.', en: 'This noun follows you from purchase through the turnstile to inspection.' },
      },
      placeholderCaption: { de: 'Regionalbahnschalter mit Zielanzeige und bereitem Kartenlesegerät.', en: 'A regional rail ticket window with a destination display and ready payment terminal.' },
      songMood: 'bright departure readiness',
      visualNotes: 'Regional rail counter, simple fare display, one transaction ready, no city-specific branding.',
    }),
  },
  {
    slug: 'vo-skolko-zakryvaetsya-closing',
    title: { de: 'Wann schließt das Café?', en: 'When does the cafe close?' },
    situation: {
      de: 'Am Eingang eines Cafés ist die Öffnungszeit lesbar, aber die Schließzeit auf dem Schild verwischt.',
      en: 'At a cafe entrance, the opening time is readable but the closing time on the sign is smudged.',
    },
    pedagogicalGoal: 'Mit dem festen Zeitfrageblock nach der Schließzeit eines Ortes fragen.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Во сколько закрывается кафе?',
        baseText: { de: 'Um wie viel Uhr schließt das Café?', en: 'What time does the cafe close?' },
      },
      meaning: { de: 'Eine konkrete Zeitfrage, wenn ein Aushang nicht eindeutig ist.', en: 'A concrete time question when posted hours are unclear.' },
      chunks: [
        { id: 'vo-skolko-zakryvaetsya-closing-time', targetText: 'Во сколько', baseText: { de: 'Um wie viel Uhr', en: 'What time' } },
        { id: 'vo-skolko-zakryvaetsya-closing-place', targetText: 'закрывается кафе?', baseText: { de: 'schließt das Café?', en: 'does the cafe close?' } },
      ],
      lessonItems: [
        { id: 'vo-skolko-zakryvaetsya-closing-item-close', targetText: 'закрываться', baseText: { de: 'schließen', en: 'to close' }, acceptedAnswers: ['закрываться'] },
        { id: 'vo-skolko-zakryvaetsya-closing-item-time', targetText: 'время', baseText: { de: 'Zeit', en: 'time' }, acceptedAnswers: ['время'] },
        { id: 'vo-skolko-zakryvaetsya-closing-item-cafe', targetText: 'кафе', baseText: { de: 'Café', en: 'cafe' }, acceptedAnswers: ['кафе'] },
        { id: 'vo-skolko-zakryvaetsya-closing-item-hours', targetText: 'расписание', baseText: { de: 'Zeitplan / Öffnungszeiten', en: 'schedule / hours' }, acceptedAnswers: ['расписание'] },
      ],
      buildChips: ['Во сколько', 'закрывается кафе?', 'Когда', 'открывается столовая?'],
      typeRecall: {
        before: 'Во сколько ', answer: 'закрывается', after: ' кафе?',
        acceptedAnswers: russianAccepted('закрывается'),
        fallbackChoices: ['закрывается', 'открывается', 'работает', 'начинается'],
      },
      speakTarget: {
        baseCue: { de: 'Um wie viel Uhr schließt das Café?', en: 'What time does the cafe close?' },
        targetPhrase: 'Во сколько закрывается кафе?',
        requiredTokens: ['сколько', 'закрывается', 'кафе'],
        optionalTokens: ['Во'],
      },
      sceneCaption: {
        de: 'Am Caféfenster hängt ein Stundenplan; die letzte Zeile ist durch Regen unleserlich.',
        en: 'An hours sign hangs in the cafe window, with its final line blurred by rain.',
      },
      trophyWord: {
        word: 'закрываться', meaning: { de: 'schließen', en: 'to close' },
        example: 'Кафе закрывается в девять.',
        whyThisWord: { de: 'Das Verb klärt Schließzeiten von Cafés, Museen, Geschäften und Schaltern.', en: 'This verb clarifies closing times for cafes, museums, shops, and service counters.' },
      },
      placeholderCaption: { de: 'Verregnetes Caféfenster mit einem teilweise verwischten Öffnungszeiten-Schild.', en: 'A rain-streaked cafe window with a partially smudged hours sign.' },
      songMood: 'rainy schedule question',
      visualNotes: 'Cafe doorway in light rain, hours placard with unreadable bottom row, warm interior beyond.',
    }),
  },
  {
    slug: 'vkhod-na-uglu-corner',
    title: { de: 'Eingang an der Ecke?', en: 'Entrance at the corner?' },
    situation: {
      de: 'Du stehst an der langen Seite eines Gebäudes und prüfst, ob der Eingang an der Ecke liegt.',
      en: 'You are standing along the long side of a building and check whether the entrance is at the corner.',
    },
    pedagogicalGoal: 'Den festen Ortsblock für an der Ecke in einer Bestätigungsfrage verwenden.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Вход находится на углу?',
        baseText: { de: 'Befindet sich der Eingang an der Ecke?', en: 'Is the entrance at the corner?' },
      },
      meaning: { de: 'Eine kurze Kontrollfrage, wenn der Eingang nicht von deiner Position aus sichtbar ist.', en: 'A short confirmation when the entrance is not visible from where you stand.' },
      chunks: [
        { id: 'vkhod-na-uglu-corner-location', targetText: 'Вход находится', baseText: { de: 'Der Eingang befindet sich', en: 'The entrance is located' } },
        { id: 'vkhod-na-uglu-corner-corner', targetText: 'на углу?', baseText: { de: 'an der Ecke?', en: 'at the corner?' } },
      ],
      lessonItems: [
        { id: 'vkhod-na-uglu-corner-item-entrance', targetText: 'вход', baseText: { de: 'Eingang', en: 'entrance' }, acceptedAnswers: ['вход'] },
        { id: 'vkhod-na-uglu-corner-item-corner', targetText: 'угол', baseText: { de: 'Ecke', en: 'corner' }, acceptedAnswers: ['угол'] },
        { id: 'vkhod-na-uglu-corner-item-located', targetText: 'находиться', baseText: { de: 'sich befinden', en: 'to be located' }, acceptedAnswers: ['находиться'] },
        { id: 'vkhod-na-uglu-corner-item-building', targetText: 'здание', baseText: { de: 'Gebäude', en: 'building' }, acceptedAnswers: ['здание'] },
      ],
      buildChips: ['Вход находится', 'на углу?', 'Выход находится', 'на первом этаже?'],
      typeRecall: {
        before: 'Вход находится на ', answer: 'углу', after: '?',
        acceptedAnswers: russianAccepted('углу'),
        fallbackChoices: ['углу', 'мосту', 'этаже', 'вокзале'],
      },
      speakTarget: {
        baseCue: { de: 'Befindet sich der Eingang an der Ecke?', en: 'Is the entrance at the corner?' },
        targetPhrase: 'Вход находится на углу?',
        requiredTokens: ['Вход', 'находится', 'углу'],
        optionalTokens: ['на'],
      },
      sceneCaption: {
        de: 'Eine lange Gebäudefassade zieht sich bis zur nächsten Ecke; an deiner Seite ist keine Tür zu sehen.',
        en: 'A long building facade extends to the next corner, with no door visible on your side.',
      },
      trophyWord: {
        word: 'угол', meaning: { de: 'Ecke', en: 'corner' },
        example: 'Поверните за угол, пожалуйста.',
        whyThisWord: { de: 'Das Nomen macht kurze Wegangaben rund um Gebäude und Straßenkreuzungen präziser.', en: 'This noun makes short directions around buildings and street intersections more precise.' },
      },
      placeholderCaption: { de: 'Lange Fassade ohne Tür, die bis zu einer nahen Straßenecke führt.', en: 'A long facade without a door leading toward a nearby street corner.' },
      songMood: 'architectural wayfinding',
      visualNotes: 'Neutral urban building facade, corner visible ahead, no entrance in current view, clear spatial depth.',
    }),
  },
  {
    slug: 'luchshe-peshkom-taksi-travel',
    title: { de: 'Zu Fuß oder mit dem Taxi?', en: 'On foot or by taxi?' },
    situation: {
      de: 'Vor dem Bahnhof vergleichst du zwei Möglichkeiten für den letzten Weg zu deinem Hotel.',
      en: 'Outside the station, you compare two ways to cover the final distance to your hotel.',
    },
    pedagogicalGoal: 'Zwei geläufige Verkehrsarten mit einem einfachen Vergleichswort gegenüberstellen.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Лучше пешком или на такси?',
        baseText: { de: 'Besser zu Fuß oder mit dem Taxi?', en: 'Is it better on foot or by taxi?' },
      },
      meaning: { de: 'Eine praktische Wahlfrage nach der sinnvolleren Verkehrsart.', en: 'A practical choice question about the better travel mode.' },
      chunks: [
        { id: 'luchshe-peshkom-taksi-travel-walking', targetText: 'Лучше пешком', baseText: { de: 'Besser zu Fuß', en: 'Better on foot' } },
        { id: 'luchshe-peshkom-taksi-travel-taxi', targetText: 'или на такси?', baseText: { de: 'oder mit dem Taxi?', en: 'or by taxi?' } },
      ],
      lessonItems: [
        { id: 'luchshe-peshkom-taksi-travel-item-walk', targetText: 'пешком', baseText: { de: 'zu Fuß', en: 'on foot' }, acceptedAnswers: ['пешком'] },
        { id: 'luchshe-peshkom-taksi-travel-item-taxi', targetText: 'такси', baseText: { de: 'Taxi', en: 'taxi' }, acceptedAnswers: ['такси'] },
        { id: 'luchshe-peshkom-taksi-travel-item-go-foot', targetText: 'идти', baseText: { de: 'zu Fuß gehen', en: 'to walk / go' }, acceptedAnswers: ['идти'] },
        { id: 'luchshe-peshkom-taksi-travel-item-go-vehicle', targetText: 'ехать', baseText: { de: 'fahren', en: 'to go by vehicle' }, acceptedAnswers: ['ехать'] },
      ],
      buildChips: ['Лучше пешком', 'или на такси?', 'Лучше на автобусе', 'или на метро?'],
      typeRecall: {
        before: 'Лучше ', answer: 'пешком', after: ' или на такси?',
        acceptedAnswers: russianAccepted('пешком'),
        fallbackChoices: ['пешком', 'быстро', 'утром', 'сегодня'],
      },
      speakTarget: {
        baseCue: { de: 'Besser zu Fuß oder mit dem Taxi?', en: 'Is it better on foot or by taxi?' },
        targetPhrase: 'Лучше пешком или на такси?',
        requiredTokens: ['Лучше', 'пешком', 'такси'],
        optionalTokens: ['или', 'на'],
      },
      sceneCaption: {
        de: 'Neben dem Bahnhofsausgang stehen ein Fußwegweiser und eine kleine Taxischlange; dein Koffer rollt neben dir.',
        en: 'A walking sign and a short taxi queue sit beside the station exit, with your suitcase at your side.',
      },
      trophyWord: {
        word: 'пешком', meaning: { de: 'zu Fuß', en: 'on foot' },
        example: 'Идите пешком до площади.',
        whyThisWord: { de: 'Das Adverb bezeichnet Gehen als Verkehrsart und macht Vergleiche mit Bus oder Taxi einfach.', en: 'This adverb names walking as a travel mode and makes comparisons with buses or taxis easy.' },
      },
      placeholderCaption: { de: 'Bahnhofsausgang mit Fußwegweiser, kurzer Taxischlange und Rollkoffer.', en: 'A station exit with a walking sign, short taxi queue, and rolling suitcase.' },
      songMood: 'sunlit travel choice',
      visualNotes: 'Station forecourt, pedestrian arrow and taxi rank in one frame, compact suitcase, open decision energy.',
    }),
  },
  {
    slug: 'mne-nuzhno-obratno-return',
    title: { de: 'Ich muss zurück', en: 'I need to go back' },
    situation: {
      de: 'Am falschen Bahnsteig merkst du anhand der Richtungstafel, dass du zurückfahren musst.',
      en: 'On the wrong platform, the direction board makes it clear that you need to travel back.',
    },
    pedagogicalGoal: 'Die notwendige Rückrichtung ohne Vergangenheit und ohne geschlechtsspezifische Form ausdrücken.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Мне нужно ехать обратно.',
        baseText: { de: 'Ich muss zurückfahren.', en: 'I need to go back.' },
      },
      meaning: { de: 'Eine neutrale Präsenslösung, wenn du deine Fahrtrichtung korrigieren musst.', en: 'A neutral present-tense solution when you need to correct your direction of travel.' },
      chunks: [
        { id: 'mne-nuzhno-obratno-return-need', targetText: 'Мне нужно', baseText: { de: 'Ich muss', en: 'I need to' } },
        { id: 'mne-nuzhno-obratno-return-back', targetText: 'ехать обратно.', baseText: { de: 'zurückfahren.', en: 'go back.' } },
      ],
      lessonItems: [
        { id: 'mne-nuzhno-obratno-return-item-back', targetText: 'обратно', baseText: { de: 'zurück', en: 'back' }, acceptedAnswers: ['обратно'] },
        { id: 'mne-nuzhno-obratno-return-item-ride', targetText: 'ехать', baseText: { de: 'fahren', en: 'to travel by vehicle' }, acceptedAnswers: ['ехать'] },
        { id: 'mne-nuzhno-obratno-return-item-return', targetText: 'возвращение', baseText: { de: 'Rückkehr', en: 'return' }, acceptedAnswers: ['возвращение'] },
        { id: 'mne-nuzhno-obratno-return-item-direction', targetText: 'направление', baseText: { de: 'Richtung', en: 'direction' }, acceptedAnswers: ['направление'] },
      ],
      buildChips: ['Мне нужно', 'ехать обратно.', 'Мне можно', 'ждать здесь.'],
      typeRecall: {
        before: 'Мне нужно ехать ', answer: 'обратно', after: '.',
        acceptedAnswers: russianAccepted('обратно'),
        fallbackChoices: ['обратно', 'вперёд', 'домой', 'далеко'],
      },
      speakTarget: {
        baseCue: { de: 'Ich muss zurückfahren.', en: 'I need to go back.' },
        targetPhrase: 'Мне нужно ехать обратно.',
        requiredTokens: ['Мне', 'ехать', 'обратно'],
        optionalTokens: ['нужно'],
      },
      sceneCaption: {
        de: 'Die Richtungstafel über dem Bahnsteig zeigt vom Ziel weg; gegenüber ist der Zugang zur Gegenrichtung sichtbar.',
        en: 'The platform direction board points away from your destination, while access to the opposite direction is visible across the station.',
      },
      trophyWord: {
        word: 'обратно', meaning: { de: 'zurück', en: 'back' },
        example: 'Вам нужно ехать обратно.',
        whyThisWord: { de: 'Das Adverb korrigiert eine Richtung klar, ohne erklären zu müssen, was vorher passiert ist.', en: 'This adverb corrects a direction clearly without explaining what happened earlier.' },
      },
      placeholderCaption: { de: 'Bahnsteigtafel in falscher Richtung und sichtbarer Zugang zum gegenüberliegenden Gleis.', en: 'A platform board pointing the wrong way with access to the opposite track visible.' },
      songMood: 'calm route correction',
      visualNotes: 'Metro platform with opposing direction signage, cross-passage visible, composed correction rather than panic.',
    }),
  },
]

export const RUSSIAN_A1_PRACTICAL_3_LESSONS: GuidedLessonDefinition[] = makeRussianPracticalLessons(
  GUIDED_TODAY_PATH_RUSSIAN_THREE_METADATA,
  russianA1Practical3Inputs,
  { de: 'Du hast Russisch A1 Praxis 3 abgeschlossen.', en: 'You have completed Russian A1 Practical 3.' },
)

export const GUIDED_TODAY_PATH_RUSSIAN_FOUR_METADATA: GuidedPathMetadata = {
  id: 'russian-a1-practical-4',
  title: 'Russian A1 Practical 4',
  shortTitle: 'A1 Practical 4',
  subtitle: { de: 'Café, Essen und höflich bestellen', en: 'Cafe, food, and polite ordering' },
  level: 'A1',
  baseLanguage: 'German',
  targetLanguage: 'Russian',
  estimatedMinutes: 5,
}

const russianA1Practical4Inputs: RussianLessonInput[] = [
  {
    slug: 'svobodnyy-stolik-table',
    title: { de: 'Ein freier Tisch', en: 'A free table' },
    situation: {
      de: 'Du kommst ohne Reservierung in ein gut besuchtes Café und sprichst die Bedienung am Eingang an.',
      en: 'You arrive at a busy cafe without a reservation and approach the staff member at the entrance.',
    },
    pedagogicalGoal: 'Mit einer Haben-Sie-Frage höflich nach einem freien Tisch fragen.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'У вас есть свободный столик?',
        baseText: { de: 'Haben Sie einen freien Tisch?', en: 'Do you have a free table?' },
      },
      meaning: {
        de: 'Eine natürliche erste Frage beim Betreten eines Cafés ohne Reservierung.',
        en: 'A natural first question when entering a cafe without a reservation.',
      },
      chunks: [
        { id: 'svobodnyy-stolik-table-have', targetText: 'У вас есть', baseText: { de: 'Haben Sie', en: 'Do you have' } },
        { id: 'svobodnyy-stolik-table-free-table', targetText: 'свободный столик?', baseText: { de: 'einen freien Tisch?', en: 'a free table?' } },
      ],
      lessonItems: [
        { id: 'svobodnyy-stolik-table-item-table', targetText: 'столик', baseText: { de: 'Tisch im Café', en: 'cafe table' }, acceptedAnswers: ['столик'] },
        { id: 'svobodnyy-stolik-table-item-free', targetText: 'свободный', baseText: { de: 'frei / verfügbar', en: 'free / available' }, acceptedAnswers: ['свободный'] },
        { id: 'svobodnyy-stolik-table-item-seat', targetText: 'место', baseText: { de: 'Platz / Sitzplatz', en: 'place / seat' }, acceptedAnswers: ['место'] },
        { id: 'svobodnyy-stolik-table-item-server', targetText: 'официант', baseText: { de: 'Kellner / Bedienung', en: 'waiter / server' }, acceptedAnswers: ['официант'] },
      ],
      buildChips: ['У вас есть', 'свободный столик?', 'меню на сегодня?', 'чай с лимоном?'],
      typeRecall: {
        before: 'У вас есть свободный ', answer: 'столик', after: '?',
        acceptedAnswers: russianAccepted('столик'),
        fallbackChoices: ['столик', 'автобус', 'музей', 'магазин'],
      },
      speakTarget: {
        baseCue: { de: 'Haben Sie einen freien Tisch?', en: 'Do you have a free table?' },
        targetPhrase: 'У вас есть свободный столик?',
        requiredTokens: ['есть', 'свободный', 'столик'],
        optionalTokens: ['У', 'вас'],
      },
      sceneCaption: {
        de: 'Am Empfangspult liegt eine Reservierungsliste; hinter der Bedienung sind mehrere Sitzbereiche zu sehen.',
        en: 'A reservation list rests on the host stand, with several seating areas visible behind the staff member.',
      },
      trophyWord: {
        word: 'столик', meaning: { de: 'Tisch im Café', en: 'cafe table' },
        example: 'У вас есть свободный столик?',
        whyThisWord: { de: 'Die verkleinerte Form klingt im Café natürlich und bezeichnet einen Tisch für Gäste.', en: 'The diminutive form sounds natural in a cafe and refers to a table for guests.' },
      },
      placeholderCaption: { de: 'Belebter Café-Eingang mit Empfangspult, Reservierungsbuch und sichtbaren Sitznischen.', en: 'A busy cafe entrance with a host stand, reservation book, and visible seating alcoves.' },
      songMood: 'hopeful cafe arrival',
      visualNotes: 'Region-neutral cafe entrance, host stand in the foreground, mixed occupied and unmarked tables beyond, no seating outcome shown.',
    }),
  },
  {
    slug: 'prinesite-menyu-menu',
    title: { de: 'Die Speisekarte, bitte', en: 'The menu, please' },
    situation: {
      de: 'Du sitzt im Café, aber auf deinem Tisch liegt noch keine Speisekarte.',
      en: 'You are seated in a cafe, but there is no menu on your table yet.',
    },
    pedagogicalGoal: 'Mit einem höflichen Imperativ um die Speisekarte bitten.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Принесите меню, пожалуйста.',
        baseText: { de: 'Bringen Sie bitte die Speisekarte.', en: 'Please bring the menu.' },
      },
      meaning: { de: 'Eine kurze höfliche Bitte, bevor du deine Bestellung auswählst.', en: 'A short polite request before choosing your order.' },
      chunks: [
        { id: 'prinesite-menyu-menu-request', targetText: 'Принесите меню,', baseText: { de: 'Bringen Sie die Speisekarte,', en: 'Bring the menu,' } },
        { id: 'prinesite-menyu-menu-please', targetText: 'пожалуйста.', baseText: { de: 'bitte.', en: 'please.' } },
      ],
      lessonItems: [
        { id: 'prinesite-menyu-menu-item-bring', targetText: 'принести', baseText: { de: 'bringen', en: 'to bring' }, acceptedAnswers: ['принести'] },
        { id: 'prinesite-menyu-menu-item-menu', targetText: 'меню', baseText: { de: 'Speisekarte', en: 'menu' }, acceptedAnswers: ['меню'] },
        { id: 'prinesite-menyu-menu-item-order', targetText: 'заказ', baseText: { de: 'Bestellung', en: 'order' }, acceptedAnswers: ['заказ'] },
        { id: 'prinesite-menyu-menu-item-server', targetText: 'официант', baseText: { de: 'Kellner / Bedienung', en: 'waiter / server' }, acceptedAnswers: ['официант'] },
      ],
      buildChips: ['Принесите меню,', 'пожалуйста.', 'Поставьте воду', 'на стол.'],
      typeRecall: {
        before: 'Принесите ', answer: 'меню', after: ', пожалуйста.',
        acceptedAnswers: russianAccepted('меню'),
        fallbackChoices: ['меню', 'молоко', 'письмо', 'полотенце'],
      },
      speakTarget: {
        baseCue: { de: 'Bringen Sie bitte die Speisekarte.', en: 'Please bring the menu.' },
        targetPhrase: 'Принесите меню, пожалуйста.',
        requiredTokens: ['Принесите', 'меню', 'пожалуйста'],
        optionalTokens: [],
      },
      sceneCaption: {
        de: 'Vor dir stehen nur ein leeres Glas und ein Besteckkorb; die Bedienung geht am Tisch vorbei.',
        en: 'Only an empty glass and a cutlery holder sit in front of you as the server passes the table.',
      },
      trophyWord: {
        word: 'меню', meaning: { de: 'Speisekarte', en: 'menu' },
        example: 'Что вы рекомендуете из меню?',
        whyThisWord: { de: 'Das unveränderliche Nomen hilft dir beim Auswählen und Nachfragen in Café oder Restaurant.', en: 'This unchanging noun helps you choose and ask questions in a cafe or restaurant.' },
      },
      placeholderCaption: { de: 'Kleiner Cafétisch ohne Speisekarte, mit leerem Glas und ordentlich sortiertem Besteck.', en: 'A small cafe table without a menu, holding an empty glass and neatly arranged cutlery.' },
      songMood: 'calm menu anticipation',
      visualNotes: 'Compact cafe table, missing menu emphasized by open tabletop space, server moving through the middle distance.',
    }),
  },
  {
    slug: 'odin-chay-limon-tea',
    title: { de: 'Tee mit Zitrone', en: 'Tea with lemon' },
    situation: {
      de: 'Die Bedienung wartet mit dem Bestellblock, und du wählst ein heißes Getränk mit Zitrone.',
      en: 'The server is waiting with an order pad, and you choose a hot drink with lemon.',
    },
    pedagogicalGoal: 'Getränk und Beigabe als feste Bestelleinheit mit einer Mengenangabe verbinden.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Один чай с лимоном, пожалуйста.',
        baseText: { de: 'Einen Tee mit Zitrone, bitte.', en: 'One tea with lemon, please.' },
      },
      meaning: { de: 'Eine vollständige einfache Getränkebestellung für das Café.', en: 'A complete simple drink order for a cafe.' },
      chunks: [
        { id: 'odin-chay-limon-tea-drink', targetText: 'Один чай', baseText: { de: 'Einen Tee', en: 'One tea' } },
        { id: 'odin-chay-limon-tea-lemon', targetText: 'с лимоном,', baseText: { de: 'mit Zitrone,', en: 'with lemon,' } },
        { id: 'odin-chay-limon-tea-please', targetText: 'пожалуйста.', baseText: { de: 'bitte.', en: 'please.' } },
      ],
      lessonItems: [
        { id: 'odin-chay-limon-tea-item-tea', targetText: 'чай', baseText: { de: 'Tee', en: 'tea' }, acceptedAnswers: ['чай'] },
        { id: 'odin-chay-limon-tea-item-lemon', targetText: 'лимон', baseText: { de: 'Zitrone', en: 'lemon' }, acceptedAnswers: ['лимон'] },
        { id: 'odin-chay-limon-tea-item-drink', targetText: 'напиток', baseText: { de: 'Getränk', en: 'drink' }, acceptedAnswers: ['напиток'] },
        { id: 'odin-chay-limon-tea-item-cup', targetText: 'чашка', baseText: { de: 'Tasse', en: 'cup' }, acceptedAnswers: ['чашка'] },
      ],
      buildChips: ['Один чай', 'с лимоном,', 'пожалуйста.', 'Два кофе', 'без молока,'],
      typeRecall: {
        before: 'Один чай с ', answer: 'лимоном', after: ', пожалуйста.',
        acceptedAnswers: russianAccepted('лимоном'),
        fallbackChoices: ['лимоном', 'билетом', 'паспортом', 'телефоном'],
      },
      speakTarget: {
        baseCue: { de: 'Einen Tee mit Zitrone, bitte.', en: 'One tea with lemon, please.' },
        targetPhrase: 'Один чай с лимоном, пожалуйста.',
        requiredTokens: ['Один', 'чай', 'лимоном'],
        optionalTokens: ['с', 'пожалуйста'],
      },
      sceneCaption: {
        de: 'Auf dem Bestellblock ist noch eine Zeile frei; neben dem Samowar liegen Zitronenscheiben bereit.',
        en: 'One line remains open on the order pad, with lemon slices arranged beside the hot-water urn.',
      },
      trophyWord: {
        word: 'чай', meaning: { de: 'Tee', en: 'tea' },
        example: 'Вы предпочитаете чай или кофе?',
        whyThisWord: { de: 'Das häufige Getränkewort lässt sich leicht mit Zitrone, Milch oder Zucker ergänzen.', en: 'This common drink word combines easily with lemon, milk, or sugar.' },
      },
      placeholderCaption: { de: 'Bestellblock, Teekanne und eine kleine Schale mit frischen Zitronenscheiben.', en: 'An order pad, teapot, and a small dish of fresh lemon slices.' },
      songMood: 'sunny tea order',
      visualNotes: 'Cafe counter with teapot and lemon dish, order pad ready, warm daylight catching the glassware.',
    }),
  },
  {
    slug: 'kofe-bez-sakhara-sugar',
    title: { de: 'Kaffee ohne Zucker', en: 'Coffee without sugar' },
    situation: {
      de: 'Beim Bestellen möchtest du deutlich machen, dass in deinen Kaffee kein Zucker soll.',
      en: 'While ordering, you want to make clear that no sugar should go into your coffee.',
    },
    pedagogicalGoal: 'Den festen Ohne-Block für eine einfache Getränkewahl verwenden.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Кофе без сахара, пожалуйста.',
        baseText: { de: 'Kaffee ohne Zucker, bitte.', en: 'Coffee without sugar, please.' },
      },
      meaning: { de: 'Eine knappe Café-Bestellung mit einer klaren Zutat, die entfallen soll.', en: 'A concise cafe order with one ingredient clearly left out.' },
      chunks: [
        { id: 'kofe-bez-sakhara-sugar-drink', targetText: 'Кофе', baseText: { de: 'Kaffee', en: 'Coffee' } },
        { id: 'kofe-bez-sakhara-sugar-without', targetText: 'без сахара,', baseText: { de: 'ohne Zucker,', en: 'without sugar,' } },
        { id: 'kofe-bez-sakhara-sugar-please', targetText: 'пожалуйста.', baseText: { de: 'bitte.', en: 'please.' } },
      ],
      lessonItems: [
        { id: 'kofe-bez-sakhara-sugar-item-coffee', targetText: 'кофе', baseText: { de: 'Kaffee', en: 'coffee' }, acceptedAnswers: ['кофе'] },
        { id: 'kofe-bez-sakhara-sugar-item-sugar', targetText: 'сахар', baseText: { de: 'Zucker', en: 'sugar' }, acceptedAnswers: ['сахар'] },
        { id: 'kofe-bez-sakhara-sugar-item-cup', targetText: 'чашка', baseText: { de: 'Tasse', en: 'cup' }, acceptedAnswers: ['чашка'] },
        { id: 'kofe-bez-sakhara-sugar-item-spoon', targetText: 'ложка', baseText: { de: 'Löffel', en: 'spoon' }, acceptedAnswers: ['ложка'] },
      ],
      buildChips: ['Кофе', 'без сахара,', 'пожалуйста.', 'Чай', 'с вареньем,'],
      typeRecall: {
        before: 'Кофе без ', answer: 'сахара', after: ', пожалуйста.',
        acceptedAnswers: russianAccepted('сахара'),
        fallbackChoices: ['сахара', 'билета', 'паспорта', 'вокзала'],
      },
      speakTarget: {
        baseCue: { de: 'Kaffee ohne Zucker, bitte.', en: 'Coffee without sugar, please.' },
        targetPhrase: 'Кофе без сахара, пожалуйста.',
        requiredTokens: ['Кофе', 'сахара', 'пожалуйста'],
        optionalTokens: ['без'],
      },
      sceneCaption: {
        de: 'Neben der Espressomaschine stehen Zuckerdose und kleine Portionspäckchen; die Bedienung hält die Tasse bereit.',
        en: 'A sugar bowl and small packets sit beside the espresso machine while the server holds the cup ready.',
      },
      trophyWord: {
        word: 'сахар', meaning: { de: 'Zucker', en: 'sugar' },
        example: 'Добавьте сахар по вкусу.',
        whyThisWord: { de: 'Das Nomen ist beim Bestellen und beim Anpassen von heißen Getränken besonders nützlich.', en: 'This noun is especially useful when ordering and adjusting hot drinks.' },
      },
      placeholderCaption: { de: 'Espressotasse neben Zuckerdose und einzelnen Zuckerpäckchen auf der Theke.', en: 'An espresso cup beside a sugar bowl and individual sugar packets on the counter.' },
      songMood: 'clean coffee preference',
      visualNotes: 'Espresso station, sugar service clearly visible but untouched, cup poised before preparation.',
    }),
  },
  {
    slug: 'eto-blyudo-ostroe-spicy',
    title: { de: 'Ist das Gericht scharf?', en: 'Is this dish spicy?' },
    situation: {
      de: 'Auf der Speisekarte ist ein Gericht mit roten Gewürzen abgebildet, aber es gibt keine Erklärung zum Geschmack.',
      en: 'The menu shows a dish with red spices, but there is no explanation of its flavor.',
    },
    pedagogicalGoal: 'Mit einer höflich eingeleiteten Ja-Nein-Frage nach Schärfe fragen.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Скажите, это блюдо острое?',
        baseText: { de: 'Können Sie mir sagen, ob dieses Gericht scharf ist?', en: 'Could you tell me whether this dish is spicy?' },
      },
      meaning: { de: 'Eine klare Geschmacksfrage, bevor du ein unbekanntes Gericht bestellst.', en: 'A clear flavor question before ordering an unfamiliar dish.' },
      chunks: [
        { id: 'eto-blyudo-ostroe-spicy-opener', targetText: 'Скажите,', baseText: { de: 'Sagen Sie,', en: 'Could you tell me,' } },
        { id: 'eto-blyudo-ostroe-spicy-dish', targetText: 'это блюдо', baseText: { de: 'dieses Gericht', en: 'this dish' } },
        { id: 'eto-blyudo-ostroe-spicy-flavor', targetText: 'острое?', baseText: { de: 'ist scharf?', en: 'is spicy?' } },
      ],
      lessonItems: [
        { id: 'eto-blyudo-ostroe-spicy-item-dish', targetText: 'блюдо', baseText: { de: 'Gericht / Speise', en: 'dish' }, acceptedAnswers: ['блюдо'] },
        { id: 'eto-blyudo-ostroe-spicy-item-spicy', targetText: 'острый', baseText: { de: 'scharf', en: 'spicy' }, acceptedAnswers: ['острый'] },
        { id: 'eto-blyudo-ostroe-spicy-item-taste', targetText: 'вкус', baseText: { de: 'Geschmack', en: 'taste' }, acceptedAnswers: ['вкус'] },
        { id: 'eto-blyudo-ostroe-spicy-item-spice', targetText: 'специя', baseText: { de: 'Gewürz', en: 'spice' }, acceptedAnswers: ['специя'] },
      ],
      buildChips: ['Скажите,', 'это блюдо', 'острое?', 'этот суп', 'сладкий?'],
      typeRecall: {
        before: 'Скажите, это блюдо ', answer: 'острое', after: '?',
        acceptedAnswers: russianAccepted('острое'),
        fallbackChoices: ['острое', 'сладкое', 'холодное', 'горячее'],
      },
      speakTarget: {
        baseCue: { de: 'Können Sie mir sagen, ob dieses Gericht scharf ist?', en: 'Could you tell me whether this dish is spicy?' },
        targetPhrase: 'Скажите, это блюдо острое?',
        requiredTokens: ['Скажите', 'блюдо', 'острое'],
        optionalTokens: ['это'],
      },
      sceneCaption: {
        de: 'Du zeigst auf ein Foto mit roter Soße und sichtbaren Gewürzen; die Bedienung wartet neben der Karte.',
        en: 'You point to a photo with red sauce and visible spices while the server waits beside the menu.',
      },
      trophyWord: {
        word: 'блюдо', meaning: { de: 'Gericht / Speise', en: 'dish' },
        example: 'Какое блюдо вы рекомендуете?',
        whyThisWord: { de: 'Das neutrale Nomen passt zu Fragen über Geschmack, Zutaten und Empfehlungen.', en: 'This neutral noun fits questions about flavor, ingredients, and recommendations.' },
      },
      placeholderCaption: { de: 'Geöffnete Speisekarte mit einem rot gewürzten Gericht und kleinem Gewürzsymbol.', en: 'An open menu showing a red-spiced dish with a small spice symbol.' },
      songMood: 'curious flavor check',
      visualNotes: 'Menu close-up with a richly colored dish, spice cues visible, server waiting without revealing the flavor answer.',
    }),
  },
  {
    slug: 'bolshe-nichego-enough',
    title: { de: 'Sonst nichts', en: 'Nothing else' },
    situation: {
      de: 'Die Bedienung hat deine Bestellung notiert und hält den Stift für eine mögliche Ergänzung bereit.',
      en: 'The server has noted your order and keeps the pen ready in case you want to add something.',
    },
    pedagogicalGoal: 'Eine Bestellung mit einer knappen negativen Mengenphrase freundlich abschließen.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Больше ничего, спасибо.',
        baseText: { de: 'Sonst nichts, danke.', en: 'Nothing else, thank you.' },
      },
      meaning: { de: 'Ein freundlicher Abschluss, wenn deine Bestellung vollständig ist.', en: 'A friendly close when your order is complete.' },
      chunks: [
        { id: 'bolshe-nichego-enough-no-more', targetText: 'Больше ничего,', baseText: { de: 'Sonst nichts,', en: 'Nothing else,' } },
        { id: 'bolshe-nichego-enough-thanks', targetText: 'спасибо.', baseText: { de: 'danke.', en: 'thank you.' } },
      ],
      lessonItems: [
        { id: 'bolshe-nichego-enough-item-more', targetText: 'больше', baseText: { de: 'mehr / weiter', en: 'more / else' }, acceptedAnswers: ['больше'] },
        { id: 'bolshe-nichego-enough-item-nothing', targetText: 'ничего', baseText: { de: 'nichts', en: 'nothing' }, acceptedAnswers: ['ничего'] },
        { id: 'bolshe-nichego-enough-item-order', targetText: 'заказ', baseText: { de: 'Bestellung', en: 'order' }, acceptedAnswers: ['заказ'] },
        { id: 'bolshe-nichego-enough-item-extra', targetText: 'добавка', baseText: { de: 'Nachschlag / Zusatz', en: 'extra helping / addition' }, acceptedAnswers: ['добавка'] },
      ],
      buildChips: ['Больше ничего,', 'спасибо.', 'Ещё один чай,', 'и десерт.'],
      typeRecall: {
        before: '', answer: 'Больше', after: ' ничего, спасибо.',
        acceptedAnswers: russianAccepted('Больше'),
        fallbackChoices: ['Больше', 'Сегодня', 'Здесь', 'Иногда'],
      },
      speakTarget: {
        baseCue: { de: 'Sonst nichts, danke.', en: 'Nothing else, thank you.' },
        targetPhrase: 'Больше ничего, спасибо.',
        requiredTokens: ['Больше', 'ничего', 'спасибо'],
        optionalTokens: [],
      },
      sceneCaption: {
        de: 'Der Bestellblock bleibt geöffnet, und die Bedienung schaut noch einmal von der Liste zu dir.',
        en: 'The order pad remains open as the server looks once more from the list to you.',
      },
      trophyWord: {
        word: 'больше', meaning: { de: 'mehr / weiter', en: 'more / else' },
        example: 'Больше ничего не нужно, спасибо.',
        whyThisWord: { de: 'Das Adverb hilft, Mengen zu erweitern oder mit einer Verneinung klar zu begrenzen.', en: 'This adverb helps increase an amount or, with a negative, set a clear limit.' },
      },
      placeholderCaption: { de: 'Geöffneter Bestellblock mit mehreren Einträgen und wartendem Stift über der letzten Zeile.', en: 'An open order pad with several entries and a pen waiting above the final line.' },
      songMood: 'satisfied order close',
      visualNotes: 'Order pad nearly complete, pen suspended at the final line, server attentive and no additional item depicted.',
    }),
  },
  {
    slug: 'zavernite-pirozhok-takeaway',
    title: { de: 'Zum Mitnehmen', en: 'To go' },
    situation: {
      de: 'An der Cafétheke wählst du ein gefülltes Gebäck aus der Vitrine, möchtest es aber nicht dort essen.',
      en: 'At the cafe counter, you choose a filled pastry from the display but do not want to eat it there.',
    },
    pedagogicalGoal: 'Mit einem höflichen Imperativ und dem festen Mitnahmeblock um Verpackung bitten.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Заверните пирожок с собой, пожалуйста.',
        baseText: { de: 'Packen Sie das gefüllte Gebäck bitte zum Mitnehmen ein.', en: 'Please wrap the filled pastry to go.' },
      },
      meaning: { de: 'Eine natürliche Bitte, Gebäck für unterwegs einzupacken.', en: 'A natural request to pack a pastry for the road.' },
      chunks: [
        { id: 'zavernite-pirozhok-takeaway-wrap', targetText: 'Заверните пирожок', baseText: { de: 'Packen Sie das gefüllte Gebäck ein', en: 'Wrap the filled pastry' } },
        { id: 'zavernite-pirozhok-takeaway-to-go', targetText: 'с собой,', baseText: { de: 'zum Mitnehmen,', en: 'to go,' } },
        { id: 'zavernite-pirozhok-takeaway-please', targetText: 'пожалуйста.', baseText: { de: 'bitte.', en: 'please.' } },
      ],
      lessonItems: [
        { id: 'zavernite-pirozhok-takeaway-item-wrap', targetText: 'завернуть', baseText: { de: 'einpacken / einwickeln', en: 'to wrap / pack' }, acceptedAnswers: ['завернуть'] },
        { id: 'zavernite-pirozhok-takeaway-item-pastry', targetText: 'пирожок', baseText: { de: 'gefülltes Gebäck', en: 'filled pastry' }, acceptedAnswers: ['пирожок'] },
        { id: 'zavernite-pirozhok-takeaway-item-package', targetText: 'упаковка', baseText: { de: 'Verpackung', en: 'packaging' }, acceptedAnswers: ['упаковка'] },
        { id: 'zavernite-pirozhok-takeaway-item-bag', targetText: 'пакет', baseText: { de: 'Tüte', en: 'bag' }, acceptedAnswers: ['пакет'] },
      ],
      buildChips: ['Заверните пирожок', 'с собой,', 'пожалуйста.', 'Положите салфетку', 'на тарелку.'],
      typeRecall: {
        before: 'Заверните ', answer: 'пирожок', after: ' с собой, пожалуйста.',
        acceptedAnswers: russianAccepted('пирожок'),
        fallbackChoices: ['пирожок', 'билет', 'паспорт', 'телефон'],
      },
      speakTarget: {
        baseCue: { de: 'Packen Sie das gefüllte Gebäck bitte zum Mitnehmen ein.', en: 'Please wrap the filled pastry to go.' },
        targetPhrase: 'Заверните пирожок с собой, пожалуйста.',
        requiredTokens: ['Заверните', 'пирожок', 'собой'],
        optionalTokens: ['с', 'пожалуйста'],
      },
      sceneCaption: {
        de: 'Ein einzelnes gefülltes Gebäck liegt auf dem Papier neben der offenen Kuchenzange; deine Tasche steht am Ausgang.',
        en: 'A single filled pastry rests on paper beside the open pastry tongs, with your bag near the exit.',
      },
      trophyWord: {
        word: 'завернуть', meaning: { de: 'einpacken / einwickeln', en: 'to wrap / pack' },
        example: 'Заверните хлеб отдельно, пожалуйста.',
        whyThisWord: { de: 'Das Verb ist an Bäckerei- und Cafétheken nützlich, wenn etwas transportiert werden soll.', en: 'This verb is useful at bakery and cafe counters when something needs to be carried away.' },
      },
      placeholderCaption: { de: 'Gefülltes Gebäck auf Verpackungspapier, offene Zange und gefaltete Papiertüte an der Theke.', en: 'A filled pastry on wrapping paper with open tongs and a folded paper bag at the counter.' },
      songMood: 'cheerful takeaway stop',
      visualNotes: 'Bakery-cafe counter, one pastry ready on paper, packaging materials visible, departure cues without showing it wrapped.',
    }),
  },
  {
    slug: 'vsyo-ochen-vkusno-tasty',
    title: { de: 'Alles ist sehr lecker', en: 'Everything is delicious' },
    situation: {
      de: 'Nach dem Essen kommt die Bedienung an deinen fast leeren Tisch und wartet auf deine Reaktion.',
      en: 'After the meal, the server approaches your nearly cleared table and waits for your reaction.',
    },
    pedagogicalGoal: 'Ein positives Geschmacksurteil mit Dank als neutrale Präsensphrase ausdrücken.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Всё очень вкусно, спасибо.',
        baseText: { de: 'Alles ist sehr lecker, danke.', en: 'Everything is very tasty, thank you.' },
      },
      meaning: { de: 'Ein warmes, geschlechtsneutrales Kompliment nach dem Essen.', en: 'A warm, gender-neutral compliment after a meal.' },
      chunks: [
        { id: 'vsyo-ochen-vkusno-tasty-praise', targetText: 'Всё очень вкусно,', baseText: { de: 'Alles ist sehr lecker,', en: 'Everything is very tasty,' } },
        { id: 'vsyo-ochen-vkusno-tasty-thanks', targetText: 'спасибо.', baseText: { de: 'danke.', en: 'thank you.' } },
      ],
      lessonItems: [
        { id: 'vsyo-ochen-vkusno-tasty-item-tasty', targetText: 'вкусный', baseText: { de: 'lecker', en: 'tasty' }, acceptedAnswers: ['вкусный'] },
        { id: 'vsyo-ochen-vkusno-tasty-item-lunch', targetText: 'обед', baseText: { de: 'Mittagessen', en: 'lunch' }, acceptedAnswers: ['обед'] },
        { id: 'vsyo-ochen-vkusno-tasty-item-cook', targetText: 'повар', baseText: { de: 'Koch / Köchin', en: 'cook / chef' }, acceptedAnswers: ['повар'] },
        { id: 'vsyo-ochen-vkusno-tasty-item-recipe', targetText: 'рецепт', baseText: { de: 'Rezept', en: 'recipe' }, acceptedAnswers: ['рецепт'] },
      ],
      buildChips: ['Всё очень вкусно,', 'спасибо.', 'Суп слишком солёный,', 'можно воду?'],
      typeRecall: {
        before: 'Всё очень ', answer: 'вкусно', after: ', спасибо.',
        acceptedAnswers: russianAccepted('вкусно'),
        fallbackChoices: ['вкусно', 'далеко', 'рано', 'темно'],
      },
      speakTarget: {
        baseCue: { de: 'Alles ist sehr lecker, danke.', en: 'Everything is very tasty, thank you.' },
        targetPhrase: 'Всё очень вкусно, спасибо.',
        requiredTokens: ['Всё', 'очень', 'вкусно'],
        optionalTokens: ['спасибо'],
      },
      sceneCaption: {
        de: 'Auf dem Tisch stehen ein leerer Teller und eine kleine Brotschale; die Bedienung hält kurz neben dir an.',
        en: 'An empty plate and a small bread basket remain on the table as the server pauses beside you.',
      },
      trophyWord: {
        word: 'вкусно', meaning: { de: 'lecker', en: 'tasty / delicious' },
        example: 'Попробуйте, здесь очень вкусно.',
        whyThisWord: { de: 'Das prädikative Adverb bewertet Essen ohne eine Form, die sich nach Person oder Geschlecht verändert.', en: 'This predicative adverb praises food without a form that changes for person or gender.' },
      },
      placeholderCaption: { de: 'Fast abgeräumter Cafétisch mit leerem Teller, Brotkorb und gefaltetem Tuch.', en: 'A nearly cleared cafe table with an empty plate, bread basket, and folded napkin.' },
      songMood: 'warm meal appreciation',
      visualNotes: 'Post-meal table with clean plate and crumbs, server pausing for feedback, warm interior glow and no spoken response depicted.',
    }),
  },
  {
    slug: 'segodnya-prekrasnaya-pogoda-weather',
    title: { de: 'Schönes Wetter heute', en: 'Lovely weather today' },
    situation: {
      de: 'Auf der Caféterrasse brechen nach einem kurzen Schauer Sonnenstrahlen durch, und die Person am Nachbartisch blickt nach oben.',
      en: 'On the cafe terrace, sunlight breaks through after a brief shower, and the person at the next table looks up.',
    },
    pedagogicalGoal: 'Mit einem einfachen Wetterurteil höflichen Smalltalk im Präsens beginnen.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Сегодня прекрасная погода, правда?',
        baseText: { de: 'Heute ist herrliches Wetter, nicht wahr?', en: 'The weather is lovely today, isn’t it?' },
      },
      meaning: { de: 'Ein leichter Gesprächsanfang über eine gemeinsam sichtbare Alltagssituation.', en: 'A light conversation opener about an everyday situation both people can see.' },
      chunks: [
        { id: 'segodnya-prekrasnaya-pogoda-weather-comment', targetText: 'Сегодня прекрасная погода,', baseText: { de: 'Heute ist herrliches Wetter,', en: 'The weather is lovely today,' } },
        { id: 'segodnya-prekrasnaya-pogoda-weather-tag', targetText: 'правда?', baseText: { de: 'nicht wahr?', en: 'isn’t it?' } },
      ],
      lessonItems: [
        { id: 'segodnya-prekrasnaya-pogoda-weather-item-weather', targetText: 'погода', baseText: { de: 'Wetter', en: 'weather' }, acceptedAnswers: ['погода'] },
        { id: 'segodnya-prekrasnaya-pogoda-weather-item-lovely', targetText: 'прекрасный', baseText: { de: 'herrlich / wunderschön', en: 'lovely / wonderful' }, acceptedAnswers: ['прекрасный'] },
        { id: 'segodnya-prekrasnaya-pogoda-weather-item-sun', targetText: 'солнце', baseText: { de: 'Sonne', en: 'sun' }, acceptedAnswers: ['солнце'] },
        { id: 'segodnya-prekrasnaya-pogoda-weather-item-cloud', targetText: 'облако', baseText: { de: 'Wolke', en: 'cloud' }, acceptedAnswers: ['облако'] },
      ],
      buildChips: ['Сегодня прекрасная погода,', 'правда?', 'Вечером будет дождь,', 'вы согласны?'],
      typeRecall: {
        before: 'Сегодня прекрасная ', answer: 'погода', after: ', правда?',
        acceptedAnswers: russianAccepted('погода'),
        fallbackChoices: ['погода', 'музыка', 'дорога', 'комната'],
      },
      speakTarget: {
        baseCue: { de: 'Heute ist herrliches Wetter, nicht wahr?', en: 'The weather is lovely today, isn’t it?' },
        targetPhrase: 'Сегодня прекрасная погода, правда?',
        requiredTokens: ['Сегодня', 'прекрасная', 'погода'],
        optionalTokens: ['правда'],
      },
      sceneCaption: {
        de: 'Regentropfen glitzern noch auf den Tischen, während die Sonne durch eine helle Wolkenlücke fällt.',
        en: 'Raindrops still glint on the tables while sunlight falls through a bright gap in the clouds.',
      },
      trophyWord: {
        word: 'погода', meaning: { de: 'Wetter', en: 'weather' },
        example: 'Как вам сегодняшняя погода?',
        whyThisWord: { de: 'Das Nomen eröffnet unverfänglichen Smalltalk über Sonne, Regen, Wärme oder Kälte.', en: 'This noun opens easy small talk about sun, rain, warmth, or cold.' },
      },
      placeholderCaption: { de: 'Caféterrasse nach einem Schauer, mit glänzenden Tischen und aufbrechender Wolkendecke.', en: 'A cafe terrace after a shower, with gleaming tables and clouds beginning to part.' },
      songMood: 'fresh after-rain small talk',
      visualNotes: 'Outdoor cafe after rain, sunlight emerging, neighboring guest looking skyward, weather cue clear without text.',
    }),
  },
  {
    slug: 'prinesite-schyot-bill',
    title: { de: 'Die Rechnung, bitte', en: 'The bill, please' },
    situation: {
      de: 'Du möchtest das Café verlassen; das Geschirr ist abgeräumt, aber die Rechnung liegt noch nicht auf dem Tisch.',
      en: 'You are ready to leave the cafe; the dishes are cleared, but the bill is not on the table yet.',
    },
    pedagogicalGoal: 'Mit einem höflichen Imperativ nach der Rechnung fragen.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Принесите счёт, пожалуйста.',
        baseText: { de: 'Bringen Sie bitte die Rechnung.', en: 'Please bring the bill.' },
      },
      meaning: { de: 'Eine klare und höfliche Bitte zum Abschluss des Cafébesuchs.', en: 'A clear, polite request at the end of a cafe visit.' },
      chunks: [
        { id: 'prinesite-schyot-bill-request', targetText: 'Принесите счёт,', baseText: { de: 'Bringen Sie die Rechnung,', en: 'Bring the bill,' } },
        { id: 'prinesite-schyot-bill-please', targetText: 'пожалуйста.', baseText: { de: 'bitte.', en: 'please.' } },
      ],
      lessonItems: [
        { id: 'prinesite-schyot-bill-item-bill', targetText: 'счёт', baseText: { de: 'Rechnung', en: 'bill' }, acceptedAnswers: russianAccepted('счёт') },
        { id: 'prinesite-schyot-bill-item-bring', targetText: 'принести', baseText: { de: 'bringen', en: 'to bring' }, acceptedAnswers: ['принести'] },
        { id: 'prinesite-schyot-bill-item-payment', targetText: 'оплата', baseText: { de: 'Bezahlung', en: 'payment' }, acceptedAnswers: ['оплата'] },
        { id: 'prinesite-schyot-bill-item-register', targetText: 'касса', baseText: { de: 'Kasse', en: 'register' }, acceptedAnswers: ['касса'] },
      ],
      buildChips: ['Принесите счёт,', 'пожалуйста.', 'Уберите чашки,', 'со стола.'],
      typeRecall: {
        before: 'Принесите ', answer: 'счёт', after: ', пожалуйста.',
        acceptedAnswers: russianAccepted('счёт'),
        fallbackChoices: ['счёт', 'договор', 'журнал', 'альбом'],
      },
      speakTarget: {
        baseCue: { de: 'Bringen Sie bitte die Rechnung.', en: 'Please bring the bill.' },
        targetPhrase: 'Принесите счёт, пожалуйста.',
        requiredTokens: ['Принесите', 'счёт', 'пожалуйста'],
        optionalTokens: [],
      },
      sceneCaption: {
        de: 'Der Tisch ist abgeräumt, deine Bankkarte liegt neben der geschlossenen Geldbörse, und die Bedienung schaut herüber.',
        en: 'The table is cleared, your bank card rests beside a closed wallet, and the server looks over.',
      },
      trophyWord: {
        word: 'счёт', meaning: { de: 'Rechnung', en: 'bill' },
        example: 'Принесите счёт, пожалуйста.',
        whyThisWord: { de: 'Im Restaurant bezeichnet das Nomen die Rechnung, die vor dem Bezahlen gebracht wird.', en: 'In a restaurant, this noun means the bill brought before payment.' },
      },
      placeholderCaption: { de: 'Abgeräumter Cafétisch mit Bankkarte, geschlossener Geldbörse und leerem Rechnungsfach.', en: 'A cleared cafe table with a bank card, closed wallet, and an empty bill holder.' },
      songMood: 'polished cafe farewell',
      visualNotes: 'Cleared table at late afternoon, card ready beside wallet, server at a distance, bill holder visibly empty.',
    }),
  },
]

export const RUSSIAN_A1_PRACTICAL_4_LESSONS: GuidedLessonDefinition[] = makeRussianPracticalLessons(
  GUIDED_TODAY_PATH_RUSSIAN_FOUR_METADATA,
  russianA1Practical4Inputs,
  { de: 'Du hast Russisch A1 Praxis 4 abgeschlossen.', en: 'You have completed Russian A1 Practical 4.' },
)

export const GUIDED_TODAY_PATH_RUSSIAN_FIVE_METADATA: GuidedPathMetadata = {
  id: 'russian-a1-practical-5',
  title: 'Russian A1 Practical 5',
  shortTitle: 'A1 Practical 5',
  subtitle: { de: 'Entschuldigungen, Kennenlernen und Pläne', en: 'Apologies, introductions, and plans' },
  level: 'A1',
  baseLanguage: 'German',
  targetLanguage: 'Russian',
  estimatedMinutes: 5,
}

const russianA1Practical5Inputs: RussianLessonInput[] = [
  {
    slug: 'izvinite-nebolshoe-opozdanie-late',
    title: { de: 'Entschuldigung für die Verspätung', en: 'Sorry for being late' },
    situation: {
      de: 'Eine neue Bekanntschaft wartet vor dem Café und blickt auf die Uhr, als du dich näherst.',
      en: 'A new acquaintance is waiting outside the cafe and glances at the clock as you approach.',
    },
    pedagogicalGoal: 'Eine Verspätung ohne geschlechtsspezifische Vergangenheitsform höflich benennen.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Извините за небольшое опоздание.',
        baseText: { de: 'Entschuldigen Sie die kleine Verspätung.', en: 'Sorry for the slight delay.' },
      },
      meaning: { de: 'Eine neutrale Entschuldigung, die nur das verspätete Ankommen benennt.', en: 'A neutral apology that names only the late arrival.' },
      chunks: [
        { id: 'izvinite-nebolshoe-opozdanie-late-apology', targetText: 'Извините', baseText: { de: 'Entschuldigen Sie', en: 'Excuse me' } },
        { id: 'izvinite-nebolshoe-opozdanie-late-delay', targetText: 'за небольшое опоздание.', baseText: { de: 'die kleine Verspätung.', en: 'for the slight delay.' } },
      ],
      lessonItems: [
        { id: 'izvinite-nebolshoe-opozdanie-late-item-delay', targetText: 'опоздание', baseText: { de: 'Verspätung', en: 'delay / lateness' }, acceptedAnswers: ['опоздание'] },
        { id: 'izvinite-nebolshoe-opozdanie-late-item-excuse', targetText: 'извинить', baseText: { de: 'entschuldigen / verzeihen', en: 'to excuse / forgive' }, acceptedAnswers: ['извинить'] },
        { id: 'izvinite-nebolshoe-opozdanie-late-item-small', targetText: 'небольшой', baseText: { de: 'klein / gering', en: 'small / slight' }, acceptedAnswers: ['небольшой'] },
        { id: 'izvinite-nebolshoe-opozdanie-late-item-time', targetText: 'время', baseText: { de: 'Zeit', en: 'time' }, acceptedAnswers: ['время'] },
      ],
      buildChips: ['Извините', 'за небольшое опоздание.', 'Спасибо', 'за приглашение.'],
      typeRecall: {
        before: 'Извините за небольшое ', answer: 'опоздание', after: '.',
        acceptedAnswers: russianAccepted('опоздание'),
        fallbackChoices: ['опоздание', 'расписание', 'сообщение', 'место'],
      },
      speakTarget: {
        baseCue: { de: 'Entschuldigen Sie die kleine Verspätung.', en: 'Sorry for the slight delay.' },
        targetPhrase: 'Извините за небольшое опоздание.',
        requiredTokens: ['Извините', 'небольшое', 'опоздание'],
        optionalTokens: ['за'],
      },
      sceneCaption: {
        de: 'Vor dem Eingang steht eine Person neben der Tafel mit den Öffnungszeiten; die große Uhr ist gut sichtbar.',
        en: 'A person stands beside the hours board at the entrance, with the large clock clearly visible.',
      },
      trophyWord: {
        word: 'опоздание', meaning: { de: 'Verspätung', en: 'delay / lateness' },
        example: 'Извините за опоздание.',
        whyThisWord: { de: 'Das Nomen ermöglicht eine neutrale Entschuldigung, ohne eine geschlechtsspezifische Verbform zu verwenden.', en: 'This noun enables a neutral apology without using a gendered verb form.' },
      },
      placeholderCaption: { de: 'Café-Eingang mit wartender Person, sichtbarer Wanduhr und noch geschlossener Begrüßungsgeste.', en: 'A cafe entrance with a waiting person, visible wall clock, and a greeting gesture not yet completed.' },
      songMood: 'gentle punctuality repair',
      visualNotes: 'Cafe exterior, one acquaintance waiting by the hours board, prominent clock, approach moment held before any greeting.',
    }),
  },
  {
    slug: 'vsyo-vremya-zabyvayu-forget',
    title: { de: 'Ich vergesse es immer', en: 'I keep forgetting' },
    situation: {
      de: 'Beim zweiten Treffen suchst du erneut nach dem Namen des Ortes, während die andere Person geduldig wartet.',
      en: 'At a second meeting, you search again for the name of the place while the other person waits patiently.',
    },
    pedagogicalGoal: 'Mit einer Präsensform ein wiederkehrendes Vergessen geschlechtsneutral ausdrücken.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Извините, я всё время забываю.',
        baseText: { de: 'Entschuldigen Sie, ich vergesse es immer wieder.', en: 'Sorry, I keep forgetting.' },
      },
      meaning: { de: 'Eine freundliche Erklärung für ein wiederkehrendes kleines Gedächtnisproblem.', en: 'A friendly explanation for a small recurring memory problem.' },
      chunks: [
        { id: 'vsyo-vremya-zabyvayu-forget-apology', targetText: 'Извините,', baseText: { de: 'Entschuldigen Sie,', en: 'Sorry,' } },
        { id: 'vsyo-vremya-zabyvayu-forget-frequency', targetText: 'я всё время', baseText: { de: 'ich immer wieder', en: 'I all the time' } },
        { id: 'vsyo-vremya-zabyvayu-forget-action', targetText: 'забываю.', baseText: { de: 'vergesse es.', en: 'forget.' } },
      ],
      lessonItems: [
        { id: 'vsyo-vremya-zabyvayu-forget-item-forget', targetText: 'забывать', baseText: { de: 'vergessen', en: 'to forget' }, acceptedAnswers: ['забывать'] },
        { id: 'vsyo-vremya-zabyvayu-forget-item-time', targetText: 'время', baseText: { de: 'Zeit', en: 'time' }, acceptedAnswers: ['время'] },
        { id: 'vsyo-vremya-zabyvayu-forget-item-memory', targetText: 'память', baseText: { de: 'Gedächtnis', en: 'memory' }, acceptedAnswers: ['память'] },
        { id: 'vsyo-vremya-zabyvayu-forget-item-name', targetText: 'имя', baseText: { de: 'Vorname', en: 'first name' }, acceptedAnswers: ['имя'] },
      ],
      buildChips: ['Извините,', 'я всё время', 'забываю.', 'но быстро вспоминаю.', 'я хорошо помню.'],
      typeRecall: {
        before: 'Извините, я всё время ', answer: 'забываю', after: '.',
        acceptedAnswers: russianAccepted('забываю'),
        fallbackChoices: ['забываю', 'читаю', 'покупаю', 'работаю'],
      },
      speakTarget: {
        baseCue: { de: 'Entschuldigen Sie, ich vergesse es immer wieder.', en: 'Sorry, I keep forgetting.' },
        targetPhrase: 'Извините, я всё время забываю.',
        requiredTokens: ['Извините', 'время', 'забываю'],
        optionalTokens: ['я', 'всё'],
      },
      sceneCaption: {
        de: 'Auf dem Handy ist ein Suchfeld geöffnet, während das unbeschriftete Café-Schild über euch hängt.',
        en: 'A search field is open on the phone while the unlabeled cafe sign hangs above you.',
      },
      trophyWord: {
        word: 'забывать', meaning: { de: 'vergessen', en: 'to forget' },
        example: 'Вы часто забываете имена?',
        whyThisWord: { de: 'Das Verb beschreibt im Präsens ein alltägliches Gedächtnisproblem und bleibt für den Sprecher geschlechtsneutral.', en: 'In the present tense, this verb describes an everyday memory lapse and stays gender-neutral for the speaker.' },
      },
      placeholderCaption: { de: 'Handy mit leerem Suchfeld unter einem Caféschild ohne lesbaren Namen.', en: 'A phone with an empty search field beneath a cafe sign whose name cannot be read.' },
      songMood: 'good-humored memory lapse',
      visualNotes: 'Second-meeting street corner, phone search open, patient acquaintance nearby, place name intentionally unreadable.',
    }),
  },
  {
    slug: 'kak-vas-zovut-name',
    title: { de: 'Wie heißen Sie?', en: 'What is your name?' },
    situation: {
      de: 'Bei einem kleinen Nachbarschaftstreffen stehst du einer neuen Person gegenüber und möchtest dich vorstellen.',
      en: 'At a small neighborhood gathering, you are facing someone new and want to introduce yourself.',
    },
    pedagogicalGoal: 'Mit höflichem Auftakt nach dem Namen einer neuen Bekanntschaft fragen.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Скажите, пожалуйста, как вас зовут?',
        baseText: { de: 'Darf ich fragen, wie Sie heißen?', en: 'Could you please tell me your name?' },
      },
      meaning: { de: 'Eine formelle und freundliche Namensfrage für den ersten Kontakt.', en: 'A formal, friendly name question for a first meeting.' },
      chunks: [
        { id: 'kak-vas-zovut-name-opener', targetText: 'Скажите, пожалуйста,', baseText: { de: 'Sagen Sie bitte,', en: 'Could you please tell me,' } },
        { id: 'kak-vas-zovut-name-question', targetText: 'как вас зовут?', baseText: { de: 'wie heißen Sie?', en: 'what is your name?' } },
      ],
      lessonItems: [
        { id: 'kak-vas-zovut-name-item-call', targetText: 'звать', baseText: { de: 'heißen / nennen', en: 'to call / name' }, acceptedAnswers: ['звать'] },
        { id: 'kak-vas-zovut-name-item-name', targetText: 'имя', baseText: { de: 'Vorname', en: 'first name' }, acceptedAnswers: ['имя'] },
        { id: 'kak-vas-zovut-name-item-surname', targetText: 'фамилия', baseText: { de: 'Nachname', en: 'surname' }, acceptedAnswers: ['фамилия'] },
        { id: 'kak-vas-zovut-name-item-introduce', targetText: 'представиться', baseText: { de: 'sich vorstellen', en: 'to introduce oneself' }, acceptedAnswers: ['представиться'] },
      ],
      buildChips: ['Скажите, пожалуйста,', 'как вас зовут?', 'Представьтесь, пожалуйста.', 'какая ваша фамилия?'],
      typeRecall: {
        before: 'Скажите, пожалуйста, как вас ', answer: 'зовут', after: '?',
        acceptedAnswers: russianAccepted('зовут'),
        fallbackChoices: ['зовут', 'ждут', 'видят', 'слушают'],
      },
      speakTarget: {
        baseCue: { de: 'Darf ich fragen, wie Sie heißen?', en: 'Could you please tell me your name?' },
        targetPhrase: 'Скажите, пожалуйста, как вас зовут?',
        requiredTokens: ['Скажите', 'как', 'зовут'],
        optionalTokens: ['пожалуйста', 'вас'],
      },
      sceneCaption: {
        de: 'Zwei leere Namenskarten liegen auf einem Stehtisch, und die neue Person wendet sich dir zu.',
        en: 'Two blank name cards rest on a high table as the new person turns toward you.',
      },
      trophyWord: {
        word: 'звать', meaning: { de: 'heißen / nennen', en: 'to call / name' },
        example: 'Как вас зовут?',
        whyThisWord: { de: 'Die Grundform gehört zur häufigsten höflichen Frage nach dem Namen einer Person.', en: 'The citation form belongs to the most common polite question for a person’s name.' },
      },
      placeholderCaption: { de: 'Kleines Treffen mit zwei leeren Namenskarten und einer offenen Gesprächsposition.', en: 'A small gathering with two blank name cards and an open conversational stance.' },
      songMood: 'bright introduction spark',
      visualNotes: 'Neighborhood gathering, blank name cards, two adults at respectful distance, first-introduction pause before speech.',
    }),
  },
  {
    slug: 'priyatno-poznakomitsya-meet',
    title: { de: 'Sehr erfreut', en: 'Nice to meet you' },
    situation: {
      de: 'Die andere Person nennt ihren Namen und macht eine freundliche Begrüßungsgeste; nun bist du an der Reihe.',
      en: 'The other person gives their name and makes a friendly greeting gesture; now it is your turn.',
    },
    pedagogicalGoal: 'Eine geschlechtsneutrale höfliche Kennenlernformel verwenden.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Очень приятно с вами познакомиться.',
        baseText: { de: 'Sehr erfreut, Sie kennenzulernen.', en: 'Very nice to meet you.' },
      },
      meaning: { de: 'Eine sichere formelle Reaktion direkt nach dem Austausch der Namen.', en: 'A safe formal response directly after exchanging names.' },
      chunks: [
        { id: 'priyatno-poznakomitsya-meet-pleasant', targetText: 'Очень приятно', baseText: { de: 'Sehr erfreut', en: 'Very nice' } },
        { id: 'priyatno-poznakomitsya-meet-with-you', targetText: 'с вами', baseText: { de: 'mit Ihnen', en: 'with you' } },
        { id: 'priyatno-poznakomitsya-meet-acquaint', targetText: 'познакомиться.', baseText: { de: 'bekannt zu werden.', en: 'to get acquainted.' } },
      ],
      lessonItems: [
        { id: 'priyatno-poznakomitsya-meet-item-acquaint', targetText: 'познакомиться', baseText: { de: 'sich kennenlernen', en: 'to get acquainted' }, acceptedAnswers: ['познакомиться'] },
        { id: 'priyatno-poznakomitsya-meet-item-pleasant', targetText: 'приятно', baseText: { de: 'angenehm / erfreulich', en: 'pleasant / nice' }, acceptedAnswers: ['приятно'] },
        { id: 'priyatno-poznakomitsya-meet-item-acquaintance', targetText: 'знакомство', baseText: { de: 'Kennenlernen / Bekanntschaft', en: 'introduction / acquaintance' }, acceptedAnswers: ['знакомство'] },
        { id: 'priyatno-poznakomitsya-meet-item-name', targetText: 'имя', baseText: { de: 'Vorname', en: 'first name' }, acceptedAnswers: ['имя'] },
      ],
      buildChips: ['Очень приятно', 'с вами', 'познакомиться.', 'снова встретиться.', 'поговорить позже.'],
      typeRecall: {
        before: 'Очень приятно с вами ', answer: 'познакомиться', after: '.',
        acceptedAnswers: russianAccepted('познакомиться'),
        fallbackChoices: ['познакомиться', 'поговорить', 'поработать', 'посидеть'],
      },
      speakTarget: {
        baseCue: { de: 'Sehr erfreut, Sie kennenzulernen.', en: 'Very nice to meet you.' },
        targetPhrase: 'Очень приятно с вами познакомиться.',
        requiredTokens: ['Очень', 'приятно', 'познакомиться'],
        optionalTokens: ['с', 'вами'],
      },
      sceneCaption: {
        de: 'Die neue Person hat ihre Namenskarte gerade angesteckt und wartet mit einem höflichen Nicken.',
        en: 'The new person has just pinned on their name card and waits with a courteous nod.',
      },
      trophyWord: {
        word: 'познакомиться', meaning: { de: 'sich kennenlernen', en: 'to get acquainted' },
        example: 'Можно с вами познакомиться?',
        whyThisWord: { de: 'Der Infinitiv bildet eine höfliche Kennenlernformel, die für jeden Sprecher gleich bleibt.', en: 'The infinitive forms a polite introduction phrase that stays the same for every speaker.' },
      },
      placeholderCaption: { de: 'Frisch angesteckte Namenskarte, freundliches Nicken und ruhiger Gesprächsraum.', en: 'A freshly pinned name card, friendly nod, and calm conversational space.' },
      songMood: 'warm formal acquaintance',
      visualNotes: 'Name card now visible but unreadable, courteous nod, soft social lighting, response moment held open.',
    }),
  },
  {
    slug: 'mozhno-uznat-otkuda-origin',
    title: { de: 'Woher kommen Sie?', en: 'Where are you from?' },
    situation: {
      de: 'Im Gespräch zeigt die neue Bekanntschaft auf verschiedene Orte auf einer kleinen Karte.',
      en: 'During the conversation, the new acquaintance points to several places on a small map.',
    },
    pedagogicalGoal: 'Mit einer Erlaubnisformel höflich nach der Herkunft fragen.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Можно узнать, откуда вы?',
        baseText: { de: 'Darf ich fragen, woher Sie kommen?', en: 'May I ask where you are from?' },
      },
      meaning: { de: 'Eine vorsichtige und formelle Herkunftsfrage im Kennenlerngespräch.', en: 'A gentle, formal origin question during an introduction.' },
      chunks: [
        { id: 'mozhno-uznat-otkuda-origin-permission', targetText: 'Можно узнать,', baseText: { de: 'Darf ich fragen,', en: 'May I ask,' } },
        { id: 'mozhno-uznat-otkuda-origin-question', targetText: 'откуда вы?', baseText: { de: 'woher Sie kommen?', en: 'where you are from?' } },
      ],
      lessonItems: [
        { id: 'mozhno-uznat-otkuda-origin-item-from-where', targetText: 'откуда', baseText: { de: 'woher', en: 'from where' }, acceptedAnswers: ['откуда'] },
        { id: 'mozhno-uznat-otkuda-origin-item-find-out', targetText: 'узнать', baseText: { de: 'erfahren', en: 'to find out' }, acceptedAnswers: ['узнать'] },
        { id: 'mozhno-uznat-otkuda-origin-item-city', targetText: 'город', baseText: { de: 'Stadt', en: 'city' }, acceptedAnswers: ['город'] },
        { id: 'mozhno-uznat-otkuda-origin-item-country', targetText: 'страна', baseText: { de: 'Land', en: 'country' }, acceptedAnswers: ['страна'] },
      ],
      buildChips: ['Можно узнать,', 'откуда вы?', 'где вы живёте?', 'какой ваш город?'],
      typeRecall: {
        before: 'Можно узнать, ', answer: 'откуда', after: ' вы?',
        acceptedAnswers: russianAccepted('откуда'),
        fallbackChoices: ['откуда', 'почему', 'когда', 'где'],
      },
      speakTarget: {
        baseCue: { de: 'Darf ich fragen, woher Sie kommen?', en: 'May I ask where you are from?' },
        targetPhrase: 'Можно узнать, откуда вы?',
        requiredTokens: ['Можно', 'узнать', 'откуда'],
        optionalTokens: ['вы'],
      },
      sceneCaption: {
        de: 'Auf dem Tisch liegt eine kleine Karte mit mehreren unbeschrifteten Markierungen; die andere Person zeigt darauf.',
        en: 'A small map with several unlabeled markers lies on the table as the other person points to it.',
      },
      trophyWord: {
        word: 'откуда', meaning: { de: 'woher', en: 'from where' },
        example: 'Скажите, откуда вы?',
        whyThisWord: { de: 'Das Frageadverb richtet ein Gespräch auf Herkunft, Ausgangspunkt oder Reiseweg.', en: 'This question adverb directs a conversation toward origin, starting point, or route.' },
      },
      placeholderCaption: { de: 'Kleine Karte mit mehreren neutralen Ortsmarkierungen zwischen zwei Kaffeetassen.', en: 'A small map with several neutral location markers between two coffee cups.' },
      songMood: 'curious map conversation',
      visualNotes: 'Tabletop map with unlabeled regional pins, two cups, pointing gesture and no country-specific answer revealed.',
    }),
  },
  {
    slug: 'vy-zhivyote-zdes-live',
    title: { de: 'Wohnen Sie hier?', en: 'Do you live here?' },
    situation: {
      de: 'Vom Caféfenster zeigt die neue Bekanntschaft auf Häuser im Viertel und wartet auf deine nächste Frage.',
      en: 'From the cafe window, the new acquaintance gestures toward homes in the neighborhood and waits for your next question.',
    },
    pedagogicalGoal: 'Mit einer höflichen Präsensfrage nach dem Wohnort fragen.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Вы живёте здесь?',
        baseText: { de: 'Wohnen Sie hier?', en: 'Do you live here?' },
      },
      meaning: { de: 'Eine einfache formelle Frage nach dem Bezug zum aktuellen Ort.', en: 'A simple formal question about someone’s connection to the current place.' },
      chunks: [
        { id: 'vy-zhivyote-zdes-live-person', targetText: 'Вы живёте', baseText: { de: 'Wohnen Sie', en: 'Do you live' } },
        { id: 'vy-zhivyote-zdes-live-place', targetText: 'здесь?', baseText: { de: 'hier?', en: 'here?' } },
      ],
      lessonItems: [
        { id: 'vy-zhivyote-zdes-live-item-live', targetText: 'жить', baseText: { de: 'wohnen / leben', en: 'to live' }, acceptedAnswers: ['жить'] },
        { id: 'vy-zhivyote-zdes-live-item-here', targetText: 'здесь', baseText: { de: 'hier', en: 'here' }, acceptedAnswers: ['здесь'] },
        { id: 'vy-zhivyote-zdes-live-item-home', targetText: 'дом', baseText: { de: 'Haus / Zuhause', en: 'house / home' }, acceptedAnswers: ['дом'] },
        { id: 'vy-zhivyote-zdes-live-item-district', targetText: 'район', baseText: { de: 'Stadtviertel / Bezirk', en: 'neighborhood / district' }, acceptedAnswers: ['район'] },
      ],
      buildChips: ['Вы живёте', 'здесь?', 'работаете', 'рядом?'],
      typeRecall: {
        before: 'Вы ', answer: 'живёте', after: ' здесь?',
        acceptedAnswers: russianAccepted('живёте'),
        fallbackChoices: ['живёте', 'работаете', 'учитесь', 'отдыхаете'],
      },
      speakTarget: {
        baseCue: { de: 'Wohnen Sie hier?', en: 'Do you live here?' },
        targetPhrase: 'Вы живёте здесь?',
        requiredTokens: ['Вы', 'живёте', 'здесь'],
        optionalTokens: [],
      },
      sceneCaption: {
        de: 'Durch das Fenster sieht man einen ruhigen Innenhof und mehrere Hauseingänge im selben Viertel.',
        en: 'A quiet courtyard and several residential entrances in the same neighborhood are visible through the window.',
      },
      trophyWord: {
        word: 'жить', meaning: { de: 'wohnen / leben', en: 'to live' },
        example: 'Вы давно живёте здесь?',
        whyThisWord: { de: 'Das Verb verbindet Personen mit Haus, Stadt oder Land und ist im Präsens geschlechtsneutral.', en: 'This verb connects people with a home, city, or country and is gender-neutral in the present tense.' },
      },
      placeholderCaption: { de: 'Blick aus dem Café auf Innenhof, Wohnhäuser und mehrere Hauseingänge.', en: 'A view from the cafe onto a courtyard, apartment buildings, and several entrances.' },
      songMood: 'easy neighborhood connection',
      visualNotes: 'Cafe window framing a residential courtyard, acquaintance gesturing outside, conversational pause with no location answer.',
    }),
  },
  {
    slug: 'vremya-segodnya-vecherom-free',
    title: { de: 'Zeit heute Abend?', en: 'Free tonight?' },
    situation: {
      de: 'Ihr sprecht über den Abend; die andere Person öffnet den Kalender auf dem Handy.',
      en: 'You are talking about the evening, and the other person opens the calendar on their phone.',
    },
    pedagogicalGoal: 'Mit einer Haben-Sie-Frage höflich nach freier Zeit am Abend fragen.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'У вас есть время сегодня вечером?',
        baseText: { de: 'Haben Sie heute Abend Zeit?', en: 'Do you have time this evening?' },
      },
      meaning: { de: 'Eine formelle, geschlechtsneutrale Frage vor einem spontanen Plan.', en: 'A formal, gender-neutral question before suggesting a spontaneous plan.' },
      chunks: [
        { id: 'vremya-segodnya-vecherom-free-availability', targetText: 'У вас есть время', baseText: { de: 'Haben Sie Zeit', en: 'Do you have time' } },
        { id: 'vremya-segodnya-vecherom-free-when', targetText: 'сегодня вечером?', baseText: { de: 'heute Abend?', en: 'this evening?' } },
      ],
      lessonItems: [
        { id: 'vremya-segodnya-vecherom-free-item-time', targetText: 'время', baseText: { de: 'Zeit', en: 'time' }, acceptedAnswers: ['время'] },
        { id: 'vremya-segodnya-vecherom-free-item-today', targetText: 'сегодня', baseText: { de: 'heute', en: 'today' }, acceptedAnswers: ['сегодня'] },
        { id: 'vremya-segodnya-vecherom-free-item-evening', targetText: 'вечер', baseText: { de: 'Abend', en: 'evening' }, acceptedAnswers: ['вечер'] },
        { id: 'vremya-segodnya-vecherom-free-item-plan', targetText: 'план', baseText: { de: 'Plan', en: 'plan' }, acceptedAnswers: ['план'] },
      ],
      buildChips: ['У вас есть время', 'сегодня вечером?', 'завтра утром?', 'после работы?'],
      typeRecall: {
        before: 'У вас есть ', answer: 'время', after: ' сегодня вечером?',
        acceptedAnswers: russianAccepted('время'),
        fallbackChoices: ['время', 'зеркало', 'задание', 'радио'],
      },
      speakTarget: {
        baseCue: { de: 'Haben Sie heute Abend Zeit?', en: 'Do you have time this evening?' },
        targetPhrase: 'У вас есть время сегодня вечером?',
        requiredTokens: ['есть', 'время', 'вечером'],
        optionalTokens: ['У', 'вас', 'сегодня'],
      },
      sceneCaption: {
        de: 'Auf dem Handy ist die Tagesansicht des Kalenders geöffnet; der Abendbereich liegt zwischen mehreren Terminen.',
        en: 'The phone shows the calendar’s day view, with the evening section between several appointments.',
      },
      trophyWord: {
        word: 'вечер', meaning: { de: 'Abend', en: 'evening' },
        example: 'У вас есть планы на вечер?',
        whyThisWord: { de: 'Das Zeitwort hilft bei Einladungen, Öffnungszeiten und Verabredungen nach dem Tag.', en: 'This time word helps with invitations, opening hours, and plans after the daytime.' },
      },
      placeholderCaption: { de: 'Handykalender in Tagesansicht mit markiertem, aber noch ungeklärtem Abendabschnitt.', en: 'A phone calendar in day view with the evening section marked but not yet settled.' },
      songMood: 'tentative evening invitation',
      visualNotes: 'Phone calendar between two people, evening band visible without readable event text, warm early-evening light.',
    }),
  },
  {
    slug: 'vstretimsya-vecherom-kafe-meet',
    title: { de: 'Treffen im Café', en: 'Meet at the cafe' },
    situation: {
      de: 'Nach der Frage nach der freien Zeit zeigt ihr auf ein Café auf der anderen Straßenseite.',
      en: 'After discussing availability, you both look toward a cafe across the street.',
    },
    pedagogicalGoal: 'Mit einer neutralen Wir-Frage einen Treffpunkt und eine Tageszeit vorschlagen.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Встретимся вечером в кафе?',
        baseText: { de: 'Treffen wir uns am Abend im Café?', en: 'Shall we meet at the cafe this evening?' },
      },
      meaning: { de: 'Ein kurzer, höflicher Vorschlag für Zeit und Ort eines Treffens.', en: 'A short, polite suggestion for the time and place of a meeting.' },
      chunks: [
        { id: 'vstretimsya-vecherom-kafe-meet-time', targetText: 'Встретимся вечером', baseText: { de: 'Treffen wir uns am Abend', en: 'Shall we meet this evening' } },
        { id: 'vstretimsya-vecherom-kafe-meet-place', targetText: 'в кафе?', baseText: { de: 'im Café?', en: 'at the cafe?' } },
      ],
      lessonItems: [
        { id: 'vstretimsya-vecherom-kafe-meet-item-meet', targetText: 'встретиться', baseText: { de: 'sich treffen', en: 'to meet' }, acceptedAnswers: ['встретиться'] },
        { id: 'vstretimsya-vecherom-kafe-meet-item-evening', targetText: 'вечер', baseText: { de: 'Abend', en: 'evening' }, acceptedAnswers: ['вечер'] },
        { id: 'vstretimsya-vecherom-kafe-meet-item-cafe', targetText: 'кафе', baseText: { de: 'Café', en: 'cafe' }, acceptedAnswers: ['кафе'] },
        { id: 'vstretimsya-vecherom-kafe-meet-item-plan', targetText: 'план', baseText: { de: 'Plan', en: 'plan' }, acceptedAnswers: ['план'] },
      ],
      buildChips: ['Встретимся вечером', 'в кафе?', 'Поговорим завтра', 'по телефону?'],
      typeRecall: {
        before: '', answer: 'Встретимся', after: ' вечером в кафе?',
        acceptedAnswers: russianAccepted('Встретимся'),
        fallbackChoices: ['Встретимся', 'Позвоним', 'Поужинаем', 'Погуляем'],
      },
      speakTarget: {
        baseCue: { de: 'Treffen wir uns am Abend im Café?', en: 'Shall we meet at the cafe this evening?' },
        targetPhrase: 'Встретимся вечером в кафе?',
        requiredTokens: ['Встретимся', 'вечером', 'кафе'],
        optionalTokens: ['в'],
      },
      sceneCaption: {
        de: 'Durch das Fenster ist ein ruhiges Café auf der anderen Straßenseite zu sehen; beide Handykalender liegen offen.',
        en: 'A quiet cafe is visible across the street while both phone calendars remain open.',
      },
      trophyWord: {
        word: 'встретиться', meaning: { de: 'sich treffen', en: 'to meet' },
        example: 'Вы можете встретиться после работы?',
        whyThisWord: { de: 'Das Verb macht aus einem Zeitfenster einen konkreten gemeinsamen Plan.', en: 'This verb turns an available time into a concrete shared plan.' },
      },
      placeholderCaption: { de: 'Zwei geöffnete Handykalender am Fenster mit Blick auf ein Café gegenüber.', en: 'Two open phone calendars by a window overlooking a cafe across the street.' },
      songMood: 'light evening rendezvous',
      visualNotes: 'Two calendars on the table, cafe across the street in focus, collaborative planning posture without a confirmed decision.',
    }),
  },
  {
    slug: 'mozhet-zavtra-udobnee-tomorrow',
    title: { de: 'Vielleicht morgen', en: 'Maybe tomorrow' },
    situation: {
      de: 'Im Kalender ist der heutige Abend dicht belegt, während der nächste Tag noch mehrere freie Felder zeigt.',
      en: 'The calendar is crowded this evening, while the next day still shows several open spaces.',
    },
    pedagogicalGoal: 'Mit einer vorsichtigen Vielleicht-Phrase einen anderen Tag vorschlagen.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Может быть, завтра удобнее?',
        baseText: { de: 'Vielleicht ist morgen günstiger?', en: 'Maybe tomorrow is more convenient?' },
      },
      meaning: { de: 'Ein weicher Gegenvorschlag, wenn der ursprüngliche Zeitpunkt schwierig ist.', en: 'A gentle counterproposal when the original time is difficult.' },
      chunks: [
        { id: 'mozhet-zavtra-udobnee-tomorrow-hedge', targetText: 'Может быть,', baseText: { de: 'Vielleicht', en: 'Maybe' } },
        { id: 'mozhet-zavtra-udobnee-tomorrow-suggestion', targetText: 'завтра удобнее?', baseText: { de: 'ist morgen günstiger?', en: 'is tomorrow more convenient?' } },
      ],
      lessonItems: [
        { id: 'mozhet-zavtra-udobnee-tomorrow-item-tomorrow', targetText: 'завтра', baseText: { de: 'morgen', en: 'tomorrow' }, acceptedAnswers: ['завтра'] },
        { id: 'mozhet-zavtra-udobnee-tomorrow-item-convenient', targetText: 'удобный', baseText: { de: 'günstig / bequem', en: 'convenient / comfortable' }, acceptedAnswers: ['удобный'] },
        { id: 'mozhet-zavtra-udobnee-tomorrow-item-meeting', targetText: 'встреча', baseText: { de: 'Treffen', en: 'meeting' }, acceptedAnswers: ['встреча'] },
        { id: 'mozhet-zavtra-udobnee-tomorrow-item-change', targetText: 'перенос', baseText: { de: 'Verschiebung', en: 'rescheduling' }, acceptedAnswers: ['перенос'] },
      ],
      buildChips: ['Может быть,', 'завтра удобнее?', 'Сегодня', 'слишком поздно?'],
      typeRecall: {
        before: 'Может быть, завтра ', answer: 'удобнее', after: '?',
        acceptedAnswers: russianAccepted('удобнее'),
        fallbackChoices: ['удобнее', 'дешевле', 'ближе', 'теплее'],
      },
      speakTarget: {
        baseCue: { de: 'Vielleicht ist morgen günstiger?', en: 'Maybe tomorrow is more convenient?' },
        targetPhrase: 'Может быть, завтра удобнее?',
        requiredTokens: ['Может', 'завтра', 'удобнее'],
        optionalTokens: ['быть'],
      },
      sceneCaption: {
        de: 'Auf dem Kalender sind heute mehrere Blöcke eng gestapelt; die nächste Tagesseite liegt daneben offen.',
        en: 'Several blocks are tightly stacked on today’s calendar, with the next day’s page open beside it.',
      },
      trophyWord: {
        word: 'завтра', meaning: { de: 'morgen', en: 'tomorrow' },
        example: 'Вам удобно завтра утром?',
        whyThisWord: { de: 'Das Zeitadverb verschiebt Pläne einfach auf den nächsten Tag, ohne eine Uhrzeit erklären zu müssen.', en: 'This time adverb moves plans to the next day without requiring a detailed time explanation.' },
      },
      placeholderCaption: { de: 'Dicht belegte heutige Kalenderseite neben einer offenen Seite für den nächsten Tag.', en: 'A crowded calendar page for today beside an open page for the next day.' },
      songMood: 'flexible next-day plan',
      visualNotes: 'Two-day calendar spread, today crowded and next page open, fingers hovering between dates without confirming one.',
    }),
  },
  {
    slug: 'do-vstrechi-zavtra-goodbye',
    title: { de: 'Bis morgen Abend', en: 'See you tomorrow evening' },
    situation: {
      de: 'Am Metroeingang habt ihr beide die Zeit für den nächsten Abend im Kalender geöffnet und beginnt, euch zu verabschieden.',
      en: 'At the metro entrance, both of you have the next evening open on your calendars and begin to part.',
    },
    pedagogicalGoal: 'Eine geplante Verabschiedung mit Treffensformel und Zeitangabe ausdrücken.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'До встречи завтра вечером.',
        baseText: { de: 'Bis morgen Abend.', en: 'See you tomorrow evening.' },
      },
      meaning: { de: 'Ein freundlicher Abschluss, der den vereinbarten nächsten Kontakt nennt.', en: 'A friendly close that names the next planned contact.' },
      chunks: [
        { id: 'do-vstrechi-zavtra-goodbye-farewell', targetText: 'До встречи', baseText: { de: 'Bis zum Treffen', en: 'See you' } },
        { id: 'do-vstrechi-zavtra-goodbye-time', targetText: 'завтра вечером.', baseText: { de: 'morgen Abend.', en: 'tomorrow evening.' } },
      ],
      lessonItems: [
        { id: 'do-vstrechi-zavtra-goodbye-item-meeting', targetText: 'встреча', baseText: { de: 'Treffen', en: 'meeting' }, acceptedAnswers: ['встреча'] },
        { id: 'do-vstrechi-zavtra-goodbye-item-tomorrow', targetText: 'завтра', baseText: { de: 'morgen', en: 'tomorrow' }, acceptedAnswers: ['завтра'] },
        { id: 'do-vstrechi-zavtra-goodbye-item-evening', targetText: 'вечер', baseText: { de: 'Abend', en: 'evening' }, acceptedAnswers: ['вечер'] },
        { id: 'do-vstrechi-zavtra-goodbye-item-calendar', targetText: 'календарь', baseText: { de: 'Kalender', en: 'calendar' }, acceptedAnswers: ['календарь'] },
      ],
      buildChips: ['До встречи', 'завтра вечером.', 'До звонка', 'сегодня утром.'],
      typeRecall: {
        before: 'До ', answer: 'встречи', after: ' завтра вечером.',
        acceptedAnswers: russianAccepted('встречи'),
        fallbackChoices: ['встречи', 'работы', 'станции', 'аптеки'],
      },
      speakTarget: {
        baseCue: { de: 'Bis morgen Abend.', en: 'See you tomorrow evening.' },
        targetPhrase: 'До встречи завтра вечером.',
        requiredTokens: ['встречи', 'завтра', 'вечером'],
        optionalTokens: ['До'],
      },
      sceneCaption: {
        de: 'Die Metrotreppe liegt zwischen euch; auf beiden Handys ist derselbe Abend im Kalender sichtbar.',
        en: 'The metro stairs lie between you, and the same evening is visible on both phone calendars.',
      },
      trophyWord: {
        word: 'встреча', meaning: { de: 'Treffen', en: 'meeting' },
        example: 'Вы подтверждаете встречу на завтра?',
        whyThisWord: { de: 'Das Nomen verbindet Verabredung, Kalender und die feste Abschiedsformel für ein Wiedersehen.', en: 'This noun connects plans, calendars, and the fixed farewell used before meeting again.' },
      },
      placeholderCaption: { de: 'Metroeingang mit zwei geöffneten Handykalendern und beginnender Abschiedsgeste.', en: 'A metro entrance with two open phone calendars and the start of a parting gesture.' },
      songMood: 'bright planned farewell',
      visualNotes: 'Metro entrance at dusk, matching calendar slots visible without text, two people beginning to head in different directions.',
    }),
  },
]

export const RUSSIAN_A1_PRACTICAL_5_LESSONS: GuidedLessonDefinition[] = makeRussianPracticalLessons(
  GUIDED_TODAY_PATH_RUSSIAN_FIVE_METADATA,
  russianA1Practical5Inputs,
  { de: 'Du hast Russisch A1 Praxis 5 abgeschlossen.', en: 'You have completed Russian A1 Practical 5.' },
)

export const GUIDED_TODAY_PATH_RUSSIAN_SIX_METADATA: GuidedPathMetadata = {
  id: 'russian-a1-practical-6',
  title: 'Russian A1 Practical 6',
  shortTitle: 'A1 Practical 6',
  subtitle: { de: 'Gesundheit, Apotheke und einfache Bedürfnisse', en: 'Health, pharmacy, and simple needs' },
  level: 'A1',
  baseLanguage: 'German',
  targetLanguage: 'Russian',
  estimatedMinutes: 5,
}

const russianA1Practical6Inputs: RussianLessonInput[] = [
  {
    slug: 'mne-plokho-pomogite-unwell',
    title: { de: 'Mir geht es schlecht', en: 'I feel unwell' },
    situation: {
      de: 'In einer Apotheke musst du dich auf die Bank setzen; die Person am Schalter bemerkt, dass du Unterstützung brauchst.',
      en: 'At a pharmacy, you need to sit on the bench, and the person at the counter notices that you need assistance.',
    },
    pedagogicalGoal: 'Mit einer unpersönlichen Zustandsform und höflichem Imperativ dringend um Hilfe bitten.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Мне плохо, помогите, пожалуйста.',
        baseText: { de: 'Mir geht es schlecht, helfen Sie mir bitte.', en: 'I feel unwell; please help me.' },
      },
      meaning: { de: 'Eine kurze geschlechtsneutrale Hilfsbitte bei akutem Unwohlsein.', en: 'A short gender-neutral request for help when suddenly feeling unwell.' },
      chunks: [
        { id: 'mne-plokho-pomogite-unwell-condition', targetText: 'Мне плохо,', baseText: { de: 'Mir geht es schlecht,', en: 'I feel unwell,' } },
        { id: 'mne-plokho-pomogite-unwell-help', targetText: 'помогите,', baseText: { de: 'helfen Sie mir,', en: 'help me,' } },
        { id: 'mne-plokho-pomogite-unwell-please', targetText: 'пожалуйста.', baseText: { de: 'bitte.', en: 'please.' } },
      ],
      lessonItems: [
        { id: 'mne-plokho-pomogite-unwell-item-badly', targetText: 'плохо', baseText: { de: 'schlecht / unwohl', en: 'badly / unwell' }, acceptedAnswers: ['плохо'] },
        { id: 'mne-plokho-pomogite-unwell-item-help', targetText: 'помочь', baseText: { de: 'helfen', en: 'to help' }, acceptedAnswers: ['помочь'] },
        { id: 'mne-plokho-pomogite-unwell-item-assistance', targetText: 'помощь', baseText: { de: 'Hilfe', en: 'help / assistance' }, acceptedAnswers: ['помощь'] },
        { id: 'mne-plokho-pomogite-unwell-item-weakness', targetText: 'слабость', baseText: { de: 'Schwäche', en: 'weakness' }, acceptedAnswers: ['слабость'] },
      ],
      buildChips: ['Мне плохо,', 'помогите,', 'пожалуйста.', 'Мне нужна вода,', 'позовите врача.'],
      typeRecall: {
        before: 'Мне ', answer: 'плохо', after: ', помогите, пожалуйста.',
        acceptedAnswers: russianAccepted('плохо'),
        fallbackChoices: ['плохо', 'душно', 'скучно', 'тесно'],
      },
      speakTarget: {
        baseCue: { de: 'Mir geht es schlecht, helfen Sie mir bitte.', en: 'I feel unwell; please help me.' },
        targetPhrase: 'Мне плохо, помогите, пожалуйста.',
        requiredTokens: ['плохо', 'помогите', 'пожалуйста'],
        optionalTokens: ['Мне'],
      },
      sceneCaption: {
        de: 'Du sitzt vornübergebeugt auf der Apothekenbank; hinter dem Schalter wird der Blick aufmerksam auf dich gerichtet.',
        en: 'You sit leaning forward on the pharmacy bench as the person behind the counter turns their attention toward you.',
      },
      trophyWord: {
        word: 'плохо', meaning: { de: 'schlecht / unwohl', en: 'badly / unwell' },
        example: 'Если вам плохо, позовите врача.',
        whyThisWord: { de: 'Das unpersönliche Zustandswort teilt Unwohlsein mit, ohne eine Form nach Geschlecht zu verändern.', en: 'This impersonal state word communicates illness without changing form for gender.' },
      },
      placeholderCaption: { de: 'Apothekenbank nahe dem Schalter mit Wasserspender und aufmerksamem Personal im Hintergrund.', en: 'A pharmacy bench near the counter with a water dispenser and attentive staff in the background.' },
      songMood: 'urgent but reassuring help',
      visualNotes: 'Region-neutral pharmacy interior, seated learner in visible discomfort, staff noticing, calm clear sightline to assistance.',
    }),
  },
  {
    slug: 'zdes-ryadom-apteka-nearby',
    title: { de: 'Eine Apotheke in der Nähe', en: 'A pharmacy nearby' },
    situation: {
      de: 'Auf einer unbekannten Straße brauchst du eine Apotheke, aber die Ladenschilder sind aus deiner Position nicht lesbar.',
      en: 'On an unfamiliar street, you need a pharmacy, but the shop signs are unreadable from where you stand.',
    },
    pedagogicalGoal: 'Mit zwei Ortsadverbien nach einer nahen Apotheke fragen.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Здесь рядом есть аптека?',
        baseText: { de: 'Gibt es hier in der Nähe eine Apotheke?', en: 'Is there a pharmacy nearby?' },
      },
      meaning: { de: 'Eine direkte Ortsfrage, wenn du schnell Medikamente oder Beratung brauchst.', en: 'A direct location question when you quickly need medicine or advice.' },
      chunks: [
        { id: 'zdes-ryadom-apteka-nearby-area', targetText: 'Здесь рядом', baseText: { de: 'Hier in der Nähe', en: 'Nearby here' } },
        { id: 'zdes-ryadom-apteka-nearby-place', targetText: 'есть аптека?', baseText: { de: 'gibt es eine Apotheke?', en: 'is there a pharmacy?' } },
      ],
      lessonItems: [
        { id: 'zdes-ryadom-apteka-nearby-item-nearby', targetText: 'рядом', baseText: { de: 'in der Nähe', en: 'nearby' }, acceptedAnswers: ['рядом'] },
        { id: 'zdes-ryadom-apteka-nearby-item-pharmacy', targetText: 'аптека', baseText: { de: 'Apotheke', en: 'pharmacy' }, acceptedAnswers: ['аптека'] },
        { id: 'zdes-ryadom-apteka-nearby-item-street', targetText: 'улица', baseText: { de: 'Straße', en: 'street' }, acceptedAnswers: ['улица'] },
        { id: 'zdes-ryadom-apteka-nearby-item-sign', targetText: 'вывеска', baseText: { de: 'Ladenschild', en: 'shop sign' }, acceptedAnswers: ['вывеска'] },
      ],
      buildChips: ['Здесь рядом', 'есть аптека?', 'В этом доме', 'работает врач?'],
      typeRecall: {
        before: 'Здесь рядом есть ', answer: 'аптека', after: '?',
        acceptedAnswers: russianAccepted('аптека'),
        fallbackChoices: ['аптека', 'остановка', 'столовая', 'гостиница'],
      },
      speakTarget: {
        baseCue: { de: 'Gibt es hier in der Nähe eine Apotheke?', en: 'Is there a pharmacy nearby?' },
        targetPhrase: 'Здесь рядом есть аптека?',
        requiredTokens: ['Здесь', 'рядом', 'аптека'],
        optionalTokens: ['есть'],
      },
      sceneCaption: {
        de: 'Mehrere kleine Geschäfte säumen die Straße, doch ihre entfernten Schilder sind im Gegenlicht kaum zu erkennen.',
        en: 'Several small shops line the street, but their distant signs are hard to make out in the backlight.',
      },
      trophyWord: {
        word: 'рядом', meaning: { de: 'in der Nähe', en: 'nearby' },
        example: 'Скажите, аптека рядом?',
        whyThisWord: { de: 'Das Ortsadverb macht Fragen nach schneller erreichbaren Geschäften, Haltestellen oder Diensten möglich.', en: 'This location adverb enables questions about shops, stops, or services within easy reach.' },
      },
      placeholderCaption: { de: 'Unbekannte Geschäftsstraße im Gegenlicht mit mehreren schwer lesbaren Ladenschildern.', en: 'An unfamiliar shopping street in backlight with several hard-to-read signs.' },
      songMood: 'focused nearby search',
      visualNotes: 'Generic Russian street, several storefronts, signs intentionally unreadable at distance, passerby available to ask.',
    }),
  },
  {
    slug: 'lekarstvo-ot-prostudy-medicine',
    title: { de: 'Medikament gegen Erkältung', en: 'Medicine for a cold' },
    situation: {
      de: 'Am Apothekenschalter beschreibst du knapp, was du brauchst; hinter dem Personal stehen mehrere Medikamentenregale.',
      en: 'At the pharmacy counter, you briefly state what you need, with several medicine shelves behind the staff member.',
    },
    pedagogicalGoal: 'Ein konkretes Bedürfnis mit dem festen Gegen-Beschwerden-Block ausdrücken.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Мне нужно лекарство от простуды.',
        baseText: { de: 'Ich brauche ein Medikament gegen eine Erkältung.', en: 'I need medicine for a cold.' },
      },
      meaning: { de: 'Eine neutrale Präsensphrase für einen einfachen Bedarf in der Apotheke.', en: 'A neutral present-tense phrase for a simple need at the pharmacy.' },
      chunks: [
        { id: 'lekarstvo-ot-prostudy-medicine-need', targetText: 'Мне нужно', baseText: { de: 'Ich brauche', en: 'I need' } },
        { id: 'lekarstvo-ot-prostudy-medicine-item', targetText: 'лекарство', baseText: { de: 'ein Medikament', en: 'medicine' } },
        { id: 'lekarstvo-ot-prostudy-medicine-condition', targetText: 'от простуды.', baseText: { de: 'gegen eine Erkältung.', en: 'for a cold.' } },
      ],
      lessonItems: [
        { id: 'lekarstvo-ot-prostudy-medicine-item-medicine', targetText: 'лекарство', baseText: { de: 'Medikament', en: 'medicine' }, acceptedAnswers: ['лекарство'] },
        { id: 'lekarstvo-ot-prostudy-medicine-item-cold', targetText: 'простуда', baseText: { de: 'Erkältung', en: 'cold' }, acceptedAnswers: ['простуда'] },
        { id: 'lekarstvo-ot-prostudy-medicine-item-tablet', targetText: 'таблетка', baseText: { de: 'Tablette', en: 'tablet / pill' }, acceptedAnswers: ['таблетка'] },
        { id: 'lekarstvo-ot-prostudy-medicine-item-take', targetText: 'принимать', baseText: { de: 'einnehmen', en: 'to take' }, acceptedAnswers: ['принимать'] },
      ],
      buildChips: ['Мне нужно', 'лекарство', 'от простуды.', 'Мне нужен', 'сироп от кашля.'],
      typeRecall: {
        before: 'Мне нужно ', answer: 'лекарство', after: ' от простуды.',
        acceptedAnswers: russianAccepted('лекарство'),
        fallbackChoices: ['лекарство', 'мыло', 'печенье', 'такси'],
      },
      speakTarget: {
        baseCue: { de: 'Ich brauche ein Medikament gegen eine Erkältung.', en: 'I need medicine for a cold.' },
        targetPhrase: 'Мне нужно лекарство от простуды.',
        requiredTokens: ['нужно', 'лекарство', 'простуды'],
        optionalTokens: ['Мне', 'от'],
      },
      sceneCaption: {
        de: 'Vor dir liegen ein leerer Beratungszettel und ein Korb für Einkäufe; das Personal wartet auf deine Angabe.',
        en: 'A blank consultation slip and a shopping basket sit before you as the staff member waits for your request.',
      },
      trophyWord: {
        word: 'лекарство', meaning: { de: 'Medikament', en: 'medicine' },
        example: 'Принимайте это лекарство после еды.',
        whyThisWord: { de: 'Das Nomen ist der zentrale Oberbegriff für Tabletten, Sirup und andere Mittel aus der Apotheke.', en: 'This noun is the central general term for tablets, syrup, and other pharmacy remedies.' },
      },
      placeholderCaption: { de: 'Apothekenberatung mit leerem Notizzettel, kleinem Einkaufskorb und geordneten Regalen.', en: 'A pharmacy consultation counter with a blank note, small basket, and orderly shelves.' },
      songMood: 'clear pharmacy request',
      visualNotes: 'Pharmacy consultation point, blank request slip, shelves softly out of focus, attentive staff awaiting details.',
    }),
  },
  {
    slug: 'bolit-vot-zdes-pain',
    title: { de: 'Es tut hier weh', en: 'It hurts here' },
    situation: {
      de: 'In der Apotheke zeigst du auf eine bestimmte Stelle, während das Personal nach deinem Problem fragt.',
      en: 'At the pharmacy, you point to a specific spot while the staff member asks about the problem.',
    },
    pedagogicalGoal: 'Mit Haben-Konstruktion, Präsensverb und Zeigewort einen Schmerzort angeben.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'У меня болит вот здесь.',
        baseText: { de: 'Bei mir tut es genau hier weh.', en: 'It hurts right here.' },
      },
      meaning: { de: 'Eine einfache geschlechtsneutrale Aussage zusammen mit einer Zeigegeste.', en: 'A simple gender-neutral statement paired with a pointing gesture.' },
      chunks: [
        { id: 'bolit-vot-zdes-pain-condition', targetText: 'У меня болит', baseText: { de: 'Bei mir tut es weh', en: 'It hurts for me' } },
        { id: 'bolit-vot-zdes-pain-location', targetText: 'вот здесь.', baseText: { de: 'genau hier.', en: 'right here.' } },
      ],
      lessonItems: [
        { id: 'bolit-vot-zdes-pain-item-hurt', targetText: 'болеть', baseText: { de: 'wehtun / krank sein', en: 'to hurt / be ill' }, acceptedAnswers: ['болеть'] },
        { id: 'bolit-vot-zdes-pain-item-here', targetText: 'здесь', baseText: { de: 'hier', en: 'here' }, acceptedAnswers: ['здесь'] },
        { id: 'bolit-vot-zdes-pain-item-pain', targetText: 'боль', baseText: { de: 'Schmerz', en: 'pain' }, acceptedAnswers: ['боль'] },
        { id: 'bolit-vot-zdes-pain-item-place', targetText: 'место', baseText: { de: 'Stelle / Ort', en: 'spot / place' }, acceptedAnswers: ['место'] },
      ],
      buildChips: ['У меня болит', 'вот здесь.', 'У меня чешется', 'на руке.'],
      typeRecall: {
        before: 'У меня ', answer: 'болит', after: ' вот здесь.',
        acceptedAnswers: russianAccepted('болит'),
        fallbackChoices: ['болит', 'работает', 'звучит', 'начинается'],
      },
      speakTarget: {
        baseCue: { de: 'Bei mir tut es genau hier weh.', en: 'It hurts right here.' },
        targetPhrase: 'У меня болит вот здесь.',
        requiredTokens: ['меня', 'болит', 'здесь'],
        optionalTokens: ['У', 'вот'],
      },
      sceneCaption: {
        de: 'Am Beratungsplatz liegt eine einfache Körperskizze; deine Hand zeigt auf dieselbe Stelle am eigenen Körper.',
        en: 'A simple body diagram lies at the consultation point while your hand indicates the matching spot on your body.',
      },
      trophyWord: {
        word: 'болеть', meaning: { de: 'wehtun / krank sein', en: 'to hurt / be ill' },
        example: 'Скажите, где у вас болит.',
        whyThisWord: { de: 'Das Verb beschreibt Schmerzen im Präsens und lässt sich mit einer Körperstelle oder Zeigegeste verbinden.', en: 'This verb describes pain in the present and combines with a body part or pointing gesture.' },
      },
      placeholderCaption: { de: 'Apothekentheke mit einfacher Körperskizze und deutlicher Zeigegeste auf eine einzelne Stelle.', en: 'A pharmacy counter with a simple body diagram and a clear gesture toward one spot.' },
      songMood: 'careful symptom pointing',
      visualNotes: 'Consultation counter, generic body outline, precise pointing gesture, no graphic medical detail.',
    }),
  },
  {
    slug: 'silno-bolit-golova-headache',
    title: { de: 'Starke Kopfschmerzen', en: 'A bad headache' },
    situation: {
      de: 'Das helle Licht in der Apotheke ist unangenehm, und die Person am Schalter bittet dich, das Problem genauer zu nennen.',
      en: 'The bright pharmacy light is uncomfortable, and the person at the counter asks you to name the problem more precisely.',
    },
    pedagogicalGoal: 'Eine konkrete Körperstelle und die Stärke des Schmerzes im Präsens nennen.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'У меня сильно болит голова.',
        baseText: { de: 'Ich habe starke Kopfschmerzen.', en: 'My head hurts badly.' },
      },
      meaning: { de: 'Eine direkte geschlechtsneutrale Beschreibung von Kopfschmerzen.', en: 'A direct gender-neutral description of a headache.' },
      chunks: [
        { id: 'silno-bolit-golova-headache-person', targetText: 'У меня', baseText: { de: 'Bei mir', en: 'For me' } },
        { id: 'silno-bolit-golova-headache-intensity', targetText: 'сильно болит', baseText: { de: 'tut stark weh', en: 'hurts badly' } },
        { id: 'silno-bolit-golova-headache-body', targetText: 'голова.', baseText: { de: 'der Kopf.', en: 'the head.' } },
      ],
      lessonItems: [
        { id: 'silno-bolit-golova-headache-item-head', targetText: 'голова', baseText: { de: 'Kopf', en: 'head' }, acceptedAnswers: ['голова'] },
        { id: 'silno-bolit-golova-headache-item-hurt', targetText: 'болеть', baseText: { de: 'wehtun', en: 'to hurt' }, acceptedAnswers: ['болеть'] },
        { id: 'silno-bolit-golova-headache-item-strongly', targetText: 'сильно', baseText: { de: 'stark / sehr', en: 'strongly / badly' }, acceptedAnswers: ['сильно'] },
        { id: 'silno-bolit-golova-headache-item-pain', targetText: 'боль', baseText: { de: 'Schmerz', en: 'pain' }, acceptedAnswers: ['боль'] },
      ],
      buildChips: ['У меня', 'сильно болит', 'голова.', 'болит спина.', 'нужна таблетка.'],
      typeRecall: {
        before: 'У меня сильно болит ', answer: 'голова', after: '.',
        acceptedAnswers: russianAccepted('голова'),
        fallbackChoices: ['голова', 'рука', 'нога', 'спина'],
      },
      speakTarget: {
        baseCue: { de: 'Ich habe starke Kopfschmerzen.', en: 'My head hurts badly.' },
        targetPhrase: 'У меня сильно болит голова.',
        requiredTokens: ['сильно', 'болит', 'голова'],
        optionalTokens: ['У', 'меня'],
      },
      sceneCaption: {
        de: 'Unter der hellen Deckenlampe hältst du eine Hand an die Schläfe; auf dem Tresen liegt der Beratungsblock.',
        en: 'Under the bright ceiling light, you hold one hand to your temple as the consultation pad rests on the counter.',
      },
      trophyWord: {
        word: 'голова', meaning: { de: 'Kopf', en: 'head' },
        example: 'У вас часто болит голова?',
        whyThisWord: { de: 'Das Körperwort bildet zusammen mit dem Schmerzverb die übliche einfache Aussage für Kopfschmerzen.', en: 'This body word combines with the pain verb to form the usual simple statement for a headache.' },
      },
      placeholderCaption: { de: 'Heller Apothekenbereich mit Hand an der Schläfe und offenem Beratungsblock.', en: 'A bright pharmacy area with a hand at the temple and an open consultation pad.' },
      songMood: 'hushed headache relief',
      visualNotes: 'Bright but softened pharmacy lighting, hand at temple, consultation pad ready, restrained non-dramatic discomfort.',
    }),
  },
  {
    slug: 'dayte-vody-water',
    title: { de: 'Wasser, bitte', en: 'Water, please' },
    situation: {
      de: 'Neben dem Apothekenschalter steht ein Wasserspender, doch Becher und Flasche sind hinter dem Tresen.',
      en: 'A water dispenser stands beside the pharmacy counter, but the cups and bottle are behind the counter.',
    },
    pedagogicalGoal: 'Mit einem höflichen Geben-Sie-Imperativ um etwas Wasser bitten.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Дайте воды, пожалуйста.',
        baseText: { de: 'Geben Sie mir bitte Wasser.', en: 'Please give me some water.' },
      },
      meaning: { de: 'Eine kurze höfliche Bitte um Wasser in einer gesundheitlichen Situation.', en: 'A short polite request for water in a health-related situation.' },
      chunks: [
        { id: 'dayte-vody-water-request', targetText: 'Дайте воды,', baseText: { de: 'Geben Sie mir Wasser,', en: 'Give me some water,' } },
        { id: 'dayte-vody-water-please', targetText: 'пожалуйста.', baseText: { de: 'bitte.', en: 'please.' } },
      ],
      lessonItems: [
        { id: 'dayte-vody-water-item-water', targetText: 'вода', baseText: { de: 'Wasser', en: 'water' }, acceptedAnswers: ['вода'] },
        { id: 'dayte-vody-water-item-give', targetText: 'дать', baseText: { de: 'geben', en: 'to give' }, acceptedAnswers: ['дать'] },
        { id: 'dayte-vody-water-item-glass', targetText: 'стакан', baseText: { de: 'Glas / Becher', en: 'glass / cup' }, acceptedAnswers: ['стакан'] },
        { id: 'dayte-vody-water-item-thirst', targetText: 'жажда', baseText: { de: 'Durst', en: 'thirst' }, acceptedAnswers: ['жажда'] },
      ],
      buildChips: ['Дайте воды,', 'пожалуйста.', 'Налейте чаю,', 'без сахара.'],
      typeRecall: {
        before: 'Дайте ', answer: 'воды', after: ', пожалуйста.',
        acceptedAnswers: russianAccepted('воды'),
        fallbackChoices: ['воды', 'бумаги', 'карты', 'книги'],
      },
      speakTarget: {
        baseCue: { de: 'Geben Sie mir bitte Wasser.', en: 'Please give me some water.' },
        targetPhrase: 'Дайте воды, пожалуйста.',
        requiredTokens: ['Дайте', 'воды', 'пожалуйста'],
        optionalTokens: [],
      },
      sceneCaption: {
        de: 'Der Wasserspender ist sichtbar, aber ein leerer Becher steht außerhalb deiner Reichweite hinter dem Tresen.',
        en: 'The water dispenser is visible, but an empty cup sits out of reach behind the counter.',
      },
      trophyWord: {
        word: 'вода', meaning: { de: 'Wasser', en: 'water' },
        example: 'Пейте воду маленькими глотками.',
        whyThisWord: { de: 'Das elementare Nomen ist in Café, Apotheke, Hotel und unterwegs sofort einsetzbar.', en: 'This basic noun is immediately useful in a cafe, pharmacy, hotel, or while traveling.' },
      },
      placeholderCaption: { de: 'Wasserspender am Apothekenschalter mit leerem Becher hinter der Theke.', en: 'A water dispenser at the pharmacy counter with an empty cup behind the counter.' },
      songMood: 'cool simple relief',
      visualNotes: 'Water dispenser and unreachable cup form the visual prompt, clean blue highlights, calm staff nearby.',
    }),
  },
  {
    slug: 'skazhite-zdes-vrach-doctor',
    title: { de: 'Ist ein Arzt in der Nähe?', en: 'Is a doctor nearby?' },
    situation: {
      de: 'Das Problem braucht mehr als eine Beratung in der Apotheke; am Schalter ist jedoch kein medizinischer Raum ausgeschildert.',
      en: 'The problem needs more than pharmacy advice, but there is no medical room sign at the counter.',
    },
    pedagogicalGoal: 'Mit höflichem Auftakt nach der unmittelbaren Verfügbarkeit eines Arztes fragen.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Скажите, здесь есть врач?',
        baseText: { de: 'Können Sie mir sagen, ob hier ein Arzt ist?', en: 'Could you tell me if there is a doctor here?' },
      },
      meaning: { de: 'Eine direkte Frage nach medizinischer Hilfe in erreichbarer Nähe.', en: 'A direct question about medical help within immediate reach.' },
      chunks: [
        { id: 'skazhite-zdes-vrach-doctor-opener', targetText: 'Скажите,', baseText: { de: 'Sagen Sie,', en: 'Could you tell me,' } },
        { id: 'skazhite-zdes-vrach-doctor-availability', targetText: 'здесь есть врач?', baseText: { de: 'gibt es hier einen Arzt?', en: 'is there a doctor here?' } },
      ],
      lessonItems: [
        { id: 'skazhite-zdes-vrach-doctor-item-doctor', targetText: 'врач', baseText: { de: 'Arzt / Ärztin', en: 'doctor' }, acceptedAnswers: ['врач'] },
        { id: 'skazhite-zdes-vrach-doctor-item-clinic', targetText: 'поликлиника', baseText: { de: 'Poliklinik', en: 'outpatient clinic' }, acceptedAnswers: ['поликлиника'] },
        { id: 'skazhite-zdes-vrach-doctor-item-help', targetText: 'помощь', baseText: { de: 'Hilfe', en: 'help' }, acceptedAnswers: ['помощь'] },
        { id: 'skazhite-zdes-vrach-doctor-item-exam', targetText: 'осмотр', baseText: { de: 'Untersuchung', en: 'examination' }, acceptedAnswers: ['осмотр'] },
      ],
      buildChips: ['Скажите,', 'здесь есть врач?', 'поликлиника', 'открыта сейчас?'],
      typeRecall: {
        before: 'Скажите, здесь есть ', answer: 'врач', after: '?',
        acceptedAnswers: russianAccepted('врач'),
        fallbackChoices: ['врач', 'фармацевт', 'водитель', 'официант'],
      },
      speakTarget: {
        baseCue: { de: 'Können Sie mir sagen, ob hier ein Arzt ist?', en: 'Could you tell me if there is a doctor here?' },
        targetPhrase: 'Скажите, здесь есть врач?',
        requiredTokens: ['Скажите', 'здесь', 'врач'],
        optionalTokens: ['есть'],
      },
      sceneCaption: {
        de: 'Hinter dem Apothekenschalter hängen Wegweiser zu mehreren Diensten, doch ein medizinischer Hinweis fehlt.',
        en: 'Signs behind the pharmacy counter point to several services, but there is no medical direction listed.',
      },
      trophyWord: {
        word: 'врач', meaning: { de: 'Arzt / Ärztin', en: 'doctor' },
        example: 'Спросите врача об этом лекарстве.',
        whyThisWord: { de: 'Das Nomen bezeichnet medizinisches Fachpersonal unabhängig vom Geschlecht der konkreten Person.', en: 'This noun refers to a medical professional regardless of the specific person’s gender.' },
      },
      placeholderCaption: { de: 'Apothekenschalter mit mehreren Dienstwegweisern, aber ohne erkennbare medizinische Markierung.', en: 'A pharmacy counter with several service signs but no visible medical marker.' },
      songMood: 'steady search for care',
      visualNotes: 'Pharmacy service board with several neutral icons and one obvious information gap, staff ready to direct the learner.',
    }),
  },
  {
    slug: 'allergiya-na-orekhi-allergy',
    title: { de: 'Allergie gegen Nüsse', en: 'Nut allergy' },
    situation: {
      de: 'In einem Café wird dir ein Gebäck mit unbekannter Füllung angeboten, und die Zutatenliste ist nicht sichtbar.',
      en: 'At a cafe, you are offered a pastry with an unknown filling, and the ingredient list is not visible.',
    },
    pedagogicalGoal: 'Eine Allergie mit einer neutralen Haben-Konstruktion und festem Auslöserblock nennen.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'У меня аллергия на орехи.',
        baseText: { de: 'Ich habe eine Allergie gegen Nüsse.', en: 'I have a nut allergy.' },
      },
      meaning: { de: 'Eine klare geschlechtsneutrale Sicherheitsangabe vor dem Essen.', en: 'A clear gender-neutral safety statement before eating.' },
      chunks: [
        { id: 'allergiya-na-orekhi-allergy-condition', targetText: 'У меня аллергия', baseText: { de: 'Ich habe eine Allergie', en: 'I have an allergy' } },
        { id: 'allergiya-na-orekhi-allergy-trigger', targetText: 'на орехи.', baseText: { de: 'gegen Nüsse.', en: 'to nuts.' } },
      ],
      lessonItems: [
        { id: 'allergiya-na-orekhi-allergy-item-allergy', targetText: 'аллергия', baseText: { de: 'Allergie', en: 'allergy' }, acceptedAnswers: ['аллергия'] },
        { id: 'allergiya-na-orekhi-allergy-item-nut', targetText: 'орех', baseText: { de: 'Nuss', en: 'nut' }, acceptedAnswers: ['орех'] },
        { id: 'allergiya-na-orekhi-allergy-item-product', targetText: 'продукт', baseText: { de: 'Lebensmittel / Produkt', en: 'food product / item' }, acceptedAnswers: ['продукт'] },
        { id: 'allergiya-na-orekhi-allergy-item-ingredients', targetText: 'состав', baseText: { de: 'Zusammensetzung / Zutaten', en: 'ingredients / composition' }, acceptedAnswers: ['состав'] },
      ],
      buildChips: ['У меня аллергия', 'на орехи.', 'на молоко.', 'в составе есть мёд.'],
      typeRecall: {
        before: 'У меня аллергия на ', answer: 'орехи', after: '.',
        acceptedAnswers: russianAccepted('орехи'),
        fallbackChoices: ['орехи', 'билеты', 'журналы', 'фонари'],
      },
      speakTarget: {
        baseCue: { de: 'Ich habe eine Allergie gegen Nüsse.', en: 'I have a nut allergy.' },
        targetPhrase: 'У меня аллергия на орехи.',
        requiredTokens: ['меня', 'аллергия', 'орехи'],
        optionalTokens: ['У', 'на'],
      },
      sceneCaption: {
        de: 'Die Bedienung hält ein aufgeschnittenes Gebäck mit nicht erkennbarer Füllung; daneben liegt kein Zutatenkärtchen.',
        en: 'The server holds a cut pastry with an unclear filling, and there is no ingredient card beside it.',
      },
      trophyWord: {
        word: 'аллергия', meaning: { de: 'Allergie', en: 'allergy' },
        example: 'Сообщите врачу об аллергии.',
        whyThisWord: { de: 'Das Nomen nennt eine wichtige gesundheitliche Einschränkung direkt und ohne persönliche Adjektivform.', en: 'This noun states an important health restriction directly without a personal adjective form.' },
      },
      placeholderCaption: { de: 'Aufgeschnittenes Gebäck mit unklarer Füllung und leerem Platz für eine Zutatenkarte.', en: 'A cut pastry with an unclear filling and an empty space where an ingredient card should be.' },
      songMood: 'clear food safety pause',
      visualNotes: 'Cafe counter, pastry cross-section deliberately ambiguous, missing ingredient label emphasized, server waiting before serving.',
    }),
  },
  {
    slug: 'pozovite-vracha-call',
    title: { de: 'Rufen Sie einen Arzt', en: 'Call a doctor' },
    situation: {
      de: 'Im Wartebereich wird dringend medizinische Hilfe gebraucht; eine Mitarbeiterin steht am anderen Ende des Flurs.',
      en: 'Medical help is urgently needed in the waiting area, and a staff member is standing at the other end of the hall.',
    },
    pedagogicalGoal: 'Mit einem höflichen Imperativ eine konkrete Person zur Hilfe rufen lassen.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Позовите врача сюда, пожалуйста.',
        baseText: { de: 'Rufen Sie bitte einen Arzt hierher.', en: 'Please call a doctor over here.' },
      },
      meaning: { de: 'Eine klare dringende Bitte, medizinische Hilfe an diesen Ort zu holen.', en: 'A clear urgent request to bring medical help to this spot.' },
      chunks: [
        { id: 'pozovite-vracha-call-person', targetText: 'Позовите врача', baseText: { de: 'Rufen Sie einen Arzt', en: 'Call a doctor' } },
        { id: 'pozovite-vracha-call-here', targetText: 'сюда,', baseText: { de: 'hierher,', en: 'over here,' } },
        { id: 'pozovite-vracha-call-please', targetText: 'пожалуйста.', baseText: { de: 'bitte.', en: 'please.' } },
      ],
      lessonItems: [
        { id: 'pozovite-vracha-call-item-call', targetText: 'позвать', baseText: { de: 'rufen / holen', en: 'to call / fetch' }, acceptedAnswers: ['позвать'] },
        { id: 'pozovite-vracha-call-item-doctor', targetText: 'врач', baseText: { de: 'Arzt / Ärztin', en: 'doctor' }, acceptedAnswers: ['врач'] },
        { id: 'pozovite-vracha-call-item-here', targetText: 'сюда', baseText: { de: 'hierher', en: 'over here' }, acceptedAnswers: ['сюда'] },
        { id: 'pozovite-vracha-call-item-help', targetText: 'помощь', baseText: { de: 'Hilfe', en: 'help' }, acceptedAnswers: ['помощь'] },
      ],
      buildChips: ['Позовите врача', 'сюда,', 'пожалуйста.', 'Найдите аптеку', 'рядом.'],
      typeRecall: {
        before: '', answer: 'Позовите', after: ' врача сюда, пожалуйста.',
        acceptedAnswers: russianAccepted('Позовите'),
        fallbackChoices: ['Позовите', 'Принесите', 'Запишите', 'Проверьте'],
      },
      speakTarget: {
        baseCue: { de: 'Rufen Sie bitte einen Arzt hierher.', en: 'Please call a doctor over here.' },
        targetPhrase: 'Позовите врача сюда, пожалуйста.',
        requiredTokens: ['Позовите', 'врача', 'сюда'],
        optionalTokens: ['пожалуйста'],
      },
      sceneCaption: {
        de: 'Vom Wartebereich führt ein langer Flur zum Personalpult; dort blickt eine Mitarbeiterin in eure Richtung.',
        en: 'A long corridor leads from the waiting area to the staff desk, where an employee looks in your direction.',
      },
      trophyWord: {
        word: 'позвать', meaning: { de: 'rufen / holen', en: 'to call / fetch' },
        example: 'Позовите врача, пожалуйста.',
        whyThisWord: { de: 'Das Verb fordert eine Person auf, jemanden an den aktuellen Ort zu holen.', en: 'This verb asks a person to bring someone to the current location.' },
      },
      placeholderCaption: { de: 'Langer Klinikflur zwischen Wartebereich und entferntem Personalpult.', en: 'A long clinic corridor between the waiting area and a distant staff desk.' },
      songMood: 'decisive call for care',
      visualNotes: 'Clinic or pharmacy waiting corridor, staff desk in clear sight, urgent gesture possible without depicting panic or injury.',
    }),
  },
  {
    slug: 'mne-uzhe-luchshe-better',
    title: { de: 'Mir geht es schon besser', en: 'I feel better now' },
    situation: {
      de: 'Nach einer ruhigen Pause bleibt das Personal neben der Bank stehen und prüft aufmerksam deinen Zustand.',
      en: 'After a quiet pause, the staff member remains beside the bench and checks your condition attentively.',
    },
    pedagogicalGoal: 'Eine positive Zustandsänderung mit einer unpersönlichen, geschlechtsneutralen Form ausdrücken.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Мне уже лучше, спасибо.',
        baseText: { de: 'Mir geht es schon besser, danke.', en: 'I feel better now, thank you.' },
      },
      meaning: { de: 'Eine neutrale Rückmeldung nach Hilfe, Wasser oder einer kurzen Ruhepause.', en: 'A neutral update after help, water, or a short rest.' },
      chunks: [
        { id: 'mne-uzhe-luchshe-better-condition', targetText: 'Мне уже лучше,', baseText: { de: 'Mir geht es schon besser,', en: 'I feel better now,' } },
        { id: 'mne-uzhe-luchshe-better-thanks', targetText: 'спасибо.', baseText: { de: 'danke.', en: 'thank you.' } },
      ],
      lessonItems: [
        { id: 'mne-uzhe-luchshe-better-item-better', targetText: 'лучше', baseText: { de: 'besser', en: 'better' }, acceptedAnswers: ['лучше'] },
        { id: 'mne-uzhe-luchshe-better-item-condition', targetText: 'самочувствие', baseText: { de: 'Befinden', en: 'well-being' }, acceptedAnswers: ['самочувствие'] },
        { id: 'mne-uzhe-luchshe-better-item-rest', targetText: 'отдых', baseText: { de: 'Ruhe / Erholung', en: 'rest' }, acceptedAnswers: ['отдых'] },
        { id: 'mne-uzhe-luchshe-better-item-assistance', targetText: 'помощь', baseText: { de: 'Hilfe', en: 'help' }, acceptedAnswers: ['помощь'] },
      ],
      buildChips: ['Мне уже лучше,', 'спасибо.', 'Мне всё ещё плохо,', 'нужна вода.'],
      typeRecall: {
        before: 'Мне уже ', answer: 'лучше', after: ', спасибо.',
        acceptedAnswers: russianAccepted('лучше'),
        fallbackChoices: ['лучше', 'дороже', 'длиннее', 'выше'],
      },
      speakTarget: {
        baseCue: { de: 'Mir geht es schon besser, danke.', en: 'I feel better now, thank you.' },
        targetPhrase: 'Мне уже лучше, спасибо.',
        requiredTokens: ['уже', 'лучше', 'спасибо'],
        optionalTokens: ['Мне'],
      },
      sceneCaption: {
        de: 'Ein halbvolles Wasserglas steht neben der Bank; die Mitarbeiterin wartet auf deine kurze Rückmeldung.',
        en: 'A half-full glass of water sits beside the bench as the staff member waits for your brief update.',
      },
      trophyWord: {
        word: 'лучше', meaning: { de: 'besser', en: 'better' },
        example: 'Вам уже лучше?',
        whyThisWord: { de: 'Die unveränderliche Vergleichsform meldet eine Verbesserung, ohne Geschlecht oder Person zu markieren.', en: 'This unchanging comparative reports improvement without marking gender or person.' },
      },
      placeholderCaption: { de: 'Ruhige Apothekenbank mit halbvollem Wasserglas und aufmerksam wartender Mitarbeiterin.', en: 'A quiet pharmacy bench with a half-full water glass and an attentive staff member waiting nearby.' },
      songMood: 'soft returning relief',
      visualNotes: 'Calm bench scene, half-full water glass, steady staff presence, neutral posture that invites an update without showing the answer.',
    }),
  },
]

export const RUSSIAN_A1_PRACTICAL_6_LESSONS: GuidedLessonDefinition[] = makeRussianPracticalLessons(
  GUIDED_TODAY_PATH_RUSSIAN_SIX_METADATA,
  russianA1Practical6Inputs,
  { de: 'Du hast Russisch A1 Praxis 6 abgeschlossen.', en: 'You have completed Russian A1 Practical 6.' },
)

export const GUIDED_TODAY_PATH_RUSSIAN_SEVEN_METADATA: GuidedPathMetadata = {
  id: 'russian-a1-practical-7',
  title: 'Russian A1 Practical 7',
  shortTitle: 'A1 Practical 7',
  subtitle: { de: 'Unterwegs mit Bahn und Taxi', en: 'Getting around by train and taxi' },
  level: 'A1',
  baseLanguage: 'German',
  targetLanguage: 'Russian',
  estimatedMinutes: 5,
}

const russianA1Practical7Inputs: RussianLessonInput[] = [
  {
    slug: 'tuda-obratno-round-trip',
    title: { de: 'Hin und zurück', en: 'There and back' },
    situation: {
      de: 'Am Schalter für Regionalzüge möchtest du eine Hin- und Rückfahrt statt einer einfachen Fahrt kaufen.',
      en: 'At the regional-train counter, you want a return journey rather than a one-way trip.',
    },
    pedagogicalGoal: 'Das feste Richtungspaar für eine Hin- und Rückfahrt als höfliche Schalterphrase verwenden.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Мне туда и обратно, пожалуйста.',
        baseText: { de: 'Für mich hin und zurück, bitte.', en: 'A round trip for me, please.' },
      },
      meaning: {
        de: 'Eine knappe Bitte um beide Fahrtrichtungen an einem besetzten Schalter.',
        en: 'A compact request for travel in both directions at a staffed counter.',
      },
      chunks: [
        { id: 'tuda-obratno-round-trip-journey', targetText: 'Мне туда и обратно,', baseText: { de: 'Für mich hin und zurück,', en: 'A round trip for me,' } },
        { id: 'tuda-obratno-round-trip-please', targetText: 'пожалуйста.', baseText: { de: 'bitte.', en: 'please.' } },
      ],
      lessonItems: [
        { id: 'tuda-obratno-round-trip-item-there', targetText: 'туда', baseText: { de: 'dorthin', en: 'there / outbound' }, acceptedAnswers: russianAccepted('туда') },
        { id: 'tuda-obratno-round-trip-item-back', targetText: 'обратно', baseText: { de: 'zurück', en: 'back / return' }, acceptedAnswers: russianAccepted('обратно') },
        { id: 'tuda-obratno-round-trip-item-journey', targetText: 'поездка', baseText: { de: 'Fahrt / Reise', en: 'journey / trip' }, acceptedAnswers: russianAccepted('поездка') },
        { id: 'tuda-obratno-round-trip-item-counter', targetText: 'касса', baseText: { de: 'Kasse / Fahrkartenschalter', en: 'ticket office / counter' }, acceptedAnswers: russianAccepted('касса') },
        { id: 'tuda-obratno-round-trip-item-direction', targetText: 'направление', baseText: { de: 'Richtung', en: 'direction' }, acceptedAnswers: russianAccepted('направление') },
      ],
      buildChips: ['Мне туда и обратно,', 'пожалуйста.', 'Мне только туда,', 'Касса уже закрыта.'],
      typeRecall: {
        before: 'Мне туда и ', answer: 'обратно', after: ', пожалуйста.',
        acceptedAnswers: russianAccepted('обратно'),
        fallbackChoices: ['обратно', 'медленно', 'налево', 'снаружи'],
      },
      speakTarget: {
        baseCue: { de: 'Für mich hin und zurück, bitte.', en: 'A round trip for me, please.' },
        targetPhrase: 'Мне туда и обратно, пожалуйста.',
        requiredTokens: ['Мне', 'туда', 'обратно'],
        optionalTokens: ['и', 'пожалуйста'],
      },
      sceneCaption: {
        de: 'Am Fahrkartenschalter liegen zwei Tarifkarten bereit; die Person hinter der Scheibe wartet auf deine Wahl.',
        en: 'Two fare cards lie ready at the ticket window as the clerk waits for your choice.',
      },
      trophyWord: {
        word: 'туда', meaning: { de: 'dorthin', en: 'there / outbound' },
        example: 'Вы едете туда на поезде?',
        whyThisWord: { de: 'Das Richtungsadverb benennt den Hinweg und bildet mit seinem Gegenstück eine kompakte Reiseoption.', en: 'This direction adverb names the outbound leg and pairs with its counterpart to form a compact travel option.' },
      },
      placeholderCaption: { de: 'Regionalbahnschalter mit zwei Tarifkarten und einem kleinen Streckenplan.', en: 'A regional-train counter with two fare cards and a small route map.' },
      songMood: 'bright round-trip departure',
      visualNotes: 'Region-neutral rail ticket window, outbound and return arrows on a simple fare card, clerk waiting for the traveler to choose.',
    }),
  },
  {
    slug: 'gde-vokzal-station',
    title: { de: 'Wo ist der Bahnhof?', en: 'Where is the station?' },
    situation: {
      de: 'Auf einem Platz mit mehreren Verkehrsschildern fragst du eine Passantin nach dem Bahnhof.',
      en: 'In a square with several transport signs, you ask a passerby where the railway station is.',
    },
    pedagogicalGoal: 'Mit einer höflichen Einleitung und einer Ortsfrage nach einem wichtigen Verkehrsziel fragen.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Скажите, где находится вокзал?',
        baseText: { de: 'Können Sie mir sagen, wo der Bahnhof ist?', en: 'Could you tell me where the station is?' },
      },
      meaning: {
        de: 'Eine vollständige Wegfrage nach dem Bahnhof, ohne eine Richtung vorwegzunehmen.',
        en: 'A complete directions question about the station without assuming which way it is.',
      },
      chunks: [
        { id: 'gde-vokzal-station-attention', targetText: 'Скажите,', baseText: { de: 'Sagen Sie bitte,', en: 'Could you tell me,' } },
        { id: 'gde-vokzal-station-location', targetText: 'где находится вокзал?', baseText: { de: 'wo ist der Bahnhof?', en: 'where is the station?' } },
      ],
      lessonItems: [
        { id: 'gde-vokzal-station-item-say', targetText: 'сказать', baseText: { de: 'sagen', en: 'to say / tell' }, acceptedAnswers: russianAccepted('сказать') },
        { id: 'gde-vokzal-station-item-location', targetText: 'находиться', baseText: { de: 'sich befinden', en: 'to be located' }, acceptedAnswers: russianAccepted('находиться') },
        { id: 'gde-vokzal-station-item-station', targetText: 'вокзал', baseText: { de: 'Bahnhof', en: 'railway station' }, acceptedAnswers: russianAccepted('вокзал') },
        { id: 'gde-vokzal-station-item-train', targetText: 'поезд', baseText: { de: 'Zug', en: 'train' }, acceptedAnswers: russianAccepted('поезд') },
        { id: 'gde-vokzal-station-item-square', targetText: 'площадь', baseText: { de: 'Platz', en: 'square' }, acceptedAnswers: russianAccepted('площадь') },
      ],
      buildChips: ['Скажите,', 'где находится вокзал?', 'где останавливается автобус?', 'когда открывается касса?'],
      typeRecall: {
        before: 'Скажите, где находится ', answer: 'вокзал', after: '?',
        acceptedAnswers: russianAccepted('вокзал'),
        fallbackChoices: ['вокзал', 'ресторан', 'музей', 'банк'],
      },
      speakTarget: {
        baseCue: { de: 'Können Sie mir sagen, wo der Bahnhof ist?', en: 'Could you tell me where the station is?' },
        targetPhrase: 'Скажите, где находится вокзал?',
        requiredTokens: ['Скажите', 'находится', 'вокзал'],
        optionalTokens: ['где'],
      },
      sceneCaption: {
        de: 'Auf dem großen Platz zeigen mehrere Pfeile zu Bus und Metro; eine Passantin bleibt für deine Frage stehen.',
        en: 'Several arrows in the large square point to buses and the metro as a passerby stops for your question.',
      },
      trophyWord: {
        word: 'вокзал', meaning: { de: 'Bahnhof', en: 'railway station' },
        example: 'Вы ждёте поезд на вокзале?',
        whyThisWord: { de: 'Dieses Wort bezeichnet den größeren Bahnhof mit Schaltern, Bahnsteigen und einer Wartehalle.', en: 'This word names the larger station building with ticket desks, platforms, and a waiting hall.' },
      },
      placeholderCaption: { de: 'Weiter Stadtplatz mit Verkehrspfeilen, Gepäck und einer wartenden Passantin.', en: 'A broad city square with transport arrows, luggage, and a waiting passerby.' },
      songMood: 'open city wayfinding',
      visualNotes: 'Region-neutral station district, mixed transit signs without a famous landmark, traveler holding a folded map while a passerby pauses.',
    }),
  },
  {
    slug: 'vo-skolko-otpravlenie-departure',
    title: { de: 'Wann ist die Abfahrt?', en: 'What time does the train leave?' },
    situation: {
      de: 'Am Schalter siehst du mehrere Regionalzüge auf der Anzeigetafel und fragst nach der Abfahrtszeit deiner Verbindung.',
      en: 'At the counter, you see several regional trains on the board and ask for your service’s departure time.',
    },
    pedagogicalGoal: 'Die feste Zeitfrage mit dem gebräuchlichen Bahnhofswort für Abfahrt verbinden.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Скажите, во сколько отправление?',
        baseText: { de: 'Können Sie mir sagen, wann die Abfahrt ist?', en: 'Could you tell me what time the train leaves?' },
      },
      meaning: {
        de: 'Eine kurze Schalterfrage nach dem Zeitpunkt, an dem die Reise beginnt.',
        en: 'A short counter question about the time when the journey begins.',
      },
      chunks: [
        { id: 'vo-skolko-otpravlenie-departure-attention', targetText: 'Скажите,', baseText: { de: 'Sagen Sie bitte,', en: 'Could you tell me,' } },
        { id: 'vo-skolko-otpravlenie-departure-time', targetText: 'во сколько отправление?', baseText: { de: 'wann ist die Abfahrt?', en: 'what time is departure?' } },
      ],
      lessonItems: [
        { id: 'vo-skolko-otpravlenie-departure-item-departure', targetText: 'отправление', baseText: { de: 'Abfahrt', en: 'departure' }, acceptedAnswers: russianAccepted('отправление') },
        { id: 'vo-skolko-otpravlenie-departure-item-leave', targetText: 'отправляться', baseText: { de: 'abfahren', en: 'to depart' }, acceptedAnswers: russianAccepted('отправляться') },
        { id: 'vo-skolko-otpravlenie-departure-item-schedule', targetText: 'расписание', baseText: { de: 'Fahrplan', en: 'timetable' }, acceptedAnswers: russianAccepted('расписание') },
        { id: 'vo-skolko-otpravlenie-departure-item-time', targetText: 'время', baseText: { de: 'Zeit', en: 'time' }, acceptedAnswers: russianAccepted('время') },
        { id: 'vo-skolko-otpravlenie-departure-item-train', targetText: 'поезд', baseText: { de: 'Zug', en: 'train' }, acceptedAnswers: russianAccepted('поезд') },
      ],
      buildChips: ['Скажите,', 'во сколько отправление?', 'Когда начинается посадка?', 'Где лежит багаж?'],
      typeRecall: {
        before: 'Скажите, во сколько ', answer: 'отправление', after: '?',
        acceptedAnswers: russianAccepted('отправление'),
        fallbackChoices: ['отправление', 'багаж', 'перерыв', 'касса'],
      },
      speakTarget: {
        baseCue: { de: 'Können Sie mir sagen, wann die Abfahrt ist?', en: 'Could you tell me what time the train leaves?' },
        targetPhrase: 'Скажите, во сколько отправление?',
        requiredTokens: ['Скажите', 'сколько', 'отправление'],
        optionalTokens: ['во'],
      },
      sceneCaption: {
        de: 'Die Abfahrtstafel wechselt gerade die Zeilen; die Person am Schalter blickt von der Anzeige zu dir.',
        en: 'The departure board is changing rows as the clerk looks from the display back to you.',
      },
      trophyWord: {
        word: 'отправление', meaning: { de: 'Abfahrt', en: 'departure' },
        example: 'Вы знаете время отправления?',
        whyThisWord: { de: 'Auf Fahrplänen und Anzeigen benennt dieses Nomen genau den Beginn einer Zug- oder Busfahrt.', en: 'On timetables and boards, this noun names the exact start of a train or bus journey.' },
      },
      placeholderCaption: { de: 'Bahnhofsschalter unter einer wechselnden Abfahrtstafel mit mehreren Regionalzügen.', en: 'A station counter beneath a changing departure board listing several regional trains.' },
      songMood: 'focused timetable moment',
      visualNotes: 'Rail concourse with a generic Cyrillic departure board, analog clock, and clerk ready to clarify one service.',
    }),
  },
  {
    slug: 'nuzhnaya-platforma-platform',
    title: { de: 'Der richtige Bahnsteig', en: 'The right platform' },
    situation: {
      de: 'Vor dem Einsteigen vergleichst du die Nummer am Zug mit deiner Anzeige und bittest das Personal um Bestätigung.',
      en: 'Before boarding, you compare the number on the train with your display and ask staff to confirm.',
    },
    pedagogicalGoal: 'Eine sichtbare Bahnsteigwahl mit einer kurzen höflichen Kontrollfrage absichern.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Скажите, это нужная платформа?',
        baseText: { de: 'Können Sie mir sagen, ob das der richtige Bahnsteig ist?', en: 'Could you tell me if this is the right platform?' },
      },
      meaning: {
        de: 'Eine Bestätigungsfrage, bevor du am Bahnsteig in den Zug steigst.',
        en: 'A confirmation question before you board the train at the platform.',
      },
      chunks: [
        { id: 'nuzhnaya-platforma-platform-attention', targetText: 'Скажите,', baseText: { de: 'Sagen Sie bitte,', en: 'Could you tell me,' } },
        { id: 'nuzhnaya-platforma-platform-check', targetText: 'это нужная платформа?', baseText: { de: 'ist das der richtige Bahnsteig?', en: 'is this the right platform?' } },
      ],
      lessonItems: [
        { id: 'nuzhnaya-platforma-platform-item-say', targetText: 'сказать', baseText: { de: 'sagen', en: 'to say / tell' }, acceptedAnswers: russianAccepted('сказать') },
        { id: 'nuzhnaya-platforma-platform-item-right', targetText: 'нужный', baseText: { de: 'der benötigte / richtige', en: 'the needed / right one' }, acceptedAnswers: russianAccepted('нужный') },
        { id: 'nuzhnaya-platforma-platform-item-platform', targetText: 'платформа', baseText: { de: 'Bahnsteig / Plattform', en: 'platform' }, acceptedAnswers: russianAccepted('платформа') },
        { id: 'nuzhnaya-platforma-platform-item-train', targetText: 'поезд', baseText: { de: 'Zug', en: 'train' }, acceptedAnswers: russianAccepted('поезд') },
        { id: 'nuzhnaya-platforma-platform-item-boarding', targetText: 'посадка', baseText: { de: 'Einstieg / Einsteigen', en: 'boarding' }, acceptedAnswers: russianAccepted('посадка') },
      ],
      buildChips: ['Скажите,', 'это нужная платформа?', 'где находится выход?', 'когда приходит поезд?'],
      typeRecall: {
        before: 'Скажите, это ', answer: 'нужная', after: ' платформа?',
        acceptedAnswers: russianAccepted('нужная'),
        fallbackChoices: ['нужная', 'свободная', 'закрытая', 'дальняя'],
      },
      speakTarget: {
        baseCue: { de: 'Können Sie mir sagen, ob das der richtige Bahnsteig ist?', en: 'Could you tell me if this is the right platform?' },
        targetPhrase: 'Скажите, это нужная платформа?',
        requiredTokens: ['Скажите', 'нужная', 'платформа'],
        optionalTokens: ['это'],
      },
      sceneCaption: {
        de: 'Ein Zug wartet unter einer schwer lesbaren Nummer; eine Mitarbeiterin steht neben der geöffneten Tür.',
        en: 'A train waits beneath a hard-to-read number while a staff member stands beside the open door.',
      },
      trophyWord: {
        word: 'платформа', meaning: { de: 'Bahnsteig / Plattform', en: 'platform' },
        example: 'Вы ждёте поезд на платформе?',
        whyThisWord: { de: 'Dieses Wort steht auf Bahnhofsschildern und führt dich zum konkreten Ort des Einstiegs.', en: 'This word appears on station signs and leads you to the specific place where boarding happens.' },
      },
      placeholderCaption: { de: 'Regionalzug mit geöffneter Tür, Bahnsteignummer und wartender Mitarbeiterin.', en: 'A regional train with an open door, platform number, and waiting staff member.' },
      songMood: 'careful boarding check',
      visualNotes: 'Generic railway platform, readable train number but partially obscured platform sign, staff available before boarding.',
    }),
  },
  {
    slug: 'nuzhno-taksi-taxi',
    title: { de: 'Ein Taxi, bitte', en: 'A taxi, please' },
    situation: {
      de: 'Nach der Ankunft stehst du mit schwerem Gepäck am Bahnhof und bittest am Serviceschalter um ein Taxi.',
      en: 'After arriving, you stand with heavy luggage at the station and ask the service desk for a taxi.',
    },
    pedagogicalGoal: 'Mit einer unpersönlichen neutralen Form einen konkreten Transportbedarf höflich nennen.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Мне нужно такси, пожалуйста.',
        baseText: { de: 'Ich brauche ein Taxi, bitte.', en: 'I need a taxi, please.' },
      },
      meaning: {
        de: 'Eine direkte, geschlechtsneutrale Bitte um Weiterfahrt vom Bahnhof.',
        en: 'A direct, gender-neutral request for onward transport from the station.',
      },
      chunks: [
        { id: 'nuzhno-taksi-taxi-need', targetText: 'Мне нужно такси,', baseText: { de: 'Ich brauche ein Taxi,', en: 'I need a taxi,' } },
        { id: 'nuzhno-taksi-taxi-please', targetText: 'пожалуйста.', baseText: { de: 'bitte.', en: 'please.' } },
      ],
      lessonItems: [
        { id: 'nuzhno-taksi-taxi-item-taxi', targetText: 'такси', baseText: { de: 'Taxi', en: 'taxi' }, acceptedAnswers: russianAccepted('такси') },
        { id: 'nuzhno-taksi-taxi-item-need', targetText: 'нужно', baseText: { de: 'nötig / ich brauche', en: 'needed / I need' }, acceptedAnswers: russianAccepted('нужно') },
        { id: 'nuzhno-taksi-taxi-item-call', targetText: 'вызвать', baseText: { de: 'rufen / bestellen', en: 'to call / order' }, acceptedAnswers: russianAccepted('вызвать') },
        { id: 'nuzhno-taksi-taxi-item-driver', targetText: 'водитель', baseText: { de: 'Fahrperson', en: 'driver' }, acceptedAnswers: russianAccepted('водитель') },
        { id: 'nuzhno-taksi-taxi-item-ride', targetText: 'поездка', baseText: { de: 'Fahrt', en: 'ride / trip' }, acceptedAnswers: russianAccepted('поездка') },
      ],
      buildChips: ['Мне нужно такси,', 'пожалуйста.', 'Где стоит автобус?', 'Метро сейчас работает?'],
      typeRecall: {
        before: 'Мне нужно ', answer: 'такси', after: ', пожалуйста.',
        acceptedAnswers: russianAccepted('такси'),
        fallbackChoices: ['такси', 'меню', 'лекарство', 'одеяло'],
      },
      speakTarget: {
        baseCue: { de: 'Ich brauche ein Taxi, bitte.', en: 'I need a taxi, please.' },
        targetPhrase: 'Мне нужно такси, пожалуйста.',
        requiredTokens: ['Мне', 'нужно', 'такси'],
        optionalTokens: ['пожалуйста'],
      },
      sceneCaption: {
        de: 'Neben deinem Koffer stehen Wegweiser zu Bus und Metro; am Serviceschalter wartet jemand auf deine Bitte.',
        en: 'Signs for buses and the metro stand beside your suitcase as someone at the service desk waits for your request.',
      },
      trophyWord: {
        word: 'такси', meaning: { de: 'Taxi', en: 'taxi' },
        example: 'Вы можете вызвать такси?',
        whyThisWord: { de: 'Das unveränderliche Lehnwort ist an Bahnhöfen, Hotels und Flughäfen sofort einsetzbar.', en: 'This unchanging loanword is immediately useful at stations, hotels, and airports.' },
      },
      placeholderCaption: { de: 'Bahnhofsservice mit großem Koffer, Verkehrspfeilen und einem freien Schalter.', en: 'A station service area with a large suitcase, transport arrows, and an open counter.' },
      songMood: 'easy onward connection',
      visualNotes: 'Station service desk, rolling suitcase, clear taxi pictogram among several onward-travel options, attentive staff posture.',
    }),
  },
  {
    slug: 'otvezite-vokzal-station-ride',
    title: { de: 'Zum Bahnhof, bitte', en: 'To the station, please' },
    situation: {
      de: 'Im Taxi nennst du der Fahrperson dein Ziel und bittest um die Fahrt zum Bahnhof.',
      en: 'Inside a taxi, you name your destination and ask the driver to take you to the station.',
    },
    pedagogicalGoal: 'Eine höfliche Beförderungsbitte mit Zielangabe als feste Taxiphrase sprechen.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Отвезите меня на вокзал, пожалуйста.',
        baseText: { de: 'Bringen Sie mich zum Bahnhof, bitte.', en: 'Take me to the station, please.' },
      },
      meaning: {
        de: 'Eine klare Zielangabe direkt nach dem Einsteigen ins Taxi.',
        en: 'A clear destination request immediately after getting into a taxi.',
      },
      chunks: [
        { id: 'otvezite-vokzal-station-ride-request', targetText: 'Отвезите меня', baseText: { de: 'Bringen Sie mich', en: 'Take me' } },
        { id: 'otvezite-vokzal-station-ride-destination', targetText: 'на вокзал,', baseText: { de: 'zum Bahnhof,', en: 'to the station,' } },
        { id: 'otvezite-vokzal-station-ride-please', targetText: 'пожалуйста.', baseText: { de: 'bitte.', en: 'please.' } },
      ],
      lessonItems: [
        { id: 'otvezite-vokzal-station-ride-item-take', targetText: 'отвезти', baseText: { de: 'hinbringen / fahren', en: 'to take / drive' }, acceptedAnswers: russianAccepted('отвезти') },
        { id: 'otvezite-vokzal-station-ride-item-station', targetText: 'вокзал', baseText: { de: 'Bahnhof', en: 'railway station' }, acceptedAnswers: russianAccepted('вокзал') },
        { id: 'otvezite-vokzal-station-ride-item-driver', targetText: 'водитель', baseText: { de: 'Fahrperson', en: 'driver' }, acceptedAnswers: russianAccepted('водитель') },
        { id: 'otvezite-vokzal-station-ride-item-route', targetText: 'маршрут', baseText: { de: 'Route', en: 'route' }, acceptedAnswers: russianAccepted('маршрут') },
        { id: 'otvezite-vokzal-station-ride-item-luggage', targetText: 'багаж', baseText: { de: 'Gepäck', en: 'luggage' }, acceptedAnswers: russianAccepted('багаж') },
      ],
      buildChips: ['Отвезите меня', 'на вокзал,', 'пожалуйста.', 'Покажите дорогу.', 'Подождите у входа.'],
      typeRecall: {
        before: '', answer: 'Отвезите', after: ' меня на вокзал, пожалуйста.',
        acceptedAnswers: russianAccepted('Отвезите'),
        fallbackChoices: ['Отвезите', 'Запишите', 'Закройте', 'Проверьте'],
      },
      speakTarget: {
        baseCue: { de: 'Bringen Sie mich zum Bahnhof, bitte.', en: 'Take me to the station, please.' },
        targetPhrase: 'Отвезите меня на вокзал, пожалуйста.',
        requiredTokens: ['Отвезите', 'меня', 'вокзал'],
        optionalTokens: ['на', 'пожалуйста'],
      },
      sceneCaption: {
        de: 'Das Taxi steht noch am Bordstein; die Fahrperson hat die Kartenansicht geöffnet und wartet auf dein Ziel.',
        en: 'The taxi is still at the curb; the driver has opened the map view and waits for your destination.',
      },
      trophyWord: {
        word: 'отвезти', meaning: { de: 'hinbringen / hinfahren', en: 'to take / drive somewhere' },
        example: 'Отвезите меня к гостинице, пожалуйста.',
        whyThisWord: { de: 'Dieses Bewegungsverb richtet eine höfliche Bitte an die Fahrperson und enthält bereits die Idee des Transports.', en: 'This motion verb addresses a driver politely and already carries the idea of transport to a destination.' },
      },
      placeholderCaption: { de: 'Taxi am Bordstein mit geöffneter Kartenansicht und Gepäck im Fußraum.', en: 'A taxi at the curb with an open map view and luggage in the footwell.' },
      songMood: 'confident taxi destination',
      visualNotes: 'Clean taxi interior, generic map without named city, driver waiting before moving, station pictogram visible among destinations.',
    }),
  },
  {
    slug: 'ostanovite-zdes-stop-here',
    title: { de: 'Bitte hier anhalten', en: 'Stop here, please' },
    situation: {
      de: 'Im Taxi erkennst du den Eingang deines Ziels und bittest die Fahrperson, dort anzuhalten.',
      en: 'From the taxi, you recognize the entrance to your destination and ask the driver to stop there.',
    },
    pedagogicalGoal: 'Eine höfliche Imperativform mit einer genauen Ortsangabe für die Taxifahrt kombinieren.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Остановите здесь, пожалуйста.',
        baseText: { de: 'Halten Sie hier, bitte.', en: 'Stop here, please.' },
      },
      meaning: {
        de: 'Eine kurze Bitte an die Fahrperson, sobald der gewünschte Haltepunkt sichtbar ist.',
        en: 'A short request to the driver once the desired stopping point is visible.',
      },
      chunks: [
        { id: 'ostanovite-zdes-stop-here-request', targetText: 'Остановите здесь,', baseText: { de: 'Halten Sie hier,', en: 'Stop here,' } },
        { id: 'ostanovite-zdes-stop-here-please', targetText: 'пожалуйста.', baseText: { de: 'bitte.', en: 'please.' } },
      ],
      lessonItems: [
        { id: 'ostanovite-zdes-stop-here-item-stop', targetText: 'остановить', baseText: { de: 'anhalten', en: 'to stop' }, acceptedAnswers: russianAccepted('остановить') },
        { id: 'ostanovite-zdes-stop-here-item-here', targetText: 'здесь', baseText: { de: 'hier', en: 'here' }, acceptedAnswers: russianAccepted('здесь') },
        { id: 'ostanovite-zdes-stop-here-item-driver', targetText: 'водитель', baseText: { de: 'Fahrperson', en: 'driver' }, acceptedAnswers: russianAccepted('водитель') },
        { id: 'ostanovite-zdes-stop-here-item-place', targetText: 'место', baseText: { de: 'Ort / Stelle', en: 'place / spot' }, acceptedAnswers: russianAccepted('место') },
        { id: 'ostanovite-zdes-stop-here-item-exit', targetText: 'выход', baseText: { de: 'Ausgang', en: 'exit' }, acceptedAnswers: russianAccepted('выход') },
      ],
      buildChips: ['Остановите здесь,', 'пожалуйста.', 'Проезжайте дальше.', 'Поверните налево.'],
      typeRecall: {
        before: '', answer: 'Остановите', after: ' здесь, пожалуйста.',
        acceptedAnswers: russianAccepted('Остановите'),
        fallbackChoices: ['Остановите', 'Продолжайте', 'Запишите', 'Покажите'],
      },
      speakTarget: {
        baseCue: { de: 'Halten Sie hier, bitte.', en: 'Stop here, please.' },
        targetPhrase: 'Остановите здесь, пожалуйста.',
        requiredTokens: ['Остановите', 'здесь', 'пожалуйста'],
        optionalTokens: [],
      },
      sceneCaption: {
        de: 'Durch das Taxifenster kommt ein markanter Hauseingang näher; die Fahrperson blickt kurz in den Spiegel.',
        en: 'A distinctive building entrance approaches through the taxi window as the driver glances at the mirror.',
      },
      trophyWord: {
        word: 'остановить', meaning: { de: 'anhalten', en: 'to stop' },
        example: 'Остановите у входа, пожалуйста.',
        whyThisWord: { de: 'Das Verb gibt der Fahrperson eine klare, höfliche Handlungsanweisung am gewünschten Ort.', en: 'This verb gives the driver a clear, polite action request at the desired place.' },
      },
      placeholderCaption: { de: 'Blick aus einem Taxi auf einen näher kommenden Hauseingang und den Rückspiegel.', en: 'A taxi-window view of an approaching entrance and the rear-view mirror.' },
      songMood: 'clear curbside arrival',
      visualNotes: 'Moving taxi at low speed, recognizable generic entrance approaching, driver checking the mirror before a possible stop.',
    }),
  },
  {
    slug: 'edu-v-tsentr-destination',
    title: { de: 'Ich fahre ins Zentrum', en: 'I am going downtown' },
    situation: {
      de: 'In einer Kleinbuslinie fragt die Fahrperson nach deinem Ziel, bevor du bezahlst.',
      en: 'In a minibus, the driver asks for your destination before you pay.',
    },
    pedagogicalGoal: 'Mit dem Präsens eines Bewegungsverbs und einer festen Zielangabe die aktuelle Fahrt benennen.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Я еду в центр.',
        baseText: { de: 'Ich fahre ins Zentrum.', en: 'I am going downtown.' },
      },
      meaning: {
        de: 'Eine neutrale Zielangabe für eine laufende Fahrt mit Bus, Taxi oder Bahn.',
        en: 'A neutral destination statement for a journey already underway by bus, taxi, or train.',
      },
      chunks: [
        { id: 'edu-v-tsentr-destination-motion', targetText: 'Я еду', baseText: { de: 'Ich fahre', en: 'I am going' } },
        { id: 'edu-v-tsentr-destination-center', targetText: 'в центр.', baseText: { de: 'ins Zentrum.', en: 'downtown.' } },
      ],
      lessonItems: [
        { id: 'edu-v-tsentr-destination-item-go', targetText: 'ехать', baseText: { de: 'fahren', en: 'to go by transport' }, acceptedAnswers: russianAccepted('ехать') },
        { id: 'edu-v-tsentr-destination-item-center', targetText: 'центр', baseText: { de: 'Zentrum / Innenstadt', en: 'center / downtown' }, acceptedAnswers: russianAccepted('центр') },
        { id: 'edu-v-tsentr-destination-item-route', targetText: 'маршрут', baseText: { de: 'Route / Linie', en: 'route' }, acceptedAnswers: russianAccepted('маршрут') },
        { id: 'edu-v-tsentr-destination-item-city', targetText: 'город', baseText: { de: 'Stadt', en: 'city' }, acceptedAnswers: russianAccepted('город') },
        { id: 'edu-v-tsentr-destination-item-direction', targetText: 'направление', baseText: { de: 'Richtung', en: 'direction' }, acceptedAnswers: russianAccepted('направление') },
      ],
      buildChips: ['Я еду', 'в центр.', 'Я жду у входа.', 'Автобус идёт в парк.'],
      typeRecall: {
        before: 'Я еду в ', answer: 'центр', after: '.',
        acceptedAnswers: russianAccepted('центр'),
        fallbackChoices: ['центр', 'музей', 'парк', 'театр'],
      },
      speakTarget: {
        baseCue: { de: 'Ich fahre ins Zentrum.', en: 'I am going downtown.' },
        targetPhrase: 'Я еду в центр.',
        requiredTokens: ['Я', 'еду', 'центр'],
        optionalTokens: ['в'],
      },
      sceneCaption: {
        de: 'Die Fahrperson wartet vor dem Bezahlen auf eine Zielangabe; auf deinem Handy ist eine Route geöffnet.',
        en: 'The driver waits for a destination before taking payment; a route is open on your phone.',
      },
      trophyWord: {
        word: 'центр', meaning: { de: 'Zentrum / Innenstadt', en: 'center / downtown' },
        example: 'Вы едете в центр?',
        whyThisWord: { de: 'Dieses häufige Ortswort benennt in praktisch jeder Stadt den zentralen Bezirk.', en: 'This common place word names the central district in almost any city.' },
      },
      placeholderCaption: { de: 'Innenraum eines Kleinbusses mit Fahrpreisbox und geöffneter Routenansicht auf dem Handy.', en: 'A minibus interior with a fare box and an open route view on a phone.' },
      songMood: 'steady citybound ride',
      visualNotes: 'Region-neutral minibus interior, route phone in hand, driver waiting at the fare point, no named destination on signs.',
    }),
  },
  {
    slug: 'skolko-vremeni-doroga-duration',
    title: { de: 'Wie lange dauert die Fahrt?', en: 'How long does the journey take?' },
    situation: {
      de: 'Vor einer längeren Taxifahrt möchtest du einschätzen, wie viel Zeit der Weg braucht.',
      en: 'Before a longer taxi ride, you want to estimate how much time the journey will take.',
    },
    pedagogicalGoal: 'Mit einem Zeitmengenwort und einem neutralen Präsensverb nach der Fahrtdauer fragen.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Сколько времени занимает дорога?',
        baseText: { de: 'Wie lange dauert die Fahrt?', en: 'How long does the journey take?' },
      },
      meaning: {
        de: 'Eine praktische Frage nach der Dauer eines Weges, bevor die Fahrt beginnt.',
        en: 'A practical question about journey duration before the ride begins.',
      },
      chunks: [
        { id: 'skolko-vremeni-doroga-duration-amount', targetText: 'Сколько времени', baseText: { de: 'Wie viel Zeit', en: 'How much time' } },
        { id: 'skolko-vremeni-doroga-duration-road', targetText: 'занимает дорога?', baseText: { de: 'dauert die Fahrt?', en: 'does the journey take?' } },
      ],
      lessonItems: [
        { id: 'skolko-vremeni-doroga-duration-item-time', targetText: 'время', baseText: { de: 'Zeit', en: 'time' }, acceptedAnswers: russianAccepted('время') },
        { id: 'skolko-vremeni-doroga-duration-item-take', targetText: 'занимать', baseText: { de: 'dauern / beanspruchen', en: 'to take / occupy' }, acceptedAnswers: russianAccepted('занимать') },
        { id: 'skolko-vremeni-doroga-duration-item-road', targetText: 'дорога', baseText: { de: 'Weg / Fahrt', en: 'road / journey' }, acceptedAnswers: russianAccepted('дорога') },
        { id: 'skolko-vremeni-doroga-duration-item-long', targetText: 'долго', baseText: { de: 'lange', en: 'for a long time' }, acceptedAnswers: russianAccepted('долго') },
        { id: 'skolko-vremeni-doroga-duration-item-route', targetText: 'маршрут', baseText: { de: 'Route', en: 'route' }, acceptedAnswers: russianAccepted('маршрут') },
      ],
      buildChips: ['Сколько времени', 'занимает дорога?', 'Когда приходит поезд?', 'Где начинается маршрут?'],
      typeRecall: {
        before: 'Сколько времени ', answer: 'занимает', after: ' дорога?',
        acceptedAnswers: russianAccepted('занимает'),
        fallbackChoices: ['занимает', 'начинает', 'показывает', 'закрывает'],
      },
      speakTarget: {
        baseCue: { de: 'Wie lange dauert die Fahrt?', en: 'How long does the journey take?' },
        targetPhrase: 'Сколько времени занимает дорога?',
        requiredTokens: ['Сколько', 'занимает', 'дорога'],
        optionalTokens: ['времени'],
      },
      sceneCaption: {
        de: 'Die Fahrperson zeigt auf eine längere Strecke in der Kartenansicht; neben dir liegt eine gut sichtbare Uhr.',
        en: 'The driver points to a longer route on the map while a clearly visible clock sits beside you.',
      },
      trophyWord: {
        word: 'дорога', meaning: { de: 'Weg / Fahrt', en: 'road / journey' },
        example: 'Вы хорошо знаете эту дорогу?',
        whyThisWord: { de: 'Das Nomen kann sowohl die Straße als auch den gesamten Weg von einem Ort zum anderen bezeichnen.', en: 'This noun can name both the road itself and the whole journey from one place to another.' },
      },
      placeholderCaption: { de: 'Taxikarte mit längerer Route, sichtbarer Uhr und wartender Fahrperson.', en: 'A taxi map with a longer route, a visible clock, and a waiting driver.' },
      songMood: 'curious journey timing',
      visualNotes: 'Taxi dashboard with a long but unnamed route, visible clock, driver pointing before departure rather than displaying a duration.',
    }),
  },
  {
    slug: 'zdes-moya-ostanovka-my-stop',
    title: { de: 'Hier ist meine Haltestelle', en: 'This is my stop' },
    situation: {
      de: 'Im Bus erkennst du deinen Ausstieg und gibst der Person neben dir eine kurze Rückmeldung, bevor du aufstehst.',
      en: 'On the bus, you recognize where you need to get off and briefly tell the person beside you before standing.',
    },
    pedagogicalGoal: 'Mit einer neutralen Ortsangabe den eigenen Ausstieg im aktuellen Moment benennen.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Извините, здесь моя остановка.',
        baseText: { de: 'Entschuldigen Sie, hier ist meine Haltestelle.', en: 'Excuse me, this is my stop.' },
      },
      meaning: {
        de: 'Eine kurze Ankündigung, wenn du im Bus oder Kleinbus aussteigen möchtest.',
        en: 'A short announcement when you need to get off a bus or minibus.',
      },
      chunks: [
        { id: 'zdes-moya-ostanovka-my-stop-excuse', targetText: 'Извините,', baseText: { de: 'Entschuldigen Sie,', en: 'Excuse me,' } },
        { id: 'zdes-moya-ostanovka-my-stop-location', targetText: 'здесь моя остановка.', baseText: { de: 'hier ist meine Haltestelle.', en: 'this is my stop.' } },
      ],
      lessonItems: [
        { id: 'zdes-moya-ostanovka-my-stop-item-here', targetText: 'здесь', baseText: { de: 'hier', en: 'here' }, acceptedAnswers: russianAccepted('здесь') },
        { id: 'zdes-moya-ostanovka-my-stop-item-stop', targetText: 'остановка', baseText: { de: 'Haltestelle', en: 'stop' }, acceptedAnswers: russianAccepted('остановка') },
        { id: 'zdes-moya-ostanovka-my-stop-item-exit', targetText: 'выходить', baseText: { de: 'aussteigen / hinausgehen', en: 'to get off / go out' }, acceptedAnswers: russianAccepted('выходить') },
        { id: 'zdes-moya-ostanovka-my-stop-item-bus', targetText: 'автобус', baseText: { de: 'Bus', en: 'bus' }, acceptedAnswers: russianAccepted('автобус') },
        { id: 'zdes-moya-ostanovka-my-stop-item-thank', targetText: 'благодарить', baseText: { de: 'danken', en: 'to thank' }, acceptedAnswers: russianAccepted('благодарить') },
      ],
      buildChips: ['Извините,', 'здесь моя остановка.', 'Дверь уже открыта.', 'Поезд идёт дальше.'],
      typeRecall: {
        before: 'Извините, здесь моя ', answer: 'остановка', after: '.',
        acceptedAnswers: russianAccepted('остановка'),
        fallbackChoices: ['остановка', 'платформа', 'гостиница', 'аптека'],
      },
      speakTarget: {
        baseCue: { de: 'Entschuldigen Sie, hier ist meine Haltestelle.', en: 'Excuse me, this is my stop.' },
        targetPhrase: 'Извините, здесь моя остановка.',
        requiredTokens: ['здесь', 'моя', 'остановка'],
        optionalTokens: ['Извините'],
      },
      sceneCaption: {
        de: 'Der Bus wird langsamer, die Türen liegen vor dir, und die Person am Gang wartet auf deine kurze Bemerkung.',
        en: 'The bus slows, the doors are ahead of you, and the person in the aisle waits for your brief remark.',
      },
      trophyWord: {
        word: 'здесь', meaning: { de: 'hier', en: 'here' },
        example: 'Вы можете подождать здесь?',
        whyThisWord: { de: 'Das Ortsadverb markiert den aktuellen Platz und ist beim Fahren, Warten und Treffen vielseitig einsetzbar.', en: 'This place adverb marks the current location and works across travel, waiting, and meeting situations.' },
      },
      placeholderCaption: { de: 'Langsamer Bus vor einer Haltebucht, freie Türen und eine Person am Gang.', en: 'A slowing bus at a pull-in, clear doors, and a person in the aisle.' },
      songMood: 'gentle arrival signal',
      visualNotes: 'Bus interior approaching a generic stop, aisle partly occupied, doors in view, no sign revealing the learner phrase.',
    }),
  },
]

export const RUSSIAN_A1_PRACTICAL_7_LESSONS: GuidedLessonDefinition[] = makeRussianPracticalLessons(
  GUIDED_TODAY_PATH_RUSSIAN_SEVEN_METADATA,
  russianA1Practical7Inputs,
  { de: 'Du hast Russisch A1 Praxis 7 abgeschlossen.', en: 'You have completed Russian A1 Practical 7.' },
)

export const GUIDED_TODAY_PATH_RUSSIAN_EIGHT_METADATA: GuidedPathMetadata = {
  id: 'russian-a1-practical-8',
  title: 'Russian A1 Practical 8',
  shortTitle: 'A1 Practical 8',
  subtitle: { de: 'Hotelzimmer und Wünsche als Gast', en: 'Hotel rooms and guest needs' },
  level: 'A1',
  baseLanguage: 'German',
  targetLanguage: 'Russian',
  estimatedMinutes: 5,
}

const russianA1Practical8Inputs: RussianLessonInput[] = [
  {
    slug: 'u-menya-bronirovanie-booking',
    title: { de: 'Eine Buchung im Hotel', en: 'A hotel booking' },
    situation: {
      de: 'Bei der Ankunft öffnet die Person an der Rezeption die Gästeliste und wartet auf deine Angaben.',
      en: 'When you arrive, the receptionist opens the guest list and waits for your details.',
    },
    pedagogicalGoal: 'Mit einer neutralen Besitzkonstruktion eine bestehende Hotelbuchung anmelden.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'У меня есть бронирование.',
        baseText: { de: 'Ich habe eine Buchung.', en: 'I have a booking.' },
      },
      meaning: {
        de: 'Eine geschlechtsneutrale Eröffnung für das Einchecken an der Rezeption.',
        en: 'A gender-neutral opening for checking in at reception.',
      },
      chunks: [
        { id: 'u-menya-bronirovanie-booking-have', targetText: 'У меня есть', baseText: { de: 'Ich habe', en: 'I have' } },
        { id: 'u-menya-bronirovanie-booking-reservation', targetText: 'бронирование.', baseText: { de: 'eine Buchung.', en: 'a booking.' } },
      ],
      lessonItems: [
        { id: 'u-menya-bronirovanie-booking-item-booking', targetText: 'бронирование', baseText: { de: 'Buchung / Reservierung', en: 'booking / reservation' }, acceptedAnswers: russianAccepted('бронирование') },
        { id: 'u-menya-bronirovanie-booking-item-hotel', targetText: 'гостиница', baseText: { de: 'Hotel', en: 'hotel' }, acceptedAnswers: russianAccepted('гостиница') },
        { id: 'u-menya-bronirovanie-booking-item-room', targetText: 'номер', baseText: { de: 'Hotelzimmer / Nummer', en: 'hotel room / number' }, acceptedAnswers: russianAccepted('номер') },
        { id: 'u-menya-bronirovanie-booking-item-confirm', targetText: 'подтверждать', baseText: { de: 'bestätigen', en: 'to confirm' }, acceptedAnswers: russianAccepted('подтверждать') },
        { id: 'u-menya-bronirovanie-booking-item-desk', targetText: 'стойка', baseText: { de: 'Tresen / Rezeptionstheke', en: 'counter / front desk' }, acceptedAnswers: russianAccepted('стойка') },
      ],
      buildChips: ['У меня есть', 'бронирование.', 'Где находится ресторан?', 'Можно оставить багаж?'],
      typeRecall: {
        before: 'У меня есть ', answer: 'бронирование', after: '.',
        acceptedAnswers: russianAccepted('бронирование'),
        fallbackChoices: ['бронирование', 'заявление', 'расписание', 'направление'],
      },
      speakTarget: {
        baseCue: { de: 'Ich habe eine Buchung.', en: 'I have a booking.' },
        targetPhrase: 'У меня есть бронирование.',
        requiredTokens: ['меня', 'есть', 'бронирование'],
        optionalTokens: ['У'],
      },
      sceneCaption: {
        de: 'Die Gästeliste liegt geöffnet auf dem Empfangstresen; die Person dahinter wartet auf deinen ersten Satz.',
        en: 'The guest list lies open on the reception counter as the person behind it waits for your opening sentence.',
      },
      trophyWord: {
        word: 'бронирование', meaning: { de: 'Buchung / Reservierung', en: 'booking / reservation' },
        example: 'Вы подтверждаете бронирование?',
        whyThisWord: { de: 'Die volle Form ist in Hotels, Reiseportalen und schriftlichen Bestätigungen besonders häufig.', en: 'The full form is especially common in hotels, travel portals, and written confirmations.' },
      },
      placeholderCaption: { de: 'Ruhige Hotelrezeption mit geöffneter Gästeliste und kleinem Gepäckwagen.', en: 'A quiet hotel reception with an open guest list and a small luggage trolley.' },
      songMood: 'welcoming hotel arrival',
      visualNotes: 'Region-neutral hotel front desk, open guest list without readable names, compact luggage trolley, receptionist attentive but not resolving check-in.',
    }),
  },
  {
    slug: 'mozhno-nomer-segodnya-room',
    title: { de: 'Ein Zimmer für heute', en: 'A room for tonight' },
    situation: {
      de: 'Ohne vorherige Buchung fragst du an der Rezeption nach einem Zimmer für die kommende Nacht.',
      en: 'Without a prior booking, you ask at reception for a room for the coming night.',
    },
    pedagogicalGoal: 'Eine knappe höfliche Anfrage nach einem Hotelzimmer mit einer festen Tagesangabe bilden.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Можно номер на сегодня?',
        baseText: { de: 'Kann ich ein Zimmer für heute bekommen?', en: 'Can I get a room for tonight?' },
      },
      meaning: {
        de: 'Eine einfache Anfrage nach einer Übernachtungsmöglichkeit am selben Tag.',
        en: 'A simple request for accommodation on the same day.',
      },
      chunks: [
        { id: 'mozhno-nomer-segodnya-room-request', targetText: 'Можно номер', baseText: { de: 'Kann ich ein Zimmer bekommen', en: 'Can I get a room' } },
        { id: 'mozhno-nomer-segodnya-room-date', targetText: 'на сегодня?', baseText: { de: 'für heute?', en: 'for tonight?' } },
      ],
      lessonItems: [
        { id: 'mozhno-nomer-segodnya-room-item-room', targetText: 'номер', baseText: { de: 'Hotelzimmer / Nummer', en: 'hotel room / number' }, acceptedAnswers: russianAccepted('номер') },
        { id: 'mozhno-nomer-segodnya-room-item-today', targetText: 'сегодня', baseText: { de: 'heute', en: 'today' }, acceptedAnswers: russianAccepted('сегодня') },
        { id: 'mozhno-nomer-segodnya-room-item-hotel', targetText: 'гостиница', baseText: { de: 'Hotel', en: 'hotel' }, acceptedAnswers: russianAccepted('гостиница') },
        { id: 'mozhno-nomer-segodnya-room-item-night', targetText: 'ночь', baseText: { de: 'Nacht', en: 'night' }, acceptedAnswers: russianAccepted('ночь') },
        { id: 'mozhno-nomer-segodnya-room-item-free', targetText: 'свободный', baseText: { de: 'frei / verfügbar', en: 'free / available' }, acceptedAnswers: russianAccepted('свободный') },
      ],
      buildChips: ['Можно номер', 'на сегодня?', 'Можно оставить багаж?', 'Завтрак уже начинается?'],
      typeRecall: {
        before: 'Можно ', answer: 'номер', after: ' на сегодня?',
        acceptedAnswers: russianAccepted('номер'),
        fallbackChoices: ['номер', 'завтрак', 'багаж', 'чай'],
      },
      speakTarget: {
        baseCue: { de: 'Kann ich ein Zimmer für heute bekommen?', en: 'Can I get a room for tonight?' },
        targetPhrase: 'Можно номер на сегодня?',
        requiredTokens: ['Можно', 'номер', 'сегодня'],
        optionalTokens: ['на'],
      },
      sceneCaption: {
        de: 'Die Person an der Rezeption zeigt auf das heutige Datum im Kalender; neben dir steht eine Reisetasche.',
        en: 'The receptionist points to today’s date on the calendar while a travel bag stands beside you.',
      },
      trophyWord: {
        word: 'номер', meaning: { de: 'Hotelzimmer / Nummer', en: 'hotel room / number' },
        example: 'Вы хотите номер с окном?',
        whyThisWord: { de: 'Im Hotel bezeichnet dieses Alltagswort das Zimmer und später auch dessen Kennziffer.', en: 'In a hotel, this everyday word names the room and later also its identifying number.' },
      },
      placeholderCaption: { de: 'Empfangstresen mit Kalender auf dem heutigen Datum und einer Reisetasche daneben.', en: 'A reception desk with a calendar on today’s date and a travel bag beside it.' },
      songMood: 'hopeful same-day stay',
      visualNotes: 'Modest hotel reception, calendar and availability screen without readable room result, traveler waiting with one overnight bag.',
    }),
  },
  {
    slug: 'na-kakom-etazhe-floor',
    title: { de: 'Welche Etage?', en: 'Which floor?' },
    situation: {
      de: 'Auf deiner Zimmerkarte fehlt eine klare Etagenangabe, und du fragst vor dem Aufzug an der Rezeption nach.',
      en: 'Your room card has no clear floor indication, so you ask at reception before using the lift.',
    },
    pedagogicalGoal: 'Mit einer festen Ortsform höflich nach der Etage des Zimmers fragen.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Скажите, на каком этаже номер?',
        baseText: { de: 'Können Sie mir sagen, in welcher Etage das Zimmer ist?', en: 'Could you tell me which floor the room is on?' },
      },
      meaning: {
        de: 'Eine kurze Frage, um die richtige Etage des Zimmers zu finden.',
        en: 'A short question for finding the correct floor for the room.',
      },
      chunks: [
        { id: 'na-kakom-etazhe-floor-attention', targetText: 'Скажите,', baseText: { de: 'Sagen Sie bitte,', en: 'Could you tell me,' } },
        { id: 'na-kakom-etazhe-floor-question', targetText: 'на каком этаже номер?', baseText: { de: 'in welcher Etage ist das Zimmer?', en: 'which floor is the room on?' } },
      ],
      lessonItems: [
        { id: 'na-kakom-etazhe-floor-item-floor', targetText: 'этаж', baseText: { de: 'Etage / Stockwerk', en: 'floor / storey' }, acceptedAnswers: russianAccepted('этаж') },
        { id: 'na-kakom-etazhe-floor-item-lift', targetText: 'лифт', baseText: { de: 'Aufzug', en: 'lift / elevator' }, acceptedAnswers: russianAccepted('лифт') },
        { id: 'na-kakom-etazhe-floor-item-stairs', targetText: 'лестница', baseText: { de: 'Treppe', en: 'stairs / staircase' }, acceptedAnswers: russianAccepted('лестница') },
        { id: 'na-kakom-etazhe-floor-item-upstairs', targetText: 'наверху', baseText: { de: 'oben', en: 'upstairs / above' }, acceptedAnswers: russianAccepted('наверху') },
        { id: 'na-kakom-etazhe-floor-item-go-up', targetText: 'подниматься', baseText: { de: 'hinaufgehen / hinauffahren', en: 'to go up' }, acceptedAnswers: russianAccepted('подниматься') },
      ],
      buildChips: ['Скажите,', 'на каком этаже номер?', 'где находится лифт?', 'когда открывается ресторан?'],
      typeRecall: {
        before: 'Скажите, на каком ', answer: 'этаже', after: ' номер?',
        acceptedAnswers: russianAccepted('этаже'),
        fallbackChoices: ['этаже', 'вокзале', 'уровне', 'маршруте'],
      },
      speakTarget: {
        baseCue: { de: 'Können Sie mir sagen, in welcher Etage das Zimmer ist?', en: 'Could you tell me which floor the room is on?' },
        targetPhrase: 'Скажите, на каком этаже номер?',
        requiredTokens: ['Скажите', 'этаже', 'номер'],
        optionalTokens: ['на', 'каком'],
      },
      sceneCaption: {
        de: 'Die Zimmerkarte zeigt nur eine große Nummer; hinter dem Tresen leuchtet die Etagenanzeige des Aufzugs.',
        en: 'The room card shows only a large number while the lift’s floor display glows behind the desk.',
      },
      trophyWord: {
        word: 'этаж', meaning: { de: 'Etage / Stockwerk', en: 'floor / storey' },
        example: 'Вы поднимаетесь на второй этаж?',
        whyThisWord: { de: 'Dieses Wort verbindet Zimmernummer, Aufzug und Treppe zu einer klaren Orientierung im Gebäude.', en: 'This word connects the room number, lift, and stairs into clear navigation inside a building.' },
      },
      placeholderCaption: { de: 'Zimmerkarte mit großer Nummer vor einem Aufzug mit leuchtender Etagenanzeige.', en: 'A room card with a large number in front of a lift with a glowing floor display.' },
      songMood: 'light elevator orientation',
      visualNotes: 'Hotel lift lobby, room card and generic floor display, receptionist visible at a distance, no floor answer revealed.',
    }),
  },
  {
    slug: 'dayte-klyuch-key',
    title: { de: 'Den Schlüssel, bitte', en: 'The key, please' },
    situation: {
      de: 'An der Rezeption nennst du deine Zimmernummer; die Person hinter dem Tresen wartet auf deine Bitte.',
      en: 'At reception, you give your room number and the person behind the desk waits for your request.',
    },
    pedagogicalGoal: 'Mit einer höflichen Imperativform um einen konkreten Hotelgegenstand bitten.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Дайте ключ, пожалуйста.',
        baseText: { de: 'Geben Sie mir den Schlüssel, bitte.', en: 'Give me the key, please.' },
      },
      meaning: {
        de: 'Eine direkte höfliche Bitte am Empfangstresen.',
        en: 'A direct polite request at the reception desk.',
      },
      chunks: [
        { id: 'dayte-klyuch-key-request', targetText: 'Дайте ключ,', baseText: { de: 'Geben Sie mir den Schlüssel,', en: 'Give me the key,' } },
        { id: 'dayte-klyuch-key-please', targetText: 'пожалуйста.', baseText: { de: 'bitte.', en: 'please.' } },
      ],
      lessonItems: [
        { id: 'dayte-klyuch-key-item-key', targetText: 'ключ', baseText: { de: 'Schlüssel', en: 'key' }, acceptedAnswers: russianAccepted('ключ') },
        { id: 'dayte-klyuch-key-item-give', targetText: 'дать', baseText: { de: 'geben', en: 'to give' }, acceptedAnswers: russianAccepted('дать') },
        { id: 'dayte-klyuch-key-item-door', targetText: 'дверь', baseText: { de: 'Tür', en: 'door' }, acceptedAnswers: russianAccepted('дверь') },
        { id: 'dayte-klyuch-key-item-room', targetText: 'номер', baseText: { de: 'Hotelzimmer / Nummer', en: 'hotel room / number' }, acceptedAnswers: russianAccepted('номер') },
        { id: 'dayte-klyuch-key-item-desk', targetText: 'стойка', baseText: { de: 'Tresen / Rezeptionstheke', en: 'counter / front desk' }, acceptedAnswers: russianAccepted('стойка') },
      ],
      buildChips: ['Дайте ключ,', 'пожалуйста.', 'Покажите паспорт.', 'Откройте дверь.'],
      typeRecall: {
        before: 'Дайте ', answer: 'ключ', after: ', пожалуйста.',
        acceptedAnswers: russianAccepted('ключ'),
        fallbackChoices: ['ключ', 'паспорт', 'адрес', 'багаж'],
      },
      speakTarget: {
        baseCue: { de: 'Geben Sie mir den Schlüssel, bitte.', en: 'Give me the key, please.' },
        targetPhrase: 'Дайте ключ, пожалуйста.',
        requiredTokens: ['Дайте', 'ключ', 'пожалуйста'],
        optionalTokens: [],
      },
      sceneCaption: {
        de: 'Mehrere beschriftete Fächer befinden sich hinter dem Empfangstresen; die Person an der Rezeption wartet, nachdem du deine Zimmernummer genannt hast.',
        en: 'Several labeled slots sit behind the front desk as reception waits after hearing your room number.',
      },
      trophyWord: {
        word: 'ключ', meaning: { de: 'Schlüssel', en: 'key' },
        example: 'Вы оставляете ключ на стойке?',
        whyThisWord: { de: 'Der konkrete Gegenstand verbindet Rezeption, Zimmer und Tür in einer leicht merkbaren Hotelroutine.', en: 'This concrete object links reception, room, and door in an easy-to-remember hotel routine.' },
      },
      placeholderCaption: { de: 'Empfangstresen mit beschrifteten Fächern und sichtbarer Zimmernummer.', en: 'A reception counter with labeled slots and a visible room number.' },
      songMood: 'simple room access',
      visualNotes: 'Traditional hotel front desk with numbered cubbies, receptionist waiting after check-in details, requested object not handed over yet.',
    }),
  },
  {
    slug: 'parol-vayfaya-wifi',
    title: { de: 'Das WLAN-Passwort', en: 'The Wi-Fi password' },
    situation: {
      de: 'Dein Handy zeigt im Zimmer das Hotelnetz an, aber die Anmeldung verlangt noch eine Zugangsinformation.',
      en: 'Your phone shows the hotel network in your room, but signing in still requires access information.',
    },
    pedagogicalGoal: 'Mit einer höflichen Bitte nach dem konkreten Zugang zum Hotelnetz fragen.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Скажите пароль от вайфая, пожалуйста.',
        baseText: { de: 'Sagen Sie mir das WLAN-Passwort, bitte.', en: 'Tell me the Wi-Fi password, please.' },
      },
      meaning: {
        de: 'Eine klare Bitte um die Zugangsdaten für das drahtlose Netz.',
        en: 'A clear request for the wireless network access details.',
      },
      chunks: [
        { id: 'parol-vayfaya-wifi-request', targetText: 'Скажите пароль', baseText: { de: 'Sagen Sie mir das Passwort', en: 'Tell me the password' } },
        { id: 'parol-vayfaya-wifi-network', targetText: 'от вайфая,', baseText: { de: 'für das WLAN,', en: 'for the Wi-Fi,' } },
        { id: 'parol-vayfaya-wifi-please', targetText: 'пожалуйста.', baseText: { de: 'bitte.', en: 'please.' } },
      ],
      lessonItems: [
        { id: 'parol-vayfaya-wifi-item-password', targetText: 'пароль', baseText: { de: 'Passwort', en: 'password' }, acceptedAnswers: russianAccepted('пароль') },
        { id: 'parol-vayfaya-wifi-item-wifi', targetText: 'вайфай', baseText: { de: 'WLAN', en: 'Wi-Fi' }, acceptedAnswers: russianAccepted('вайфай') },
        { id: 'parol-vayfaya-wifi-item-internet', targetText: 'интернет', baseText: { de: 'Internet', en: 'internet' }, acceptedAnswers: russianAccepted('интернет') },
        { id: 'parol-vayfaya-wifi-item-network', targetText: 'сеть', baseText: { de: 'Netz / Netzwerk', en: 'network' }, acceptedAnswers: russianAccepted('сеть') },
        { id: 'parol-vayfaya-wifi-item-repeat', targetText: 'повторить', baseText: { de: 'wiederholen', en: 'to repeat' }, acceptedAnswers: russianAccepted('повторить') },
      ],
      buildChips: ['Скажите пароль', 'от вайфая,', 'пожалуйста.', 'Покажите адрес сети.', 'Интернет здесь работает?'],
      typeRecall: {
        before: 'Скажите ', answer: 'пароль', after: ' от вайфая, пожалуйста.',
        acceptedAnswers: russianAccepted('пароль'),
        fallbackChoices: ['пароль', 'адрес', 'этаж', 'номер'],
      },
      speakTarget: {
        baseCue: { de: 'Sagen Sie mir das WLAN-Passwort, bitte.', en: 'Tell me the Wi-Fi password, please.' },
        targetPhrase: 'Скажите пароль от вайфая, пожалуйста.',
        requiredTokens: ['Скажите', 'пароль', 'вайфая'],
        optionalTokens: ['от', 'пожалуйста'],
      },
      sceneCaption: {
        de: 'Auf dem Handy ist das Anmeldefeld des Hotelnetzes geöffnet; am Telefon wartet die Rezeption auf deine Frage.',
        en: 'The hotel network sign-in field is open on your phone while reception waits on the line for your question.',
      },
      trophyWord: {
        word: 'пароль', meaning: { de: 'Passwort', en: 'password' },
        example: 'Вы можете повторить пароль?',
        whyThisWord: { de: 'Dieses Wort ist die entscheidende Zugangsinformation für WLAN, Konten und digitale Türen.', en: 'This word is the key access detail for Wi-Fi, accounts, and digital doors.' },
      },
      placeholderCaption: { de: 'Handy mit geöffnetem Netzwerkanmeldefeld neben einem Hoteltelefon.', en: 'A phone with an open network sign-in field beside a hotel telephone.' },
      songMood: 'connected room comfort',
      visualNotes: 'Hotel bedside desk, phone showing a blank network password field, reception call connected, no password visible anywhere.',
    }),
  },
  {
    slug: 'gde-vannaya-komnata-bathroom',
    title: { de: 'Wo ist das Bad?', en: 'Where is the bathroom?' },
    situation: {
      de: 'Im Hotelflur sind zwei Türen nicht eindeutig beschriftet, und du fragst an der Rezeption nach dem Bad.',
      en: 'Two doors in the hotel corridor are not clearly labeled, so you ask reception where the bathroom is.',
    },
    pedagogicalGoal: 'Mit der vollen Bezeichnung für das Bad eine höfliche Ortsfrage im Hotel stellen.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Скажите, где ванная комната?',
        baseText: { de: 'Können Sie mir sagen, wo das Badezimmer ist?', en: 'Could you tell me where the bathroom is?' },
      },
      meaning: {
        de: 'Eine eindeutige Ortsfrage nach dem Bad in einem Hotel oder Gästehaus.',
        en: 'An unambiguous location question for the bathroom in a hotel or guesthouse.',
      },
      chunks: [
        { id: 'gde-vannaya-komnata-bathroom-attention', targetText: 'Скажите,', baseText: { de: 'Sagen Sie bitte,', en: 'Could you tell me,' } },
        { id: 'gde-vannaya-komnata-bathroom-location', targetText: 'где ванная комната?', baseText: { de: 'wo ist das Badezimmer?', en: 'where is the bathroom?' } },
      ],
      lessonItems: [
        { id: 'gde-vannaya-komnata-bathroom-item-bathroom', targetText: 'ванная комната', baseText: { de: 'Badezimmer', en: 'bathroom' }, acceptedAnswers: russianAccepted('ванная комната') },
        { id: 'gde-vannaya-komnata-bathroom-item-room', targetText: 'комната', baseText: { de: 'Zimmer / Raum', en: 'room' }, acceptedAnswers: russianAccepted('комната') },
        { id: 'gde-vannaya-komnata-bathroom-item-shower', targetText: 'душ', baseText: { de: 'Dusche', en: 'shower' }, acceptedAnswers: russianAccepted('душ') },
        { id: 'gde-vannaya-komnata-bathroom-item-sink', targetText: 'раковина', baseText: { de: 'Waschbecken', en: 'sink' }, acceptedAnswers: russianAccepted('раковина') },
        { id: 'gde-vannaya-komnata-bathroom-item-corridor', targetText: 'коридор', baseText: { de: 'Flur', en: 'corridor' }, acceptedAnswers: russianAccepted('коридор') },
      ],
      buildChips: ['Скажите,', 'где ванная комната?', 'где работает ресторан?', 'когда открывается бассейн?'],
      typeRecall: {
        before: 'Скажите, где ванная ', answer: 'комната', after: '?',
        acceptedAnswers: russianAccepted('комната'),
        fallbackChoices: ['комната', 'стойка', 'лестница', 'платформа'],
      },
      speakTarget: {
        baseCue: { de: 'Können Sie mir sagen, wo das Badezimmer ist?', en: 'Could you tell me where the bathroom is?' },
        targetPhrase: 'Скажите, где ванная комната?',
        requiredTokens: ['Скажите', 'ванная', 'комната'],
        optionalTokens: ['где'],
      },
      sceneCaption: {
        de: 'Zwei unbeschriftete Türen liegen am Ende des Flurs; die Person an der Rezeption wartet auf deine Ortsfrage.',
        en: 'Two unlabeled doors sit at the end of the corridor as the receptionist waits for your location question.',
      },
      trophyWord: {
        word: 'комната', meaning: { de: 'Zimmer / Raum', en: 'room' },
        example: 'Вы можете показать эту комнату?',
        whyThisWord: { de: 'Das Grundwort für einen Raum erscheint in vielen nützlichen Zusammensetzungen im Hotel.', en: 'The basic word for a room appears in many useful hotel expressions and room names.' },
      },
      placeholderCaption: { de: 'Hotelflur mit zwei unbeschrifteten Türen und sichtbarer Rezeption im Hintergrund.', en: 'A hotel corridor with two unlabeled doors and reception visible in the background.' },
      songMood: 'quiet corridor question',
      visualNotes: 'Simple hotel corridor with two generic doors, reception sightline preserved, no bathroom symbol or directional answer shown.',
    }),
  },
  {
    slug: 'prinesite-polotentse-towel',
    title: { de: 'Ein Handtuch, bitte', en: 'A towel, please' },
    situation: {
      de: 'Im Badezimmer ist die Ablage leer, und du rufst die Rezeption an, um ein Handtuch zu erbitten.',
      en: 'The bathroom rack is empty, so you call reception to ask for a towel.',
    },
    pedagogicalGoal: 'Mit einer höflichen Imperativform um einen fehlenden Gegenstand im Zimmer bitten.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Принесите полотенце, пожалуйста.',
        baseText: { de: 'Bringen Sie ein Handtuch, bitte.', en: 'Bring a towel, please.' },
      },
      meaning: {
        de: 'Eine klare Bitte an die Rezeption, etwas ins Zimmer zu bringen.',
        en: 'A clear request for reception to bring something to the room.',
      },
      chunks: [
        { id: 'prinesite-polotentse-towel-request', targetText: 'Принесите полотенце,', baseText: { de: 'Bringen Sie ein Handtuch,', en: 'Bring a towel,' } },
        { id: 'prinesite-polotentse-towel-please', targetText: 'пожалуйста.', baseText: { de: 'bitte.', en: 'please.' } },
      ],
      lessonItems: [
        { id: 'prinesite-polotentse-towel-item-bring', targetText: 'принести', baseText: { de: 'bringen', en: 'to bring' }, acceptedAnswers: russianAccepted('принести') },
        { id: 'prinesite-polotentse-towel-item-towel', targetText: 'полотенце', baseText: { de: 'Handtuch', en: 'towel' }, acceptedAnswers: russianAccepted('полотенце') },
        { id: 'prinesite-polotentse-towel-item-clean', targetText: 'чистый', baseText: { de: 'sauber', en: 'clean' }, acceptedAnswers: russianAccepted('чистый') },
        { id: 'prinesite-polotentse-towel-item-bathroom', targetText: 'ванная', baseText: { de: 'Badezimmer', en: 'bathroom' }, acceptedAnswers: russianAccepted('ванная') },
        { id: 'prinesite-polotentse-towel-item-reception', targetText: 'стойка регистрации', baseText: { de: 'Rezeptionstresen', en: 'front desk' }, acceptedAnswers: russianAccepted('стойка регистрации') },
      ],
      buildChips: ['Принесите полотенце,', 'пожалуйста.', 'Откройте окно.', 'Проверьте кондиционер.'],
      typeRecall: {
        before: 'Принесите ', answer: 'полотенце', after: ', пожалуйста.',
        acceptedAnswers: russianAccepted('полотенце'),
        fallbackChoices: ['полотенце', 'одеяло', 'мыло', 'радио'],
      },
      speakTarget: {
        baseCue: { de: 'Bringen Sie ein Handtuch, bitte.', en: 'Bring a towel, please.' },
        targetPhrase: 'Принесите полотенце, пожалуйста.',
        requiredTokens: ['Принесите', 'полотенце', 'пожалуйста'],
        optionalTokens: [],
      },
      sceneCaption: {
        de: 'Die Badezimmerablage ist leer; das Zimmertelefon ist verbunden, und die Rezeption wartet auf deine Bitte.',
        en: 'The bathroom rack is empty; the room phone is connected and reception waits for your request.',
      },
      trophyWord: {
        word: 'полотенце', meaning: { de: 'Handtuch', en: 'towel' },
        example: 'Принесите чистое полотенце, пожалуйста.',
        whyThisWord: { de: 'Der konkrete Zimmergegenstand macht eine häufige Bitte an Rezeption oder Service sofort möglich.', en: 'This concrete room item makes a common request to reception or housekeeping immediately possible.' },
      },
      placeholderCaption: { de: 'Leere Badezimmerablage neben einem verbundenen Zimmertelefon.', en: 'An empty bathroom rack beside a connected room telephone.' },
      songMood: 'gentle room-service request',
      visualNotes: 'Hotel bathroom with an unmistakably empty rack, phone call active, no replacement item visible or delivery underway.',
    }),
  },
  {
    slug: 'spokoynoy-nochi-morning-good-night',
    title: { de: 'Gute Nacht', en: 'Good night' },
    situation: {
      de: 'Spät am Abend gehst du vom Empfang zum Aufzug und verabschiedest dich von der Person an der Rezeption.',
      en: 'Late in the evening, you head from reception to the lift and say goodbye to the person at the desk.',
    },
    pedagogicalGoal: 'Einen festen Nachtgruß mit einem ruhigen zeitlichen Abschied verbinden.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Спокойной ночи, до утра.',
        baseText: { de: 'Gute Nacht, bis morgen früh.', en: 'Good night, see you in the morning.' },
      },
      meaning: {
        de: 'Ein höflicher Abendabschied im Hotel, wenn man sich am Morgen wiedersehen kann.',
        en: 'A polite evening farewell at a hotel when you may see each other again in the morning.',
      },
      chunks: [
        { id: 'spokoynoy-nochi-morning-good-night-night', targetText: 'Спокойной ночи,', baseText: { de: 'Gute Nacht,', en: 'Good night,' } },
        { id: 'spokoynoy-nochi-morning-good-night-morning', targetText: 'до утра.', baseText: { de: 'bis morgen früh.', en: 'until morning.' } },
      ],
      lessonItems: [
        { id: 'spokoynoy-nochi-morning-good-night-item-night', targetText: 'ночь', baseText: { de: 'Nacht', en: 'night' }, acceptedAnswers: russianAccepted('ночь') },
        { id: 'spokoynoy-nochi-morning-good-night-item-morning', targetText: 'утро', baseText: { de: 'Morgen', en: 'morning' }, acceptedAnswers: russianAccepted('утро') },
        { id: 'spokoynoy-nochi-morning-good-night-item-calm', targetText: 'спокойный', baseText: { de: 'ruhig', en: 'calm / peaceful' }, acceptedAnswers: russianAccepted('спокойный') },
        { id: 'spokoynoy-nochi-morning-good-night-item-wish', targetText: 'желать', baseText: { de: 'wünschen', en: 'to wish' }, acceptedAnswers: russianAccepted('желать') },
        { id: 'spokoynoy-nochi-morning-good-night-item-rest', targetText: 'отдых', baseText: { de: 'Erholung / Ruhe', en: 'rest' }, acceptedAnswers: russianAccepted('отдых') },
      ],
      buildChips: ['Спокойной ночи,', 'до утра.', 'Доброе утро.', 'Приятного вечера.'],
      typeRecall: {
        before: 'Спокойной ночи, до ', answer: 'утра', after: '.',
        acceptedAnswers: russianAccepted('утра'),
        fallbackChoices: ['утра', 'обеда', 'вечера', 'сеанса'],
      },
      speakTarget: {
        baseCue: { de: 'Gute Nacht, bis morgen früh.', en: 'Good night, see you in the morning.' },
        targetPhrase: 'Спокойной ночи, до утра.',
        requiredTokens: ['Спокойной', 'ночи', 'утра'],
        optionalTokens: ['до'],
      },
      sceneCaption: {
        de: 'Die Lobbybeleuchtung ist gedimmt, der Aufzug steht offen, und die Person am Tresen wartet auf deinen Abschiedsgruß.',
        en: 'The lobby lights are dim, the lift is open, and the person at the desk waits for your farewell.',
      },
      trophyWord: {
        word: 'ночь', meaning: { de: 'Nacht', en: 'night' },
        example: 'Желаю вам спокойной ночи.',
        whyThisWord: { de: 'Das Zeitwort trägt den festen Abendgruß und hilft zugleich bei Hotelnächten und Zeitangaben.', en: 'This time word carries the fixed evening farewell and also helps with hotel nights and time references.' },
      },
      placeholderCaption: { de: 'Gedimmte Hotellobby mit offenem Aufzug und beleuchtetem Empfangstresen.', en: 'A dim hotel lobby with an open lift and a softly lit reception desk.' },
      songMood: 'soft lobby farewell',
      visualNotes: 'Quiet late-night hotel lobby, open lift awaiting the guest, receptionist at desk, restrained warm lighting without showing a spoken response.',
    }),
  },
  {
    slug: 'vo-skolko-zavtrak-breakfast',
    title: { de: 'Wann beginnt das Frühstück?', en: 'When does breakfast start?' },
    situation: {
      de: 'In der Lobby ist die Zeile für die Frühstückszeit auf dem Informationsschild verdeckt, und du fragst an der Rezeption.',
      en: 'In the lobby, the breakfast-time line on the information board is covered, so you ask at reception.',
    },
    pedagogicalGoal: 'Mit einer Zeitfrage und einem Präsensverb nach dem Beginn einer täglichen Hotelleistung fragen.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Во сколько начинается завтрак?',
        baseText: { de: 'Wann beginnt das Frühstück?', en: 'What time does breakfast start?' },
      },
      meaning: {
        de: 'Eine genaue Frage nach dem Beginn des Frühstücks im Hotel.',
        en: 'A precise question about when hotel breakfast begins.',
      },
      chunks: [
        { id: 'vo-skolko-zavtrak-breakfast-time', targetText: 'Во сколько', baseText: { de: 'Um wie viel Uhr', en: 'At what time' } },
        { id: 'vo-skolko-zavtrak-breakfast-start', targetText: 'начинается завтрак?', baseText: { de: 'beginnt das Frühstück?', en: 'does breakfast start?' } },
      ],
      lessonItems: [
        { id: 'vo-skolko-zavtrak-breakfast-item-breakfast', targetText: 'завтрак', baseText: { de: 'Frühstück', en: 'breakfast' }, acceptedAnswers: russianAccepted('завтрак') },
        { id: 'vo-skolko-zavtrak-breakfast-item-start', targetText: 'начинаться', baseText: { de: 'beginnen', en: 'to begin' }, acceptedAnswers: russianAccepted('начинаться') },
        { id: 'vo-skolko-zavtrak-breakfast-item-time', targetText: 'время', baseText: { de: 'Zeit', en: 'time' }, acceptedAnswers: russianAccepted('время') },
        { id: 'vo-skolko-zavtrak-breakfast-item-restaurant', targetText: 'ресторан', baseText: { de: 'Restaurant', en: 'restaurant' }, acceptedAnswers: russianAccepted('ресторан') },
        { id: 'vo-skolko-zavtrak-breakfast-item-morning', targetText: 'утром', baseText: { de: 'morgens', en: 'in the morning' }, acceptedAnswers: russianAccepted('утром') },
      ],
      buildChips: ['Во сколько', 'начинается завтрак?', 'Где находится ресторан?', 'Когда открывается кухня?'],
      typeRecall: {
        before: 'Во сколько ', answer: 'начинается', after: ' завтрак?',
        acceptedAnswers: russianAccepted('начинается'),
        fallbackChoices: ['начинается', 'закрывается', 'работает', 'приходит'],
      },
      speakTarget: {
        baseCue: { de: 'Wann beginnt das Frühstück?', en: 'What time does breakfast start?' },
        targetPhrase: 'Во сколько начинается завтрак?',
        requiredTokens: ['сколько', 'начинается', 'завтрак'],
        optionalTokens: ['Во'],
      },
      sceneCaption: {
        de: 'Auf dem Lobby-Schild sind mehrere Mahlzeiten aufgelistet, doch eine Zeitangabe ist verdeckt; die Rezeption ist besetzt.',
        en: 'Several meals are listed on the lobby board, but one time is covered; reception is staffed.',
      },
      trophyWord: {
        word: 'завтрак', meaning: { de: 'Frühstück', en: 'breakfast' },
        example: 'Вы приходите на завтрак рано?',
        whyThisWord: { de: 'Das häufige Mahlzeitenwort gehört zu fast jedem Hotelaufenthalt und vielen Tagesplänen.', en: 'This common meal word belongs to almost every hotel stay and many daily schedules.' },
      },
      placeholderCaption: { de: 'Informationsschild in der Lobby mit Mahlzeitenzeilen und einer verdeckten Uhrzeit.', en: 'A lobby information board with meal rows and one covered time.' },
      songMood: 'sunny breakfast planning',
      visualNotes: 'Morning hotel lobby, meal board with the relevant time physically obscured, receptionist ready to answer, no clock-based resolution shown.',
    }),
  },
  {
    slug: 'vo-skolko-vyezd-checkout',
    title: { de: 'Wann ist die Abreise?', en: 'What time is check-out?' },
    situation: {
      de: 'Am letzten Morgen steht dein Gepäck bereit, und du fragst an der Rezeption nach der Abreisezeit des Hotels.',
      en: 'On the final morning, your luggage is ready and you ask reception for the hotel’s check-out time.',
    },
    pedagogicalGoal: 'Die feste Hotelbedeutung von Abreise in einer kurzen Zeitfrage verwenden.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Во сколько выезд из гостиницы?',
        baseText: { de: 'Wann ist die Abreise aus dem Hotel?', en: 'What time is hotel check-out?' },
      },
      meaning: {
        de: 'Eine kompakte Frage nach der Uhrzeit, zu der das Zimmer verlassen werden soll.',
        en: 'A compact question about the time by which the room should be vacated.',
      },
      chunks: [
        { id: 'vo-skolko-vyezd-checkout-time', targetText: 'Во сколько', baseText: { de: 'Um wie viel Uhr', en: 'At what time' } },
        { id: 'vo-skolko-vyezd-checkout-departure', targetText: 'выезд из гостиницы?', baseText: { de: 'ist die Abreise aus dem Hotel?', en: 'is check-out from the hotel?' } },
      ],
      lessonItems: [
        { id: 'vo-skolko-vyezd-checkout-item-checkout', targetText: 'выезд', baseText: { de: 'Abreise / Check-out', en: 'departure / check-out' }, acceptedAnswers: russianAccepted('выезд') },
        { id: 'vo-skolko-vyezd-checkout-item-hotel', targetText: 'гостиница', baseText: { de: 'Hotel', en: 'hotel' }, acceptedAnswers: russianAccepted('гостиница') },
        { id: 'vo-skolko-vyezd-checkout-item-leave', targetText: 'освободить', baseText: { de: 'freigeben / räumen', en: 'to vacate / free' }, acceptedAnswers: russianAccepted('освободить') },
        { id: 'vo-skolko-vyezd-checkout-item-morning', targetText: 'утро', baseText: { de: 'Morgen', en: 'morning' }, acceptedAnswers: russianAccepted('утро') },
        { id: 'vo-skolko-vyezd-checkout-item-rules', targetText: 'правила', baseText: { de: 'Regeln', en: 'rules' }, acceptedAnswers: russianAccepted('правила') },
      ],
      buildChips: ['Во сколько', 'выезд из гостиницы?', 'Когда закрывается ресторан?', 'Где оставить ключ?'],
      typeRecall: {
        before: 'Во сколько ', answer: 'выезд', after: ' из гостиницы?',
        acceptedAnswers: russianAccepted('выезд'),
        fallbackChoices: ['выезд', 'завтрак', 'поезд', 'лифт'],
      },
      speakTarget: {
        baseCue: { de: 'Wann ist die Abreise aus dem Hotel?', en: 'What time is hotel check-out?' },
        targetPhrase: 'Во сколько выезд из гостиницы?',
        requiredTokens: ['сколько', 'выезд', 'гостиницы'],
        optionalTokens: ['Во', 'из'],
      },
      sceneCaption: {
        de: 'Dein Koffer steht am Empfangstresen; die Hausregeln liegen umgedreht daneben, und die Rezeption wartet auf deine Zeitfrage.',
        en: 'Your suitcase stands at the front desk; the house rules lie face down beside it, and reception waits for your timing question.',
      },
      trophyWord: {
        word: 'выезд', meaning: { de: 'Abreise / Check-out', en: 'departure / check-out' },
        example: 'Вы планируете выезд утром?',
        whyThisWord: { de: 'Im Hotelkontext benennt dieses Wort knapp den gesamten Vorgang des Auscheckens und Abreisens.', en: 'In a hotel context, this word compactly names the whole process of checking out and leaving.' },
      },
      placeholderCaption: { de: 'Koffer am Empfangstresen neben umgedrehten Hausregeln und einer kleinen Uhr.', en: 'A suitcase at the front desk beside face-down house rules and a small clock.' },
      songMood: 'organized hotel departure',
      visualNotes: 'Final-morning reception scene, packed suitcase, unreadable house-rules card, desk clock without a highlighted answer, staff waiting for the question.',
    }),
  },
]

export const RUSSIAN_A1_PRACTICAL_8_LESSONS: GuidedLessonDefinition[] = makeRussianPracticalLessons(
  GUIDED_TODAY_PATH_RUSSIAN_EIGHT_METADATA,
  russianA1Practical8Inputs,
  { de: 'Du hast Russisch A1 Praxis 8 abgeschlossen.', en: 'You have completed Russian A1 Practical 8.' },
)

export const GUIDED_TODAY_PATH_RUSSIAN_NINE_METADATA: GuidedPathMetadata = {
  id: 'russian-a1-practical-9',
  title: 'Russian A1 Practical 9',
  shortTitle: 'A1 Practical 9',
  subtitle: { de: 'Wiedersehen und lockere Pläne', en: 'Meeting again and casual plans' },
  level: 'A1',
  baseLanguage: 'German',
  targetLanguage: 'Russian',
  estimatedMinutes: 5,
}

const russianA1Practical9Inputs: RussianLessonInput[] = [
  {
    slug: 'zdravstvuyte-snova-again',
    title: { de: 'Schön, Sie wiederzusehen', en: 'Good to see you again' },
    situation: {
      de: 'Eine Person aus deinem Sprachkurs kommt in dasselbe Café und bleibt für deine Begrüßung am Tisch stehen.',
      en: 'Someone from your language class arrives at the same cafe and pauses by the table for your greeting.',
    },
    pedagogicalGoal: 'Eine formelle Begrüßung mit einer geschlechtsneutralen Wiedersehensformel verbinden.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Здравствуйте, приятно видеть вас снова.',
        baseText: { de: 'Guten Tag, schön, Sie wiederzusehen.', en: 'Hello, it is good to see you again.' },
      },
      meaning: {
        de: 'Ein warmer, aber weiterhin höflicher Gruß an eine bereits bekannte Person.',
        en: 'A warm but still polite greeting for someone you already know.',
      },
      chunks: [
        { id: 'zdravstvuyte-snova-again-greeting', targetText: 'Здравствуйте,', baseText: { de: 'Guten Tag,', en: 'Hello,' } },
        { id: 'zdravstvuyte-snova-again-pleasure', targetText: 'приятно видеть вас', baseText: { de: 'schön, Sie zu sehen', en: 'it is good to see you' } },
        { id: 'zdravstvuyte-snova-again-repeat', targetText: 'снова.', baseText: { de: 'wieder.', en: 'again.' } },
      ],
      lessonItems: [
        { id: 'zdravstvuyte-snova-again-item-greeting', targetText: 'здравствуйте', baseText: { de: 'guten Tag', en: 'hello / good day' }, acceptedAnswers: russianAccepted('здравствуйте') },
        { id: 'zdravstvuyte-snova-again-item-see', targetText: 'видеть', baseText: { de: 'sehen', en: 'to see' }, acceptedAnswers: russianAccepted('видеть') },
        { id: 'zdravstvuyte-snova-again-item-again', targetText: 'снова', baseText: { de: 'wieder / erneut', en: 'again' }, acceptedAnswers: russianAccepted('снова') },
        { id: 'zdravstvuyte-snova-again-item-pleasant', targetText: 'приятно', baseText: { de: 'angenehm / schön', en: 'pleasant / nice' }, acceptedAnswers: russianAccepted('приятно') },
        { id: 'zdravstvuyte-snova-again-item-acquaintance', targetText: 'знакомство', baseText: { de: 'Bekanntschaft / Kennenlernen', en: 'acquaintance / meeting' }, acceptedAnswers: russianAccepted('знакомство') },
      ],
      buildChips: ['Здравствуйте,', 'приятно видеть вас', 'снова.', 'Доброе утро.', 'Спасибо за звонок.'],
      typeRecall: {
        before: 'Здравствуйте, приятно видеть вас ', answer: 'снова', after: '.',
        acceptedAnswers: russianAccepted('снова'),
        fallbackChoices: ['снова', 'снаружи', 'внутри', 'утром'],
      },
      speakTarget: {
        baseCue: { de: 'Guten Tag, schön, Sie wiederzusehen.', en: 'Hello, it is good to see you again.' },
        targetPhrase: 'Здравствуйте, приятно видеть вас снова.',
        requiredTokens: ['Здравствуйте', 'видеть', 'снова'],
        optionalTokens: ['приятно', 'вас'],
      },
      sceneCaption: {
        de: 'Am Cafétisch steht eine bekannte Person aus dem Kurs und wartet mit offenem Blick auf deine Begrüßung.',
        en: 'A familiar person from class stands by the cafe table and waits attentively for your greeting.',
      },
      trophyWord: {
        word: 'снова', meaning: { de: 'wieder / erneut', en: 'again' },
        example: 'Вы сегодня снова здесь?',
        whyThisWord: { de: 'Das Adverb macht aus einem ersten Kontakt ein Wiedersehen und passt auch zu wiederholten Handlungen.', en: 'This adverb turns a first contact into a reunion and also works for repeated actions.' },
      },
      placeholderCaption: { de: 'Heller Cafétisch mit zwei Stühlen und einer wartenden Person aus dem Kurs.', en: 'A bright cafe table with two chairs and a familiar classmate waiting nearby.' },
      songMood: 'warm familiar hello',
      visualNotes: 'Casual daytime cafe, one familiar course acquaintance standing at the table, respectful distance and no hug or informal gesture assumed.',
    }),
  },
  {
    slug: 'vremya-segodnya-today',
    title: { de: 'Haben Sie heute Zeit?', en: 'Do you have time today?' },
    situation: {
      de: 'Nach dem Kurs möchtest du etwas gemeinsam unternehmen und fragst eine neue Bekanntschaft nach ihrer Verfügbarkeit.',
      en: 'After class, you would like to do something together and ask a new acquaintance about their availability.',
    },
    pedagogicalGoal: 'Mit einer Besitzfrage und einer Tagesangabe höflich nach freier Zeit fragen.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'У вас есть время сегодня?',
        baseText: { de: 'Haben Sie heute Zeit?', en: 'Do you have time today?' },
      },
      meaning: {
        de: 'Eine offene Verfügbarkeitsfrage, bevor du einen konkreten Vorschlag machst.',
        en: 'An open availability question before you make a specific suggestion.',
      },
      chunks: [
        { id: 'vremya-segodnya-today-availability', targetText: 'У вас есть время', baseText: { de: 'Haben Sie Zeit', en: 'Do you have time' } },
        { id: 'vremya-segodnya-today-date', targetText: 'сегодня?', baseText: { de: 'heute?', en: 'today?' } },
      ],
      lessonItems: [
        { id: 'vremya-segodnya-today-item-time', targetText: 'время', baseText: { de: 'Zeit', en: 'time' }, acceptedAnswers: russianAccepted('время') },
        { id: 'vremya-segodnya-today-item-today', targetText: 'сегодня', baseText: { de: 'heute', en: 'today' }, acceptedAnswers: russianAccepted('сегодня') },
        { id: 'vremya-segodnya-today-item-plan', targetText: 'план', baseText: { de: 'Plan', en: 'plan' }, acceptedAnswers: russianAccepted('план') },
        { id: 'vremya-segodnya-today-item-walk', targetText: 'прогулка', baseText: { de: 'Spaziergang', en: 'walk / stroll' }, acceptedAnswers: russianAccepted('прогулка') },
        { id: 'vremya-segodnya-today-item-conversation', targetText: 'беседа', baseText: { de: 'Gespräch', en: 'conversation' }, acceptedAnswers: russianAccepted('беседа') },
      ],
      buildChips: ['У вас есть время', 'сегодня?', 'после работы?', 'У вас есть планы?'],
      typeRecall: {
        before: 'У вас есть время ', answer: 'сегодня', after: '?',
        acceptedAnswers: russianAccepted('сегодня'),
        fallbackChoices: ['сегодня', 'снаружи', 'быстро', 'вместе'],
      },
      speakTarget: {
        baseCue: { de: 'Haben Sie heute Zeit?', en: 'Do you have time today?' },
        targetPhrase: 'У вас есть время сегодня?',
        requiredTokens: ['вас', 'время', 'сегодня'],
        optionalTokens: ['У', 'есть'],
      },
      sceneCaption: {
        de: 'Der Kursraum leert sich; die andere Person hält den Kalender geöffnet und wartet auf deine Frage.',
        en: 'The classroom is emptying; the other person holds an open calendar and waits for your question.',
      },
      trophyWord: {
        word: 'время', meaning: { de: 'Zeit', en: 'time' },
        example: 'У вас есть время после работы?',
        whyThisWord: { de: 'Das zentrale Zeitwort hilft bei Verfügbarkeit, Fahrplänen, Dauer und Uhrzeiten.', en: 'This central time word helps with availability, schedules, duration, and clock time.' },
      },
      placeholderCaption: { de: 'Sich leerender Kursraum mit geöffnetem Kalender zwischen zwei Personen.', en: 'An emptying classroom with an open calendar between two people.' },
      songMood: 'light invitation opening',
      visualNotes: 'Language-class exit, open calendar with no selected slot, two adults maintaining polite conversational distance.',
    }),
  },
  {
    slug: 'uvidimsya-pozzhe-later',
    title: { de: 'Bis später?', en: 'See you later?' },
    situation: {
      de: 'Eine neue Bekanntschaft muss kurz zu einem Termin und wartet an der Tür auf eine knappe Absprache für später.',
      en: 'A new acquaintance needs to leave briefly for an appointment and pauses at the door for a quick plan for later.',
    },
    pedagogicalGoal: 'Mit einer geschlechtsneutralen Zukunftsform ein späteres Wiedersehen vorschlagen.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Увидимся позже, хорошо?',
        baseText: { de: 'Sehen wir uns später, ja?', en: 'See you later, okay?' },
      },
      meaning: {
        de: 'Ein freundlicher, kurzer Vorschlag, den Kontakt am selben Tag fortzusetzen.',
        en: 'A friendly short suggestion to continue the contact later the same day.',
      },
      chunks: [
        { id: 'uvidimsya-pozzhe-later-plan', targetText: 'Увидимся позже,', baseText: { de: 'Sehen wir uns später,', en: 'See you later,' } },
        { id: 'uvidimsya-pozzhe-later-check', targetText: 'хорошо?', baseText: { de: 'ja?', en: 'okay?' } },
      ],
      lessonItems: [
        { id: 'uvidimsya-pozzhe-later-item-see', targetText: 'увидеться', baseText: { de: 'sich sehen / treffen', en: 'to see each other' }, acceptedAnswers: russianAccepted('увидеться') },
        { id: 'uvidimsya-pozzhe-later-item-later', targetText: 'позже', baseText: { de: 'später', en: 'later' }, acceptedAnswers: russianAccepted('позже') },
        { id: 'uvidimsya-pozzhe-later-item-okay', targetText: 'хорошо', baseText: { de: 'gut / in Ordnung', en: 'good / okay' }, acceptedAnswers: russianAccepted('хорошо') },
        { id: 'uvidimsya-pozzhe-later-item-hour', targetText: 'час', baseText: { de: 'Stunde / Uhr', en: 'hour / o’clock' }, acceptedAnswers: russianAccepted('час') },
        { id: 'uvidimsya-pozzhe-later-item-message', targetText: 'сообщение', baseText: { de: 'Nachricht', en: 'message' }, acceptedAnswers: russianAccepted('сообщение') },
      ],
      buildChips: ['Увидимся позже,', 'хорошо?', 'Встретимся утром.', 'Позвоните вечером.'],
      typeRecall: {
        before: 'Увидимся ', answer: 'позже', after: ', хорошо?',
        acceptedAnswers: russianAccepted('позже'),
        fallbackChoices: ['позже', 'сразу', 'утром', 'снаружи'],
      },
      speakTarget: {
        baseCue: { de: 'Sehen wir uns später, ja?', en: 'See you later, okay?' },
        targetPhrase: 'Увидимся позже, хорошо?',
        requiredTokens: ['Увидимся', 'позже', 'хорошо'],
        optionalTokens: [],
      },
      sceneCaption: {
        de: 'An der Tür zeigt die andere Person kurz auf die Uhr und wartet auf deinen nächsten Vorschlag.',
        en: 'At the door, the other person briefly points to the clock and waits for your next suggestion.',
      },
      trophyWord: {
        word: 'позже', meaning: { de: 'später', en: 'later' },
        example: 'Вы можете прийти позже?',
        whyThisWord: { de: 'Das Zeitadverb verschiebt einen Plan freundlich, ohne schon eine genaue Uhrzeit zu verlangen.', en: 'This time adverb moves a plan later without requiring an exact hour yet.' },
      },
      placeholderCaption: { de: 'Cafétür mit sichtbarer Uhr und einer Person, die zum Gehen bereitsteht.', en: 'A cafe door with a visible clock and a person ready to leave.' },
      songMood: 'breezy later-today plan',
      visualNotes: 'Cafe exit, acquaintance indicating a clock but no specific time, open friendly posture and restrained casual mood.',
    }),
  },
  {
    slug: 'vo-skolko-udobno-time',
    title: { de: 'Welche Uhrzeit passt?', en: 'What time works?' },
    situation: {
      de: 'Ihr habt euch auf denselben Tag geeinigt, aber im Kalender fehlt noch eine passende Uhrzeit.',
      en: 'You have agreed on the same day, but the calendar still needs a suitable time.',
    },
    pedagogicalGoal: 'Mit einer unveränderlichen Form höflich nach der passenden Uhrzeit für die andere Person fragen.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Во сколько вам удобно?',
        baseText: { de: 'Um wie viel Uhr passt es Ihnen?', en: 'What time works for you?' },
      },
      meaning: {
        de: 'Eine rücksichtsvolle Zeitfrage, bei der die andere Person wählen kann.',
        en: 'A considerate timing question that lets the other person choose.',
      },
      chunks: [
        { id: 'vo-skolko-udobno-time-question', targetText: 'Во сколько', baseText: { de: 'Um wie viel Uhr', en: 'At what time' } },
        { id: 'vo-skolko-udobno-time-comfort', targetText: 'вам удобно?', baseText: { de: 'passt es Ihnen?', en: 'works for you?' } },
      ],
      lessonItems: [
        { id: 'vo-skolko-udobno-time-item-convenient', targetText: 'удобно', baseText: { de: 'passend / bequem', en: 'convenient / comfortable' }, acceptedAnswers: russianAccepted('удобно') },
        { id: 'vo-skolko-udobno-time-item-time', targetText: 'время', baseText: { de: 'Zeit', en: 'time' }, acceptedAnswers: russianAccepted('время') },
        { id: 'vo-skolko-udobno-time-item-hour', targetText: 'час', baseText: { de: 'Stunde / Uhr', en: 'hour / o’clock' }, acceptedAnswers: russianAccepted('час') },
        { id: 'vo-skolko-udobno-time-item-choose', targetText: 'выбирать', baseText: { de: 'auswählen', en: 'to choose' }, acceptedAnswers: russianAccepted('выбирать') },
        { id: 'vo-skolko-udobno-time-item-suit', targetText: 'подходить', baseText: { de: 'passen / geeignet sein', en: 'to suit / fit' }, acceptedAnswers: russianAccepted('подходить') },
      ],
      buildChips: ['Во сколько', 'вам удобно?', 'Где вам удобно?', 'Когда начинается фильм?'],
      typeRecall: {
        before: 'Во сколько вам ', answer: 'удобно', after: '?',
        acceptedAnswers: russianAccepted('удобно'),
        fallbackChoices: ['удобно', 'тихо', 'тепло', 'далеко'],
      },
      speakTarget: {
        baseCue: { de: 'Um wie viel Uhr passt es Ihnen?', en: 'What time works for you?' },
        targetPhrase: 'Во сколько вам удобно?',
        requiredTokens: ['сколько', 'вам', 'удобно'],
        optionalTokens: ['Во'],
      },
      sceneCaption: {
        de: 'Im geöffneten Kalender stehen mehrere freie Felder; die andere Person wartet, bevor sie eines auswählt.',
        en: 'Several slots are open in the calendar as the other person waits before choosing one.',
      },
      trophyWord: {
        word: 'удобно', meaning: { de: 'passend / bequem', en: 'convenient / comfortable' },
        example: 'Вам удобно после работы?',
        whyThisWord: { de: 'Die unveränderliche Form fragt rücksichtsvoll nach Zeit, Ort oder praktischer Passung.', en: 'This unchanging form asks considerately whether a time, place, or arrangement works.' },
      },
      placeholderCaption: { de: 'Handykalender mit mehreren leeren Zeitfeldern zwischen zwei Personen.', en: 'A phone calendar with several empty time slots between two people.' },
      songMood: 'easy schedule alignment',
      visualNotes: 'Open calendar with multiple blank options and no selection highlight, two acquaintances considering the schedule together.',
    }),
  },
  {
    slug: 'davayte-u-vkhoda-meet-here',
    title: { de: 'Treffen am Eingang', en: 'Meet at the entrance' },
    situation: {
      de: 'Vor einem großen Gebäude ist der Platz belebt, und du schlägst einer neuen Bekanntschaft einen klaren Treffpunkt vor.',
      en: 'The area outside a large building is busy, so you suggest a clear meeting point to a new acquaintance.',
    },
    pedagogicalGoal: 'Mit einer höflichen gemeinsamen Aufforderung einen konkreten Treffpunkt vereinbaren.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Давайте встретимся у входа.',
        baseText: { de: 'Treffen wir uns am Eingang.', en: 'Let’s meet at the entrance.' },
      },
      meaning: {
        de: 'Ein klarer gemeinsamer Vorschlag für einen leicht sichtbaren Treffpunkt.',
        en: 'A clear shared suggestion for an easy-to-see meeting point.',
      },
      chunks: [
        { id: 'davayte-u-vkhoda-meet-here-suggestion', targetText: 'Давайте встретимся', baseText: { de: 'Treffen wir uns', en: 'Let’s meet' } },
        { id: 'davayte-u-vkhoda-meet-here-place', targetText: 'у входа.', baseText: { de: 'am Eingang.', en: 'at the entrance.' } },
      ],
      lessonItems: [
        { id: 'davayte-u-vkhoda-meet-here-item-meet', targetText: 'встретиться', baseText: { de: 'sich treffen', en: 'to meet' }, acceptedAnswers: russianAccepted('встретиться') },
        { id: 'davayte-u-vkhoda-meet-here-item-entrance', targetText: 'вход', baseText: { de: 'Eingang', en: 'entrance' }, acceptedAnswers: russianAccepted('вход') },
        { id: 'davayte-u-vkhoda-meet-here-item-place', targetText: 'место', baseText: { de: 'Ort / Platz', en: 'place / spot' }, acceptedAnswers: russianAccepted('место') },
        { id: 'davayte-u-vkhoda-meet-here-item-wait', targetText: 'ждать', baseText: { de: 'warten', en: 'to wait' }, acceptedAnswers: russianAccepted('ждать') },
        { id: 'davayte-u-vkhoda-meet-here-item-together', targetText: 'вместе', baseText: { de: 'zusammen', en: 'together' }, acceptedAnswers: russianAccepted('вместе') },
      ],
      buildChips: ['Давайте встретимся', 'у входа.', 'Позвоните после работы.', 'Подождите на улице.'],
      typeRecall: {
        before: 'Давайте встретимся у ', answer: 'входа', after: '.',
        acceptedAnswers: russianAccepted('входа'),
        fallbackChoices: ['входа', 'окна', 'лифта', 'метро'],
      },
      speakTarget: {
        baseCue: { de: 'Treffen wir uns am Eingang.', en: 'Let’s meet at the entrance.' },
        targetPhrase: 'Давайте встретимся у входа.',
        requiredTokens: ['Давайте', 'встретимся', 'входа'],
        optionalTokens: ['у'],
      },
      sceneCaption: {
        de: 'Der Platz vor dem Gebäude ist voll; deine Bekanntschaft hält den Kalender offen und wartet auf einen Treffpunktvorschlag.',
        en: 'The area by the building is crowded; your acquaintance holds the calendar open and waits for a meeting-point suggestion.',
      },
      trophyWord: {
        word: 'вход', meaning: { de: 'Eingang', en: 'entrance' },
        example: 'Вы ждёте у входа?',
        whyThisWord: { de: 'Ein Eingang ist ein sichtbarer, eindeutiger Treffpunkt an Cafés, Bahnhöfen und öffentlichen Gebäuden.', en: 'An entrance is a visible, unambiguous meeting point at cafes, stations, and public buildings.' },
      },
      placeholderCaption: { de: 'Belebter Platz vor einem großen Gebäude mit mehreren gut sichtbaren Orientierungspunkten.', en: 'A busy area outside a large building with several visible landmarks.' },
      songMood: 'clear meeting-point plan',
      visualNotes: 'Busy public-building forecourt, several possible landmarks and no highlighted meeting point, acquaintance waiting for the proposal.',
    }),
  },
  {
    slug: 'zhdu-na-ulitse-outside',
    title: { de: 'Ich warte draußen', en: 'I am waiting outside' },
    situation: {
      de: 'Du wartest vor einem Café; die andere Person ruft an und möchte wissen, wo du bist.',
      en: 'You are waiting outside a cafe; the other person calls and wants to know where you are.',
    },
    pedagogicalGoal: 'Mit einem Präsensverb und einer festen Ortsangabe den eigenen Warteplatz nennen.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Я жду вас на улице.',
        baseText: { de: 'Ich warte draußen auf Sie.', en: 'I am waiting for you outside.' },
      },
      meaning: {
        de: 'Eine klare, geschlechtsneutrale Standortmeldung während des Wartens.',
        en: 'A clear, gender-neutral location update while waiting.',
      },
      chunks: [
        { id: 'zhdu-na-ulitse-outside-wait', targetText: 'Я жду вас', baseText: { de: 'Ich warte auf Sie', en: 'I am waiting for you' } },
        { id: 'zhdu-na-ulitse-outside-location', targetText: 'на улице.', baseText: { de: 'draußen.', en: 'outside.' } },
      ],
      lessonItems: [
        { id: 'zhdu-na-ulitse-outside-item-wait', targetText: 'ждать', baseText: { de: 'warten', en: 'to wait' }, acceptedAnswers: russianAccepted('ждать') },
        { id: 'zhdu-na-ulitse-outside-item-street', targetText: 'улица', baseText: { de: 'Straße', en: 'street' }, acceptedAnswers: russianAccepted('улица') },
        { id: 'zhdu-na-ulitse-outside-item-outside', targetText: 'снаружи', baseText: { de: 'draußen / außen', en: 'outside' }, acceptedAnswers: russianAccepted('снаружи') },
        { id: 'zhdu-na-ulitse-outside-item-entrance', targetText: 'вход', baseText: { de: 'Eingang', en: 'entrance' }, acceptedAnswers: russianAccepted('вход') },
        { id: 'zhdu-na-ulitse-outside-item-waiting', targetText: 'ожидание', baseText: { de: 'Warten / Wartezeit', en: 'waiting / wait' }, acceptedAnswers: russianAccepted('ожидание') },
      ],
      buildChips: ['Я жду вас', 'на улице.', 'у стойки.', 'Я уже внутри.'],
      typeRecall: {
        before: 'Я жду вас на ', answer: 'улице', after: '.',
        acceptedAnswers: russianAccepted('улице'),
        fallbackChoices: ['улице', 'вокзале', 'платформе', 'остановке'],
      },
      speakTarget: {
        baseCue: { de: 'Ich warte draußen auf Sie.', en: 'I am waiting for you outside.' },
        targetPhrase: 'Я жду вас на улице.',
        requiredTokens: ['жду', 'вас', 'улице'],
        optionalTokens: ['Я', 'на'],
      },
      sceneCaption: {
        de: 'Die Caféfassade und dein klingelndes Handy bestimmen den Moment; am anderen Ende wartet jemand auf deine Ortsangabe.',
        en: 'The cafe facade and your ringing phone frame the moment; someone on the line waits for your location.',
      },
      trophyWord: {
        word: 'ждать', meaning: { de: 'warten', en: 'to wait' },
        example: 'Вы ждёте меня у входа?',
        whyThisWord: { de: 'Das häufige Verb hält Verabredungen, Verkehr und kurze Verzögerungen sprachlich zusammen.', en: 'This common verb ties together meeting plans, transport, and brief delays.' },
      },
      placeholderCaption: { de: 'Caféfassade mit klingelndem Handy und mehreren möglichen Warteplätzen im Bild.', en: 'A cafe facade with a ringing phone and several possible waiting spots in view.' },
      songMood: 'patient street-side wait',
      visualNotes: 'Exterior cafe setting, phone call active, several possible positions near the building, no on-screen label giving the learner location.',
    }),
  },
  {
    slug: 'nemnogo-opazdyvayu-late',
    title: { de: 'Ich verspäte mich etwas', en: 'I am running a little late' },
    situation: {
      de: 'Dein Bus steckt im dichten Verkehr, und du rufst die wartende Bekanntschaft am Treffpunkt an.',
      en: 'Your bus is caught in heavy traffic, so you call the acquaintance waiting at the meeting point.',
    },
    pedagogicalGoal: 'Eine kleine Verspätung im geschlechtsneutralen Präsens höflich ankündigen.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Я немного опаздываю, извините.',
        baseText: { de: 'Ich verspäte mich etwas, entschuldigen Sie.', en: 'I am running a little late, sorry.' },
      },
      meaning: {
        de: 'Eine ehrliche, höfliche Meldung über eine aktuelle kleine Verzögerung.',
        en: 'An honest polite update about a small delay happening now.',
      },
      chunks: [
        { id: 'nemnogo-opazdyvayu-late-delay', targetText: 'Я немного опаздываю,', baseText: { de: 'Ich verspäte mich etwas,', en: 'I am running a little late,' } },
        { id: 'nemnogo-opazdyvayu-late-apology', targetText: 'извините.', baseText: { de: 'entschuldigen Sie.', en: 'sorry.' } },
      ],
      lessonItems: [
        { id: 'nemnogo-opazdyvayu-late-item-be-late', targetText: 'опаздывать', baseText: { de: 'sich verspäten', en: 'to be late' }, acceptedAnswers: russianAccepted('опаздывать') },
        { id: 'nemnogo-opazdyvayu-late-item-little', targetText: 'немного', baseText: { de: 'ein wenig', en: 'a little' }, acceptedAnswers: russianAccepted('немного') },
        { id: 'nemnogo-opazdyvayu-late-item-excuse', targetText: 'извинить', baseText: { de: 'entschuldigen', en: 'to excuse' }, acceptedAnswers: russianAccepted('извинить') },
        { id: 'nemnogo-opazdyvayu-late-item-delay', targetText: 'задержка', baseText: { de: 'Verzögerung', en: 'delay' }, acceptedAnswers: russianAccepted('задержка') },
        { id: 'nemnogo-opazdyvayu-late-item-time', targetText: 'время', baseText: { de: 'Zeit', en: 'time' }, acceptedAnswers: russianAccepted('время') },
      ],
      buildChips: ['Я немного опаздываю,', 'извините.', 'Я уже рядом.', 'Подождите внутри.'],
      typeRecall: {
        before: 'Я немного ', answer: 'опаздываю', after: ', извините.',
        acceptedAnswers: russianAccepted('опаздываю'),
        fallbackChoices: ['опаздываю', 'завтракаю', 'работаю', 'отдыхаю'],
      },
      speakTarget: {
        baseCue: { de: 'Ich verspäte mich etwas, entschuldigen Sie.', en: 'I am running a little late, sorry.' },
        targetPhrase: 'Я немного опаздываю, извините.',
        requiredTokens: ['немного', 'опаздываю', 'извините'],
        optionalTokens: ['Я'],
      },
      sceneCaption: {
        de: 'Der Bus steht im dichten Verkehr; auf dem Handy erscheint ein Anruf vom vereinbarten Treffpunkt.',
        en: 'The bus is sitting in heavy traffic as a call from the meeting point appears on your phone.',
      },
      trophyWord: {
        word: 'опаздывать', meaning: { de: 'sich verspäten', en: 'to be late' },
        example: 'Вы часто опаздываете на поезд?',
        whyThisWord: { de: 'Das Präsensverb meldet eine laufende Verspätung, ohne Geschlecht oder Vergangenheit zu markieren.', en: 'The present-tense verb reports an ongoing delay without marking gender or using the past.' },
      },
      placeholderCaption: { de: 'Bus im dichten Stadtverkehr mit eingehendem Anruf auf dem Handy.', en: 'A bus in heavy city traffic with an incoming call on the phone.' },
      songMood: 'gentle delayed arrival',
      visualNotes: 'Public bus paused in traffic, incoming-call screen without message text, visible but unreadable street clock, calm rather than dramatic delay.',
    }),
  },
  {
    slug: 'izmenit-nash-plan-change',
    title: { de: 'Den Plan ändern', en: 'Change the plan' },
    situation: {
      de: 'Das gewählte Café ist geschlossen, und du fragst deine Bekanntschaft, ob ihr den gemeinsamen Plan ändern könnt.',
      en: 'The chosen cafe is closed, so you ask your acquaintance whether you can change the shared plan.',
    },
    pedagogicalGoal: 'Mit einer unpersönlichen Erlaubnisfrage eine gemeinsame Planänderung vorschlagen.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Можно изменить наш план?',
        baseText: { de: 'Können wir unseren Plan ändern?', en: 'Can we change our plan?' },
      },
      meaning: {
        de: 'Eine höfliche Frage, bevor eine bereits vereinbarte Aktivität angepasst wird.',
        en: 'A polite question before adjusting an activity that was already arranged.',
      },
      chunks: [
        { id: 'izmenit-nash-plan-change-action', targetText: 'Можно изменить', baseText: { de: 'Können wir ändern', en: 'Can we change' } },
        { id: 'izmenit-nash-plan-change-plan', targetText: 'наш план?', baseText: { de: 'unseren Plan?', en: 'our plan?' } },
      ],
      lessonItems: [
        { id: 'izmenit-nash-plan-change-item-change', targetText: 'изменить', baseText: { de: 'ändern', en: 'to change' }, acceptedAnswers: russianAccepted('изменить') },
        { id: 'izmenit-nash-plan-change-item-plan', targetText: 'план', baseText: { de: 'Plan', en: 'plan' }, acceptedAnswers: russianAccepted('план') },
        { id: 'izmenit-nash-plan-change-item-place', targetText: 'место', baseText: { de: 'Ort', en: 'place' }, acceptedAnswers: russianAccepted('место') },
        { id: 'izmenit-nash-plan-change-item-time', targetText: 'время', baseText: { de: 'Zeit', en: 'time' }, acceptedAnswers: russianAccepted('время') },
        { id: 'izmenit-nash-plan-change-item-choose', targetText: 'выбрать', baseText: { de: 'auswählen', en: 'to choose' }, acceptedAnswers: russianAccepted('выбрать') },
      ],
      buildChips: ['Можно изменить', 'наш план?', 'Можно выбрать кафе?', 'Наш поезд отправляется?'],
      typeRecall: {
        before: 'Можно ', answer: 'изменить', after: ' наш план?',
        acceptedAnswers: russianAccepted('изменить'),
        fallbackChoices: ['изменить', 'сфотографировать', 'закрыть', 'услышать'],
      },
      speakTarget: {
        baseCue: { de: 'Können wir unseren Plan ändern?', en: 'Can we change our plan?' },
        targetPhrase: 'Можно изменить наш план?',
        requiredTokens: ['Можно', 'изменить', 'план'],
        optionalTokens: ['наш'],
      },
      sceneCaption: {
        de: 'Vor einer dunklen Cafétür hält die andere Person den gemeinsamen Kalender geöffnet und wartet auf deinen Vorschlag.',
        en: 'Outside a dark cafe door, the other person holds the shared calendar open and waits for your suggestion.',
      },
      trophyWord: {
        word: 'план', meaning: { de: 'Plan', en: 'plan' },
        example: 'Вы хотите изменить план?',
        whyThisWord: { de: 'Das kurze Nomen bündelt Zeit, Ort und Aktivität und lässt sich deshalb leicht neu verhandeln.', en: 'This short noun gathers time, place, and activity, making it easy to renegotiate.' },
      },
      placeholderCaption: { de: 'Dunkle Cafétür, geöffnetes Handy mit Kalender und zwei wartende Personen.', en: 'A dark cafe door, an open phone calendar, and two people waiting.' },
      songMood: 'flexible friendly rethink',
      visualNotes: 'Closed neighborhood cafe without readable signage, shared calendar open, both acquaintances considering alternatives before anyone states one.',
    }),
  },
  {
    slug: 'uvidimsya-posle-obeda-tomorrow',
    title: { de: 'Bis morgen nach dem Mittagessen', en: 'See you tomorrow afternoon' },
    situation: {
      de: 'Der nächste Termin ist im Kalender gespeichert, und die andere Person zieht zum Abschied bereits den Mantel an.',
      en: 'The next plan is saved in the calendar, and the other person is already putting on a coat to leave.',
    },
    pedagogicalGoal: 'Ein nächstes Wiedersehen mit Tages- und Mahlzeitenbezug geschlechtsneutral ankündigen.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Увидимся завтра после обеда.',
        baseText: { de: 'Wir sehen uns morgen nach dem Mittagessen.', en: 'See you tomorrow after lunch.' },
      },
      meaning: {
        de: 'Ein natürlicher Abschied mit einem bereits vereinbarten Zeitfenster am nächsten Tag.',
        en: 'A natural farewell with an already agreed time window on the next day.',
      },
      chunks: [
        { id: 'uvidimsya-posle-obeda-tomorrow-day', targetText: 'Увидимся завтра', baseText: { de: 'Wir sehen uns morgen', en: 'See you tomorrow' } },
        { id: 'uvidimsya-posle-obeda-tomorrow-time', targetText: 'после обеда.', baseText: { de: 'nach dem Mittagessen.', en: 'after lunch.' } },
      ],
      lessonItems: [
        { id: 'uvidimsya-posle-obeda-tomorrow-item-see', targetText: 'увидеться', baseText: { de: 'sich sehen', en: 'to see each other' }, acceptedAnswers: russianAccepted('увидеться') },
        { id: 'uvidimsya-posle-obeda-tomorrow-item-tomorrow', targetText: 'завтра', baseText: { de: 'morgen', en: 'tomorrow' }, acceptedAnswers: russianAccepted('завтра') },
        { id: 'uvidimsya-posle-obeda-tomorrow-item-lunch', targetText: 'обед', baseText: { de: 'Mittagessen', en: 'lunch' }, acceptedAnswers: russianAccepted('обед') },
        { id: 'uvidimsya-posle-obeda-tomorrow-item-day', targetText: 'день', baseText: { de: 'Tag', en: 'day' }, acceptedAnswers: russianAccepted('день') },
        { id: 'uvidimsya-posle-obeda-tomorrow-item-calendar', targetText: 'календарь', baseText: { de: 'Kalender', en: 'calendar' }, acceptedAnswers: russianAccepted('календарь') },
      ],
      buildChips: ['Увидимся завтра', 'после обеда.', 'Встретимся утром.', 'Напишите после работы.'],
      typeRecall: {
        before: 'Увидимся ', answer: 'завтра', after: ' после обеда.',
        acceptedAnswers: russianAccepted('завтра'),
        fallbackChoices: ['завтра', 'сегодня', 'сразу', 'снаружи'],
      },
      speakTarget: {
        baseCue: { de: 'Wir sehen uns morgen nach dem Mittagessen.', en: 'See you tomorrow after lunch.' },
        targetPhrase: 'Увидимся завтра после обеда.',
        requiredTokens: ['Увидимся', 'завтра', 'обеда'],
        optionalTokens: ['после'],
      },
      sceneCaption: {
        de: 'Der Termin ist im Kalender gespeichert; die andere Person zieht den Mantel an und wartet auf deinen Abschied.',
        en: 'The plan is saved in the calendar; the other person puts on a coat and waits for your farewell.',
      },
      trophyWord: {
        word: 'обед', meaning: { de: 'Mittagessen', en: 'lunch' },
        example: 'Вы приходите после обеда?',
        whyThisWord: { de: 'Die mittlere Mahlzeit dient im Alltag oft als einfache Zeitgrenze für Verabredungen.', en: 'The midday meal often serves as a simple everyday time boundary for plans.' },
      },
      placeholderCaption: { de: 'Gespeicherter Kalendereintrag auf dem Handy neben Mantel und Cafétür.', en: 'A saved calendar entry on a phone beside a coat and cafe door.' },
      songMood: 'bright next-day farewell',
      visualNotes: 'Cafe departure with coat going on, phone calendar showing a saved but unreadable appointment, warm restrained farewell posture.',
    }),
  },
  {
    slug: 'zhelayu-dobroy-nochi-good-night',
    title: { de: 'Ich wünsche Ihnen eine gute Nacht', en: 'I wish you a good night' },
    situation: {
      de: 'Nach einem späten Cafébesuch trennt ihr euch an der Tür, und die andere Person wartet auf deinen letzten Gruß.',
      en: 'After a late cafe visit, you part at the door and the other person waits for your final farewell.',
    },
    pedagogicalGoal: 'Mit einem Präsensverb und dem höflichen Dativ einen persönlichen Nachtwunsch äußern.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Желаю вам доброй ночи.',
        baseText: { de: 'Ich wünsche Ihnen eine gute Nacht.', en: 'I wish you a good night.' },
      },
      meaning: {
        de: 'Ein warmer, formeller Nachtgruß ohne geschlechtsspezifische Sprecherform.',
        en: 'A warm formal night wish without any gendered speaker form.',
      },
      chunks: [
        { id: 'zhelayu-dobroy-nochi-good-night-wish', targetText: 'Желаю вам', baseText: { de: 'Ich wünsche Ihnen', en: 'I wish you' } },
        { id: 'zhelayu-dobroy-nochi-good-night-night', targetText: 'доброй ночи.', baseText: { de: 'eine gute Nacht.', en: 'a good night.' } },
      ],
      lessonItems: [
        { id: 'zhelayu-dobroy-nochi-good-night-item-wish', targetText: 'желать', baseText: { de: 'wünschen', en: 'to wish' }, acceptedAnswers: russianAccepted('желать') },
        { id: 'zhelayu-dobroy-nochi-good-night-item-kind', targetText: 'добрый', baseText: { de: 'gut / freundlich', en: 'good / kind' }, acceptedAnswers: russianAccepted('добрый') },
        { id: 'zhelayu-dobroy-nochi-good-night-item-night', targetText: 'ночь', baseText: { de: 'Nacht', en: 'night' }, acceptedAnswers: russianAccepted('ночь') },
        { id: 'zhelayu-dobroy-nochi-good-night-item-rest', targetText: 'отдых', baseText: { de: 'Erholung / Ruhe', en: 'rest' }, acceptedAnswers: russianAccepted('отдых') },
        { id: 'zhelayu-dobroy-nochi-good-night-item-sleep', targetText: 'сон', baseText: { de: 'Schlaf', en: 'sleep' }, acceptedAnswers: russianAccepted('сон') },
      ],
      buildChips: ['Желаю вам', 'доброй ночи.', 'Доброе утро.', 'Спасибо за прогулку.'],
      typeRecall: {
        before: '', answer: 'Желаю', after: ' вам доброй ночи.',
        acceptedAnswers: russianAccepted('Желаю'),
        fallbackChoices: ['Желаю', 'Пишу', 'Звоню', 'Показываю'],
      },
      speakTarget: {
        baseCue: { de: 'Ich wünsche Ihnen eine gute Nacht.', en: 'I wish you a good night.' },
        targetPhrase: 'Желаю вам доброй ночи.',
        requiredTokens: ['Желаю', 'вам', 'ночи'],
        optionalTokens: ['доброй'],
      },
      sceneCaption: {
        de: 'Vor der Cafétür ist die Straße ruhig; die andere Person hält kurz inne und wartet auf deinen Abschiedsgruß.',
        en: 'The street outside the cafe is quiet; the other person pauses and waits for your farewell.',
      },
      trophyWord: {
        word: 'желать', meaning: { de: 'wünschen', en: 'to wish' },
        example: 'Желаю вам хорошего отдыха.',
        whyThisWord: { de: 'Das Verb macht Wünsche zu Nacht, Reise, Erholung und besonderen Tagen persönlich und höflich.', en: 'This verb makes wishes for the night, travel, rest, and special days personal and polite.' },
      },
      placeholderCaption: { de: 'Ruhige Straße vor einer spät beleuchteten Cafétür mit zwei Personen beim Abschied.', en: 'A quiet street outside a softly lit late-night cafe with two people parting.' },
      songMood: 'gentle midnight farewell',
      visualNotes: 'Quiet cafe exterior at night, two acquaintances about to walk in different directions, no informal embrace or spoken resolution.',
    }),
  },
]

export const RUSSIAN_A1_PRACTICAL_9_LESSONS: GuidedLessonDefinition[] = makeRussianPracticalLessons(
  GUIDED_TODAY_PATH_RUSSIAN_NINE_METADATA,
  russianA1Practical9Inputs,
  { de: 'Du hast Russisch A1 Praxis 9 abgeschlossen.', en: 'You have completed Russian A1 Practical 9.' },
)

export const GUIDED_TODAY_PATH_RUSSIAN_TEN_METADATA: GuidedPathMetadata = {
  id: 'russian-a1-practical-10',
  title: 'Russian A1 Practical 10',
  shortTitle: 'A1 Practical 10',
  subtitle: { de: 'Tagesrückblick und Abschied', en: 'Day-end reflections and goodbyes' },
  level: 'A1',
  baseLanguage: 'German',
  targetLanguage: 'Russian',
  estimatedMinutes: 5,
}

const russianA1Practical10Inputs: RussianLessonInput[] = [
  {
    slug: 'segodnya-khoroshiy-den-good-day',
    title: { de: 'Ein guter Tag', en: 'A good day' },
    situation: {
      de: 'Nach Wegen durch die Stadt, einem Einkauf in der Apotheke und einer Metrofahrt sitzt du mit deiner Begleitung am Caféfenster und ziehst ein kurzes Tagesfazit.',
      en: 'After navigating the city, visiting a pharmacy, and riding the metro, you sit with your companion by a cafe window and sum up the day.',
    },
    pedagogicalGoal: 'Mit einer Zeitangabe und einem einfachen Nomen ein positives Tagesfazit im Präsens geben.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Сегодня хороший день.',
        baseText: { de: 'Heute ist ein guter Tag.', en: 'Today is a good day.' },
      },
      meaning: {
        de: 'Eine kurze positive Bilanz für einen gelungenen Tag unterwegs.',
        en: 'A short positive reflection on a day that has gone well.',
      },
      chunks: [
        { id: 'segodnya-khoroshiy-den-good-day-today', targetText: 'Сегодня', baseText: { de: 'Heute', en: 'Today' } },
        { id: 'segodnya-khoroshiy-den-good-day-summary', targetText: 'хороший день.', baseText: { de: 'ist ein guter Tag.', en: 'is a good day.' } },
      ],
      lessonItems: [
        { id: 'segodnya-khoroshiy-den-good-day-item-day', targetText: 'день', baseText: { de: 'Tag', en: 'day' }, acceptedAnswers: russianAccepted('день') },
        { id: 'segodnya-khoroshiy-den-good-day-item-today', targetText: 'сегодня', baseText: { de: 'heute', en: 'today' }, acceptedAnswers: russianAccepted('сегодня') },
        { id: 'segodnya-khoroshiy-den-good-day-item-good', targetText: 'хороший', baseText: { de: 'gut', en: 'good' }, acceptedAnswers: russianAccepted('хороший') },
        { id: 'segodnya-khoroshiy-den-good-day-item-impression', targetText: 'впечатление', baseText: { de: 'Eindruck', en: 'impression' }, acceptedAnswers: russianAccepted('впечатление') },
        { id: 'segodnya-khoroshiy-den-good-day-item-mood', targetText: 'настроение', baseText: { de: 'Stimmung', en: 'mood' }, acceptedAnswers: russianAccepted('настроение') },
      ],
      buildChips: ['Сегодня', 'хороший день.', 'Завтра', 'дождливый вечер.'],
      typeRecall: {
        before: 'Сегодня ', answer: 'хороший', after: ' день.',
        acceptedAnswers: russianAccepted('хороший'),
        fallbackChoices: ['хороший', 'дождливый', 'зимний', 'свободный'],
      },
      speakTarget: {
        baseCue: { de: 'Heute ist ein guter Tag.', en: 'Today is a good day.' },
        targetPhrase: 'Сегодня хороший день.',
        requiredTokens: ['Сегодня', 'хороший', 'день'],
        optionalTokens: [],
      },
      sceneCaption: {
        de: 'Abendlicht fällt durch das Caféfenster; deine Begleitung blickt vom gefalteten Stadtplan auf und wartet auf deinen Rückblick.',
        en: 'Evening light falls through the cafe window as your companion looks up from a folded city map and waits for your reflection.',
      },
      trophyWord: {
        word: 'день',
        meaning: { de: 'Tag', en: 'day' },
        example: 'Пусть ваш день будет хорошим.',
        whyThisWord: { de: 'Dieses Grundwort macht einfache Rückblicke, Wünsche und Zeitangaben sofort möglich.', en: 'This basic word immediately supports simple reflections, wishes, and time references.' },
      },
      placeholderCaption: { de: 'Caféfenster im Abendlicht, daneben ein gefalteter Metroplan und eine Tasse.', en: 'A cafe window at dusk with a folded metro map and a cup beside it.' },
      songMood: 'contented evening reflection',
      visualNotes: 'Warm cafe window after a full city day, folded transit map and pharmacy bag visible, companion waiting rather than reacting.',
    }),
  },
  {
    slug: 'zdes-krasivoe-mesto-beautiful-place',
    title: { de: 'Ein schöner Ort', en: 'A beautiful place' },
    situation: {
      de: 'Neben einem Metroausgang entdeckst du mit deiner Begleitung einen ruhigen Innenhof hinter einem kleinen Café und reagierst auf den Ort.',
      en: 'Near a metro exit, you and your companion discover a quiet courtyard behind a small cafe, and you react to the setting.',
    },
    pedagogicalGoal: 'Einen sichtbaren Ort mit einem Ortsadverb und einer einfachen positiven Eigenschaft beschreiben.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Здесь очень красивое место.',
        baseText: { de: 'Hier ist ein sehr schöner Ort.', en: 'This is a very beautiful place.' },
      },
      meaning: {
        de: 'Eine spontane, höflich neutrale Reaktion auf einen Ort, der dir gefällt.',
        en: 'A spontaneous, politely neutral reaction to a place you like.',
      },
      chunks: [
        { id: 'zdes-krasivoe-mesto-beautiful-place-location', targetText: 'Здесь', baseText: { de: 'Hier', en: 'Here' } },
        { id: 'zdes-krasivoe-mesto-beautiful-place-description', targetText: 'очень красивое место.', baseText: { de: 'ist ein sehr schöner Ort.', en: 'is a very beautiful place.' } },
      ],
      lessonItems: [
        { id: 'zdes-krasivoe-mesto-beautiful-place-item-place', targetText: 'место', baseText: { de: 'Ort / Platz', en: 'place / spot' }, acceptedAnswers: russianAccepted('место') },
        { id: 'zdes-krasivoe-mesto-beautiful-place-item-beautiful', targetText: 'красивый', baseText: { de: 'schön', en: 'beautiful' }, acceptedAnswers: russianAccepted('красивый') },
        { id: 'zdes-krasivoe-mesto-beautiful-place-item-courtyard', targetText: 'двор', baseText: { de: 'Hof', en: 'courtyard' }, acceptedAnswers: russianAccepted('двор') },
        { id: 'zdes-krasivoe-mesto-beautiful-place-item-cafe', targetText: 'кафе', baseText: { de: 'Café', en: 'cafe' }, acceptedAnswers: russianAccepted('кафе') },
        { id: 'zdes-krasivoe-mesto-beautiful-place-item-view', targetText: 'вид', baseText: { de: 'Aussicht / Anblick', en: 'view' }, acceptedAnswers: russianAccepted('вид') },
      ],
      buildChips: ['Здесь', 'очень красивое место.', 'Около аптеки', 'слишком шумно.'],
      typeRecall: {
        before: 'Здесь очень ', answer: 'красивое', after: ' место.',
        acceptedAnswers: russianAccepted('красивое'),
        fallbackChoices: ['красивое', 'тихое', 'новое', 'знакомое'],
      },
      speakTarget: {
        baseCue: { de: 'Hier ist ein sehr schöner Ort.', en: 'This is a very beautiful place.' },
        targetPhrase: 'Здесь очень красивое место.',
        requiredTokens: ['Здесь', 'красивое', 'место'],
        optionalTokens: ['очень'],
      },
      sceneCaption: {
        de: 'Hinter dem Metroausgang öffnet sich ein stiller Innenhof; deine Begleitung bleibt stehen und wartet auf deine erste Reaktion.',
        en: 'A quiet courtyard opens beyond the metro exit; your companion pauses and waits for your first reaction.',
      },
      trophyWord: {
        word: 'место',
        meaning: { de: 'Ort / Platz', en: 'place / spot' },
        example: 'Вы знаете это красивое место?',
        whyThisWord: { de: 'Das Nomen hilft beim Beschreiben, Verabreden und Suchen in der Stadt.', en: 'This noun helps with describing, arranging meetings, and finding locations around town.' },
      },
      placeholderCaption: { de: 'Ruhiger Innenhof zwischen Café und Metroausgang, mit Bäumen und warmen Fenstern.', en: 'A quiet courtyard between a cafe and metro exit, with trees and warmly lit windows.' },
      songMood: 'bright courtyard wonder',
      visualNotes: 'Region-neutral Russian courtyard near a metro entrance, subtle pharmacy cross in the distance, companion pausing before any opinion is given.',
    }),
  },
  {
    slug: 'blagodaryu-za-vsyo-thank-everything',
    title: { de: 'Danke für alles', en: 'Thank you for everything' },
    situation: {
      de: 'Eine Mitarbeiterin in der Apotheke hat Dosierzeiten markiert, den Weg zur Metro auf einer Karte gezeigt und legt nun die Tüte auf den Tresen.',
      en: 'A pharmacy staff member has marked dosage times, shown the way to the metro on a map, and now places the bag on the counter.',
    },
    pedagogicalGoal: 'Mit einem geschlechtsneutralen Präsensverb umfassend und formell danken.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Благодарю вас за всё.',
        baseText: { de: 'Ich danke Ihnen für alles.', en: 'Thank you for everything.' },
      },
      meaning: {
        de: 'Ein warmer formeller Dank, wenn eine Person dir auf mehrere Arten geholfen hat.',
        en: 'Warm formal thanks when one person has helped you in several ways.',
      },
      chunks: [
        { id: 'blagodaryu-za-vsyo-thank-everything-thanks', targetText: 'Благодарю вас', baseText: { de: 'Ich danke Ihnen', en: 'I thank you' } },
        { id: 'blagodaryu-za-vsyo-thank-everything-all', targetText: 'за всё.', baseText: { de: 'für alles.', en: 'for everything.' } },
      ],
      lessonItems: [
        { id: 'blagodaryu-za-vsyo-thank-everything-item-thank', targetText: 'благодарить', baseText: { de: 'danken', en: 'to thank' }, acceptedAnswers: russianAccepted('благодарить') },
        { id: 'blagodaryu-za-vsyo-thank-everything-item-gratitude', targetText: 'благодарность', baseText: { de: 'Dankbarkeit / Dank', en: 'gratitude / thanks' }, acceptedAnswers: russianAccepted('благодарность') },
        { id: 'blagodaryu-za-vsyo-thank-everything-item-kindness', targetText: 'доброта', baseText: { de: 'Freundlichkeit / Güte', en: 'kindness' }, acceptedAnswers: russianAccepted('доброта') },
        { id: 'blagodaryu-za-vsyo-thank-everything-item-advice', targetText: 'совет', baseText: { de: 'Rat / Tipp', en: 'advice / tip' }, acceptedAnswers: russianAccepted('совет') },
        { id: 'blagodaryu-za-vsyo-thank-everything-item-support', targetText: 'поддержка', baseText: { de: 'Unterstützung', en: 'support' }, acceptedAnswers: russianAccepted('поддержка') },
      ],
      buildChips: ['Благодарю вас', 'за всё.', 'Прошу прощения', 'за вопрос.'],
      typeRecall: {
        before: '', answer: 'Благодарю', after: ' вас за всё.',
        acceptedAnswers: russianAccepted('Благодарю'),
        fallbackChoices: ['Благодарю', 'Спрашиваю', 'Зову', 'Слышу'],
      },
      speakTarget: {
        baseCue: { de: 'Ich danke Ihnen für alles.', en: 'Thank you for everything.' },
        targetPhrase: 'Благодарю вас за всё.',
        requiredTokens: ['Благодарю', 'вас', 'всё'],
        optionalTokens: ['за'],
      },
      sceneCaption: {
        de: 'Auf dem Apothekentresen liegen eine beschriftete Packung, eine Papiertüte und die markierte Karte; die Mitarbeiterin lässt dir den Schlussmoment.',
        en: 'A labeled medicine box, paper bag, and marked map rest on the pharmacy counter as the staff member leaves the closing moment to you.',
      },
      trophyWord: {
        word: 'благодарить',
        meaning: { de: 'danken', en: 'to thank' },
        example: 'Благодарю вас за добрый совет.',
        whyThisWord: { de: 'Das Verb trägt einen persönlichen formellen Dank und passt besonders gut nach ausführlicher Unterstützung.', en: 'This verb carries personal formal thanks and fits especially well after substantial help.' },
      },
      placeholderCaption: { de: 'Apothekentresen mit Papiertüte, markierten Einnahmezeiten und einer gefalteten Stadtkarte.', en: 'A pharmacy counter with a paper bag, marked dosage times, and a folded city map.' },
      songMood: 'grateful pharmacy farewell',
      visualNotes: 'Neighborhood pharmacy counter, medicine instructions and transit map as evidence of several kinds of help, staff member quietly awaiting the learner.',
    }),
  },
  {
    slug: 'ponimayu-russkiy-luchshe-progress',
    title: { de: 'Russisch immer besser verstehen', en: 'Understanding more Russian' },
    situation: {
      de: 'Auf einem Metrosteig erkennst du mehrere Schilder ohne Übersetzung, und deine Sprachbegleitung fragt, wie das Lernen vorangeht.',
      en: 'On a metro platform, you recognize several signs without translation, and your language companion asks how learning is going.',
    },
    pedagogicalGoal: 'Lernfortschritt mit einem Präsensverb und der festen Steigerungsform alles besser ausdrücken.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Я всё лучше понимаю русский.',
        baseText: { de: 'Ich verstehe Russisch immer besser.', en: 'I understand Russian better and better.' },
      },
      meaning: {
        de: 'Eine geschlechtsneutrale Aussage über wachsenden Sprachfortschritt im Präsens.',
        en: 'A gender-neutral present-tense statement about growing language progress.',
      },
      chunks: [
        { id: 'ponimayu-russkiy-luchshe-progress-growth', targetText: 'Я всё лучше', baseText: { de: 'Ich verstehe immer besser', en: 'I am getting better and better at' } },
        { id: 'ponimayu-russkiy-luchshe-progress-language', targetText: 'понимаю русский.', baseText: { de: 'Russisch zu verstehen.', en: 'understanding Russian.' } },
      ],
      lessonItems: [
        { id: 'ponimayu-russkiy-luchshe-progress-item-russian', targetText: 'русский', baseText: { de: 'Russisch', en: 'Russian' }, acceptedAnswers: russianAccepted('русский') },
        { id: 'ponimayu-russkiy-luchshe-progress-item-understand', targetText: 'понимать', baseText: { de: 'verstehen', en: 'to understand' }, acceptedAnswers: russianAccepted('понимать') },
        { id: 'ponimayu-russkiy-luchshe-progress-item-better', targetText: 'лучше', baseText: { de: 'besser', en: 'better' }, acceptedAnswers: russianAccepted('лучше') },
        { id: 'ponimayu-russkiy-luchshe-progress-item-language', targetText: 'язык', baseText: { de: 'Sprache / Zunge', en: 'language / tongue' }, acceptedAnswers: russianAccepted('язык') },
        { id: 'ponimayu-russkiy-luchshe-progress-item-sign', targetText: 'вывеска', baseText: { de: 'Schild / Ladenschild', en: 'sign / shop sign' }, acceptedAnswers: russianAccepted('вывеска') },
      ],
      buildChips: ['Я всё лучше', 'понимаю русский.', 'Я читаю вывески', 'очень медленно.'],
      typeRecall: {
        before: 'Я всё лучше понимаю ', answer: 'русский', after: '.',
        acceptedAnswers: russianAccepted('русский'),
        fallbackChoices: ['русский', 'маршрут', 'номер', 'рецепт'],
      },
      speakTarget: {
        baseCue: { de: 'Ich verstehe Russisch immer besser.', en: 'I understand Russian better and better.' },
        targetPhrase: 'Я всё лучше понимаю русский.',
        requiredTokens: ['понимаю', 'русский', 'лучше'],
        optionalTokens: ['Я', 'всё'],
      },
      sceneCaption: {
        de: 'Auf dem Metrosteig zeigen Pfeile zu Ausgang, Linie und Umstieg; deine Begleitung deutet auf die Schilder und wartet auf deine Einschätzung.',
        en: 'On the metro platform, arrows point toward the exit, line, and transfer; your companion gestures to the signs and waits for your assessment.',
      },
      trophyWord: {
        word: 'русский',
        meaning: { de: 'Russisch', en: 'Russian' },
        example: 'Вы хорошо понимаете русский?',
        whyThisWord: { de: 'Der Sprachname verankert sichtbaren Lernfortschritt in echten Gesprächen, Schildern und Ansagen.', en: 'The language name anchors visible learning progress in real conversations, signs, and announcements.' },
      },
      placeholderCaption: { de: 'Metrosteig mit gut sichtbaren Richtungspfeilen, Linienplan und ankommendem Zug.', en: 'A metro platform with clear direction arrows, a line map, and an arriving train.' },
      songMood: 'steady language progress',
      visualNotes: 'Metro signage with recognizable but unreadable detail, learner noticing patterns while a language companion waits for a self-assessment.',
    }),
  },
  {
    slug: 'mne-pora-otdykhat-rest',
    title: { de: 'Zeit zum Ausruhen', en: 'Time to rest' },
    situation: {
      de: 'Nach einem langen Tag kommst du in die Hotellobby zurück; die Uhr zeigt spät, und die Rezeption reicht dir den Zimmerschlüssel.',
      en: 'After a long day, you return to the hotel lobby; the clock shows a late hour, and reception hands you the room key.',
    },
    pedagogicalGoal: 'Erschöpfung ohne geschlechtsspezifisches Adjektiv durch eine unpersönliche Zeitformel ausdrücken.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Мне пора отдыхать.',
        baseText: { de: 'Es ist Zeit für mich, mich auszuruhen.', en: 'It is time for me to rest.' },
      },
      meaning: {
        de: 'Eine natürliche geschlechtsneutrale Alternative zu einer Aussage mit müde.',
        en: 'A natural gender-neutral alternative to saying that you are tired.',
      },
      chunks: [
        { id: 'mne-pora-otdykhat-rest-time', targetText: 'Мне пора', baseText: { de: 'Es ist Zeit für mich', en: 'It is time for me' } },
        { id: 'mne-pora-otdykhat-rest-action', targetText: 'отдыхать.', baseText: { de: 'mich auszuruhen.', en: 'to rest.' } },
      ],
      lessonItems: [
        { id: 'mne-pora-otdykhat-rest-item-rest-verb', targetText: 'отдыхать', baseText: { de: 'sich ausruhen', en: 'to rest' }, acceptedAnswers: russianAccepted('отдыхать') },
        { id: 'mne-pora-otdykhat-rest-item-time', targetText: 'пора', baseText: { de: 'es ist Zeit', en: 'it is time' }, acceptedAnswers: russianAccepted('пора') },
        { id: 'mne-pora-otdykhat-rest-item-rest', targetText: 'отдых', baseText: { de: 'Erholung / Ruhe', en: 'rest' }, acceptedAnswers: russianAccepted('отдых') },
        { id: 'mne-pora-otdykhat-rest-item-sleep', targetText: 'сон', baseText: { de: 'Schlaf', en: 'sleep' }, acceptedAnswers: russianAccepted('сон') },
        { id: 'mne-pora-otdykhat-rest-item-hotel', targetText: 'гостиница', baseText: { de: 'Hotel', en: 'hotel' }, acceptedAnswers: russianAccepted('гостиница') },
      ],
      buildChips: ['Мне пора', 'отдыхать.', 'Я хочу', 'продолжать прогулку.'],
      typeRecall: {
        before: 'Мне пора ', answer: 'отдыхать', after: '.',
        acceptedAnswers: russianAccepted('отдыхать'),
        fallbackChoices: ['отдыхать', 'работать', 'гулять', 'читать'],
      },
      speakTarget: {
        baseCue: { de: 'Es ist Zeit für mich, mich auszuruhen.', en: 'It is time for me to rest.' },
        targetPhrase: 'Мне пора отдыхать.',
        requiredTokens: ['Мне', 'пора', 'отдыхать'],
        optionalTokens: [],
      },
      sceneCaption: {
        de: 'Die Lobbyuhr zeigt eine späte Stunde; der Schlüssel liegt auf dem Tresen, und die Rezeption wartet, während du deinen nächsten Schritt nennst.',
        en: 'The lobby clock shows a late hour; the key rests on the desk, and reception waits while you state your next step.',
      },
      trophyWord: {
        word: 'отдыхать',
        meaning: { de: 'sich ausruhen', en: 'to rest' },
        example: 'Вам пора отдыхать после дороги.',
        whyThisWord: { de: 'Das Verb beschreibt Erholung direkt und vermeidet jede geschlechtsspezifische Sprecherform.', en: 'This verb names rest directly and avoids any gender-specific speaker form.' },
      },
      placeholderCaption: { de: 'Späte Hotellobby mit Wanduhr, Zimmerschlüssel und stiller Rezeption.', en: 'A late hotel lobby with a wall clock, room key, and quiet reception desk.' },
      songMood: 'soft end-of-day exhale',
      visualNotes: 'Quiet region-neutral hotel lobby, late clock and key on counter, no sleeping figure or resolved departure shown.',
    }),
  },
  {
    slug: 'mne-pora-idti-leave',
    title: { de: 'Ich muss gehen', en: 'I have to go' },
    situation: {
      de: 'Im Café werden die ersten Stühle zusammengerückt; deine Bekanntschaft bleibt an der Tür stehen, während du auf den Abschluss des Abends reagierst.',
      en: 'At the cafe, the first chairs are being gathered; your acquaintance remains by the door while you respond to the end of the evening.',
    },
    pedagogicalGoal: 'Eine notwendige Abreise mit einer unpersönlichen Zeitformel und einem Infinitiv ankündigen.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Мне уже пора идти.',
        baseText: { de: 'Ich muss jetzt schon gehen.', en: 'It is time for me to go now.' },
      },
      meaning: {
        de: 'Eine höfliche, geschlechtsneutrale Ankündigung, dass du jetzt aufbrechen musst.',
        en: 'A polite gender-neutral announcement that you need to leave now.',
      },
      chunks: [
        { id: 'mne-pora-idti-leave-time', targetText: 'Мне уже пора', baseText: { de: 'Ich muss jetzt schon', en: 'It is already time for me' } },
        { id: 'mne-pora-idti-leave-action', targetText: 'идти.', baseText: { de: 'gehen.', en: 'to go.' } },
      ],
      lessonItems: [
        { id: 'mne-pora-idti-leave-item-go', targetText: 'идти', baseText: { de: 'gehen', en: 'to go' }, acceptedAnswers: russianAccepted('идти') },
        { id: 'mne-pora-idti-leave-item-leave', targetText: 'уходить', baseText: { de: 'weggehen / verlassen', en: 'to leave / go away' }, acceptedAnswers: russianAccepted('уходить') },
        { id: 'mne-pora-idti-leave-item-metro', targetText: 'метро', baseText: { de: 'Metro / U-Bahn', en: 'metro / subway' }, acceptedAnswers: russianAccepted('метро') },
        { id: 'mne-pora-idti-leave-item-home', targetText: 'дом', baseText: { de: 'Haus / Zuhause', en: 'house / home' }, acceptedAnswers: russianAccepted('дом') },
        { id: 'mne-pora-idti-leave-item-journey', targetText: 'дорога', baseText: { de: 'Weg / Reise', en: 'road / journey' }, acceptedAnswers: russianAccepted('дорога') },
      ],
      buildChips: ['Мне уже пора', 'идти.', 'Мне нужно', 'вызвать такси.'],
      typeRecall: {
        before: 'Мне уже пора ', answer: 'идти', after: '.',
        acceptedAnswers: russianAccepted('идти'),
        fallbackChoices: ['идти', 'платить', 'звонить', 'заказывать'],
      },
      speakTarget: {
        baseCue: { de: 'Ich muss jetzt schon gehen.', en: 'It is time for me to go now.' },
        targetPhrase: 'Мне уже пора идти.',
        requiredTokens: ['уже', 'пора', 'идти'],
        optionalTokens: ['Мне'],
      },
      sceneCaption: {
        de: 'Neben der Cafétür werden Stühle zusammengestellt; Mantel und Metroticket liegen bereit, und deine Bekanntschaft wartet auf deine Reaktion.',
        en: 'Chairs are being gathered beside the cafe door; a coat and metro ticket are ready, and your acquaintance waits for your response.',
      },
      trophyWord: {
        word: 'идти',
        meaning: { de: 'gehen', en: 'to go' },
        example: 'Вам нужно идти к метро?',
        whyThisWord: { de: 'Das grundlegende Bewegungsverb verbindet Aufbruch, Fußwege und Ziele in einfachen Alltagssätzen.', en: 'This basic movement verb connects departures, walking routes, and destinations in simple everyday sentences.' },
      },
      placeholderCaption: { de: 'Cafétür am Abend mit zusammengestellten Stühlen, Mantel und Metroticket.', en: 'An evening cafe doorway with gathered chairs, a coat, and a metro ticket.' },
      songMood: 'gentle cafe departure',
      visualNotes: 'Cafe close-down cues without readable signs, coat and transit ticket ready, acquaintance waiting before the learner announces anything.',
    }),
  },
  {
    slug: 'nadeyus-uvidimsya-skoro-see-soon',
    title: { de: 'Hoffentlich bis bald', en: 'Hope to see you soon' },
    situation: {
      de: 'Am Metroeingang dreht sich deine Bekanntschaft vor der Rolltreppe noch einmal um und wartet auf deine Abschiedsworte.',
      en: 'At the metro entrance, your acquaintance turns back before the escalator and waits for your parting words.',
    },
    pedagogicalGoal: 'Mit einem geschlechtsneutralen Präsensverb Hoffnung auf ein baldiges Wiedersehen ausdrücken.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Надеюсь, увидимся скоро.',
        baseText: { de: 'Ich hoffe, wir sehen uns bald.', en: 'I hope we see each other soon.' },
      },
      meaning: {
        de: 'Ein warmer höflicher Abschied mit offenem Wunsch nach einem nächsten Treffen.',
        en: 'A warm polite farewell with an open hope for another meeting.',
      },
      chunks: [
        { id: 'nadeyus-uvidimsya-skoro-see-soon-hope', targetText: 'Надеюсь,', baseText: { de: 'Ich hoffe,', en: 'I hope' } },
        { id: 'nadeyus-uvidimsya-skoro-see-soon-reunion', targetText: 'увидимся скоро.', baseText: { de: 'wir sehen uns bald.', en: 'we see each other soon.' } },
      ],
      lessonItems: [
        { id: 'nadeyus-uvidimsya-skoro-see-soon-item-hope', targetText: 'надеяться', baseText: { de: 'hoffen', en: 'to hope' }, acceptedAnswers: russianAccepted('надеяться') },
        { id: 'nadeyus-uvidimsya-skoro-see-soon-item-see', targetText: 'увидеться', baseText: { de: 'sich wiedersehen', en: 'to see each other' }, acceptedAnswers: russianAccepted('увидеться') },
        { id: 'nadeyus-uvidimsya-skoro-see-soon-item-soon', targetText: 'скоро', baseText: { de: 'bald', en: 'soon' }, acceptedAnswers: russianAccepted('скоро') },
        { id: 'nadeyus-uvidimsya-skoro-see-soon-item-call', targetText: 'звонок', baseText: { de: 'Anruf', en: 'call' }, acceptedAnswers: russianAccepted('звонок') },
        { id: 'nadeyus-uvidimsya-skoro-see-soon-item-escalator', targetText: 'эскалатор', baseText: { de: 'Rolltreppe', en: 'escalator' }, acceptedAnswers: russianAccepted('эскалатор') },
      ],
      buildChips: ['Надеюсь,', 'увидимся скоро.', 'Напишите,', 'когда приедете.'],
      typeRecall: {
        before: 'Надеюсь, ', answer: 'увидимся', after: ' скоро.',
        acceptedAnswers: russianAccepted('увидимся'),
        fallbackChoices: ['увидимся', 'позвоним', 'поужинаем', 'погуляем'],
      },
      speakTarget: {
        baseCue: { de: 'Ich hoffe, wir sehen uns bald.', en: 'I hope we see each other soon.' },
        targetPhrase: 'Надеюсь, увидимся скоро.',
        requiredTokens: ['Надеюсь', 'увидимся', 'скоро'],
        optionalTokens: [],
      },
      sceneCaption: {
        de: 'Am Eingang zur Metro hält die andere Person vor der Rolltreppe inne und schaut für den letzten Abschied noch einmal zurück.',
        en: 'At the metro entrance, the other person pauses before the escalator and looks back for the final parting moment.',
      },
      trophyWord: {
        word: 'надеяться',
        meaning: { de: 'hoffen', en: 'to hope' },
        example: 'Надеюсь, вы скоро приедете.',
        whyThisWord: { de: 'Das Verb macht Zukunftswünsche freundlich, ohne eine feste Zusage zu verlangen.', en: 'This verb makes future wishes friendly without demanding a firm commitment.' },
      },
      placeholderCaption: { de: 'Beleuchteter Metroeingang am Abend mit Rolltreppe und einer zurückblickenden Person.', en: 'A lit metro entrance in the evening with an escalator and a person looking back.' },
      songMood: 'hopeful near-future reunion',
      visualNotes: 'Evening metro entrance, one acquaintance about to descend and turning back, open hopeful spacing with no wave implying the spoken answer.',
    }),
  },
  {
    slug: 'zavtrashniy-vecher-podkhodit-tomorrow-works',
    title: { de: 'Morgen Abend passt', en: 'Tomorrow evening works' },
    situation: {
      de: 'Auf dem Handy ist im Kalender der morgige Abend noch frei; deine Bekanntschaft zeigt auf das Feld und wartet auf deine Antwort.',
      en: 'On the phone calendar, tomorrow evening is still open; your acquaintance points to the slot and waits for your answer.',
    },
    pedagogicalGoal: 'Einen vorgeschlagenen Termin mit einer unpersönlichen Passformel bestätigen.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Завтрашний вечер мне подходит.',
        baseText: { de: 'Morgen Abend passt es mir.', en: 'Tomorrow evening works for me.' },
      },
      meaning: {
        de: 'Eine klare geschlechtsneutrale Bestätigung für einen vorgeschlagenen Termin.',
        en: 'A clear gender-neutral confirmation of a proposed time.',
      },
      chunks: [
        { id: 'zavtrashniy-vecher-podkhodit-tomorrow-works-time', targetText: 'Завтрашний вечер', baseText: { de: 'Der morgige Abend', en: 'Tomorrow evening' } },
        { id: 'zavtrashniy-vecher-podkhodit-tomorrow-works-fit', targetText: 'мне подходит.', baseText: { de: 'passt mir.', en: 'works for me.' } },
      ],
      lessonItems: [
        { id: 'zavtrashniy-vecher-podkhodit-tomorrow-works-item-tomorrow', targetText: 'завтрашний', baseText: { de: 'morgig / von morgen', en: 'tomorrow’s / next-day' }, acceptedAnswers: russianAccepted('завтрашний') },
        { id: 'zavtrashniy-vecher-podkhodit-tomorrow-works-item-evening', targetText: 'вечер', baseText: { de: 'Abend', en: 'evening' }, acceptedAnswers: russianAccepted('вечер') },
        { id: 'zavtrashniy-vecher-podkhodit-tomorrow-works-item-suit', targetText: 'подходить', baseText: { de: 'passen / geeignet sein', en: 'to suit / work' }, acceptedAnswers: russianAccepted('подходить') },
        { id: 'zavtrashniy-vecher-podkhodit-tomorrow-works-item-calendar', targetText: 'календарь', baseText: { de: 'Kalender', en: 'calendar' }, acceptedAnswers: russianAccepted('календарь') },
        { id: 'zavtrashniy-vecher-podkhodit-tomorrow-works-item-free', targetText: 'свободный', baseText: { de: 'frei', en: 'free / available' }, acceptedAnswers: russianAccepted('свободный') },
      ],
      buildChips: ['Завтрашний вечер', 'мне подходит.', 'Сегодня утром', 'я работаю.'],
      typeRecall: {
        before: 'Завтрашний вечер мне ', answer: 'подходит', after: '.',
        acceptedAnswers: russianAccepted('подходит'),
        fallbackChoices: ['подходит', 'нравится', 'мешает', 'поможет'],
      },
      speakTarget: {
        baseCue: { de: 'Morgen Abend passt es mir.', en: 'Tomorrow evening works for me.' },
        targetPhrase: 'Завтрашний вечер мне подходит.',
        requiredTokens: ['Завтрашний', 'вечер', 'подходит'],
        optionalTokens: ['мне'],
      },
      sceneCaption: {
        de: 'Auf dem offenen Handykalender ist am nächsten Abend ein leeres Feld; die andere Person tippt darauf und lässt dir die Entscheidung.',
        en: 'The open phone calendar shows an empty slot the next evening; the other person taps it and leaves the decision to you.',
      },
      trophyWord: {
        word: 'подходить',
        meaning: { de: 'passen / geeignet sein', en: 'to suit / work' },
        example: 'Этот вечер вам подходит?',
        whyThisWord: { de: 'Das Verb bestätigt Zeiten und Möglichkeiten klar, ohne persönliche Adjektivformen zu brauchen.', en: 'This verb confirms times and options clearly without requiring personal adjective forms.' },
      },
      placeholderCaption: { de: 'Handykalender auf einem Cafétisch mit einem freien Feld am nächsten Abend.', en: 'A phone calendar on a cafe table with an open slot the following evening.' },
      songMood: 'easy tomorrow agreement',
      visualNotes: 'Cafe table calendar view with one unselected open evening slot, acquaintance pointing but not confirming, cups and metro card grounding the scene.',
    }),
  },
  {
    slug: 'vsem-spokoynoy-nochi-good-night',
    title: { de: 'Gute Nacht allerseits', en: 'Good night, everyone' },
    situation: {
      de: 'Nach dem Treffen des Sprachclubs ziehen mehrere Personen am Caféausgang ihre Mäntel an und wenden sich vor dem Heimweg noch einmal dir zu.',
      en: 'After the language-club gathering, several people put on their coats at the cafe exit and turn toward you before heading home.',
    },
    pedagogicalGoal: 'Einer ganzen Gruppe mit einer festen Genitivform einen ruhigen Nachtgruß geben.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'Всем спокойной ночи.',
        baseText: { de: 'Gute Nacht allerseits.', en: 'Good night, everyone.' },
      },
      meaning: {
        de: 'Ein kurzer warmer Nachtgruß, der an alle Anwesenden zugleich gerichtet ist.',
        en: 'A short warm night greeting addressed to everyone present at once.',
      },
      chunks: [
        { id: 'vsem-spokoynoy-nochi-good-night-everyone', targetText: 'Всем', baseText: { de: 'Allen', en: 'To everyone' } },
        { id: 'vsem-spokoynoy-nochi-good-night-wish', targetText: 'спокойной ночи.', baseText: { de: 'eine ruhige Nacht.', en: 'a peaceful night.' } },
      ],
      lessonItems: [
        { id: 'vsem-spokoynoy-nochi-good-night-item-calm', targetText: 'спокойный', baseText: { de: 'ruhig / friedlich', en: 'calm / peaceful' }, acceptedAnswers: russianAccepted('спокойный') },
        { id: 'vsem-spokoynoy-nochi-good-night-item-night', targetText: 'ночь', baseText: { de: 'Nacht', en: 'night' }, acceptedAnswers: russianAccepted('ночь') },
        { id: 'vsem-spokoynoy-nochi-good-night-item-sleep', targetText: 'сон', baseText: { de: 'Schlaf', en: 'sleep' }, acceptedAnswers: russianAccepted('сон') },
        { id: 'vsem-spokoynoy-nochi-good-night-item-guest', targetText: 'гость', baseText: { de: 'Gast', en: 'guest' }, acceptedAnswers: russianAccepted('гость') },
        { id: 'vsem-spokoynoy-nochi-good-night-item-club', targetText: 'клуб', baseText: { de: 'Club / Verein', en: 'club' }, acceptedAnswers: russianAccepted('клуб') },
      ],
      buildChips: ['Всем', 'спокойной ночи.', 'Доброе утро', 'дорогие гости.'],
      typeRecall: {
        before: 'Всем ', answer: 'спокойной', after: ' ночи.',
        acceptedAnswers: russianAccepted('спокойной'),
        fallbackChoices: ['спокойной', 'тёплой', 'короткой', 'летней'],
      },
      speakTarget: {
        baseCue: { de: 'Gute Nacht allerseits.', en: 'Good night, everyone.' },
        targetPhrase: 'Всем спокойной ночи.',
        requiredTokens: ['Всем', 'спокойной', 'ночи'],
        optionalTokens: [],
      },
      sceneCaption: {
        de: 'Am Caféausgang stehen die Mitglieder des Sprachclubs bereits in Mänteln und drehen sich vor dem Aufbruch noch einmal zu dir.',
        en: 'At the cafe exit, the language-club members are already in their coats and turn toward you once more before departing.',
      },
      trophyWord: {
        word: 'спокойный',
        meaning: { de: 'ruhig / friedlich', en: 'calm / peaceful' },
        example: 'Пусть ваша ночь будет спокойной.',
        whyThisWord: { de: 'Das Adjektiv macht aus einem neutralen Abschied einen sanften persönlichen Nachtwunsch.', en: 'This adjective turns a neutral farewell into a gentle personal wish for the night.' },
      },
      placeholderCaption: { de: 'Kleine Sprachclubgruppe in Mänteln an einer spät beleuchteten Cafétür.', en: 'A small language-club group in coats at a softly lit late-night cafe door.' },
      songMood: 'calm group goodnight',
      visualNotes: 'Mixed adult language-club group preparing to leave a cafe, everyone looking toward the learner, restrained warm night atmosphere.',
    }),
  },
  {
    slug: 'do-svidaniya-beregite-sebya-farewell',
    title: { de: 'Auf Wiedersehen und alles Gute', en: 'Goodbye and take care' },
    situation: {
      de: 'An den Metro-Drehkreuzen trennt ihr euch endgültig für den Abend; deine gastgebende Person bleibt auf der anderen Seite kurz stehen.',
      en: 'At the metro turnstiles, you finally part for the evening; your host pauses briefly on the other side.',
    },
    pedagogicalGoal: 'Eine formelle Abschiedsformel mit einer fürsorglichen Aufforderung in der Sie-Form verbinden.',
    variant: makeBrightRussianVariant({
      corePhrase: {
        targetText: 'До свидания, берегите себя.',
        baseText: { de: 'Auf Wiedersehen, passen Sie auf sich auf.', en: 'Goodbye, take care of yourself.' },
      },
      meaning: {
        de: 'Ein vollständiger höflicher Abschied mit einem warmen Wunsch für den Heimweg.',
        en: 'A complete polite farewell with a warm wish for the journey home.',
      },
      chunks: [
        { id: 'do-svidaniya-beregite-sebya-farewell-goodbye', targetText: 'До свидания,', baseText: { de: 'Auf Wiedersehen,', en: 'Goodbye,' } },
        { id: 'do-svidaniya-beregite-sebya-farewell-care', targetText: 'берегите себя.', baseText: { de: 'passen Sie auf sich auf.', en: 'take care of yourself.' } },
      ],
      lessonItems: [
        { id: 'do-svidaniya-beregite-sebya-farewell-item-care-verb', targetText: 'беречь', baseText: { de: 'schützen / behüten', en: 'to protect / take care of' }, acceptedAnswers: russianAccepted('беречь') },
        { id: 'do-svidaniya-beregite-sebya-farewell-item-parting-formula', targetText: 'свидание', baseText: { de: 'Treffen / Wiedersehen', en: 'meeting / seeing each other' }, acceptedAnswers: russianAccepted('свидание') },
        { id: 'do-svidaniya-beregite-sebya-farewell-item-farewell', targetText: 'прощание', baseText: { de: 'Abschied', en: 'farewell' }, acceptedAnswers: russianAccepted('прощание') },
        { id: 'do-svidaniya-beregite-sebya-farewell-item-care', targetText: 'забота', baseText: { de: 'Fürsorge', en: 'care' }, acceptedAnswers: russianAccepted('забота') },
        { id: 'do-svidaniya-beregite-sebya-farewell-item-road', targetText: 'дорога', baseText: { de: 'Weg / Reise', en: 'road / journey' }, acceptedAnswers: russianAccepted('дорога') },
      ],
      buildChips: ['До свидания,', 'берегите себя.', 'Заходите ещё,', 'хорошего вечера.'],
      typeRecall: {
        before: 'До свидания, ', answer: 'берегите', after: ' себя.',
        acceptedAnswers: russianAccepted('берегите'),
        fallbackChoices: ['берегите', 'слушайте', 'уважайте', 'проверяйте'],
      },
      speakTarget: {
        baseCue: { de: 'Auf Wiedersehen, passen Sie auf sich auf.', en: 'Goodbye, take care of yourself.' },
        targetPhrase: 'До свидания, берегите себя.',
        requiredTokens: ['свидания', 'берегите', 'себя'],
        optionalTokens: ['До'],
      },
      sceneCaption: {
        de: 'Zwischen den Metro-Drehkreuzen bleibt deine gastgebende Person auf der anderen Seite stehen, während sich eure Wege für den Abend trennen.',
        en: 'Across the metro turnstiles, your host pauses on the other side as your routes separate for the evening.',
      },
      trophyWord: {
        word: 'беречь',
        meaning: { de: 'schützen / behüten', en: 'to protect / take care of' },
        example: 'Берегите себя в дороге.',
        whyThisWord: { de: 'Das Verb gibt einem formellen Abschied Wärme und bleibt in der höflichen Aufforderung geschlechtsneutral.', en: 'This verb adds warmth to a formal farewell and remains gender-neutral in the polite imperative.' },
      },
      placeholderCaption: { de: 'Metro-Drehkreuze am späten Abend mit zwei Personen auf getrennten Seiten.', en: 'Metro turnstiles late in the evening with two people on opposite sides.' },
      songMood: 'warm final sendoff',
      visualNotes: 'Region-neutral metro turnstiles at night, host and learner on opposite sides, caring but formal distance with no text overlays.',
    }),
  },
]

export const RUSSIAN_A1_PRACTICAL_10_LESSONS: GuidedLessonDefinition[] = makeRussianPracticalLessons(
  GUIDED_TODAY_PATH_RUSSIAN_TEN_METADATA,
  russianA1Practical10Inputs,
  { de: 'Du hast Russisch A1 Praxis 10 abgeschlossen.', en: 'You have completed Russian A1 Practical 10.' },
)
