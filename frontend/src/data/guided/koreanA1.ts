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

const KOREAN_GUIDED_TODAY_STEPS: GuidedLessonStep[] = ['scene', 'matchPairs', 'build', 'type', 'speak', 'complete']

export const GUIDED_TODAY_PATH_KOREAN_ONE_METADATA: GuidedPathMetadata = {
  id: 'korean-a1-practical-1',
  title: 'Korean A1 Practical 1',
  shortTitle: 'A1 Practical 1',
  subtitle: { de: 'Erste Hilfsphrasen auf Koreanisch', en: 'First help phrases in Korean' },
  level: 'A1',
  baseLanguage: 'German',
  targetLanguage: 'Korean',
  estimatedMinutes: 5,
}

type KoreanVariantInput = {
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

type KoreanLessonInput = {
  slug: string
  title: GuidedBaseContentText
  situation: GuidedLessonDefinition['situation']
  pedagogicalGoal: string
  variant: GuidedLessonVibeVariant
}

function makeBrightKoreanVariant(input: KoreanVariantInput): GuidedLessonVibeVariant {
  return {
    contentStatus: 'final',
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
      language: 'ko-KR',
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
      genre: 'bright Korean acoustic',
      mood: input.songMood,
    },
    visualNotes: input.visualNotes,
  }
}

function makeKoreanPracticalLessons(
  metadata: GuidedPathMetadata,
  inputs: KoreanLessonInput[],
  completionSituation: { de: string; en: string },
): GuidedLessonDefinition[] {
  return inputs.map((lessonInput, index) => {
    const lessonNumber = index + 1
    const pathNumber = metadata.id.replace('korean-a1-practical-', '')
    const id = `korean-a1-practical-${pathNumber}-lesson-${lessonNumber}-${lessonInput.slug}`
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
      steps: KOREAN_GUIDED_TODAY_STEPS,
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

const koreanA1Practical1Inputs: KoreanLessonInput[] = [
  {
    slug: 'annyeong-first-contact',
    title: { de: 'Erster Kontakt', en: 'First contact' },
    situation: {
      en: 'At a Seoul cafe counter, greet the staff member and politely ask whether they speak English.',
      de: 'An einem Café-Tresen in Seoul begrüßt du die Bedienung und fragst höflich, ob sie Englisch spricht.',
    },
    pedagogicalGoal: 'Mit 안녕하세요 und 혹시 eine höfliche erste Frage auf Koreanisch eröffnen.',
    variant: makeBrightKoreanVariant({
      corePhrase: {
        targetText: '안녕하세요. 혹시 영어를 할 수 있어요?',
        baseText: { de: 'Guten Tag. Sprechen Sie vielleicht Englisch?', en: 'Hello. Do you happen to speak English?' },
      },
      meaning: { de: 'Eine sichere Begrüßung plus eine vorsichtige Frage nach Englisch.', en: 'A safe greeting followed by a gently phrased question about English.' },
      chunks: [
        { id: 'first-contact-annyeonghaseyo', targetText: '안녕하세요.', baseText: { de: 'Guten Tag.', en: 'Hello.' } },
        { id: 'first-contact-hoksi-yeongeoreul', targetText: '혹시 영어를', baseText: { de: 'vielleicht Englisch', en: 'perhaps English' } },
        { id: 'first-contact-hal-su-isseoyo', targetText: '할 수 있어요?', baseText: { de: 'können Sie sprechen?', en: 'can you speak?' } },
      ],
      lessonItems: [
        { id: 'first-contact-item-annyeonghaseyo', targetText: '안녕하세요', baseText: { de: 'guten Tag / hallo', en: 'hello / good day' }, acceptedAnswers: ['안녕하세요'] },
        { id: 'first-contact-item-hoksi', targetText: '혹시', baseText: { de: 'vielleicht / zufällig', en: 'perhaps / by any chance' }, acceptedAnswers: ['혹시'] },
        { id: 'first-contact-item-yeongeoreul', targetText: '영어를', baseText: { de: 'Englisch (mit Objektpartikel)', en: 'English (with object particle)' }, acceptedAnswers: ['영어를'] },
        { id: 'first-contact-item-isseoyo', targetText: '있어요', baseText: { de: 'können / es gibt', en: 'can / there is' }, acceptedAnswers: ['있어요'] },
      ],
      buildChips: ['안녕하세요.', '혹시 영어를', '할 수 있어요?', '감사합니다.', '어디예요?'],
      typeRecall: {
        before: '안녕하세요. 혹시 ',
        answer: '영어를',
        after: ' 할 수 있어요?',
        acceptedAnswers: ['영어를'],
        fallbackChoices: ['영어를', '한국어를', '지하철은', '카페가'],
      },
      speakTarget: {
        baseCue: { de: 'Guten Tag. Sprechen Sie vielleicht Englisch?', en: 'Hello. Do you happen to speak English?' },
        targetPhrase: '안녕하세요. 혹시 영어를 할 수 있어요?',
        requiredTokens: ['안녕하세요.', '혹시', '영어를', '수', '있어요?'],
        optionalTokens: [],
      },
      sceneCaption: { de: 'Heller Café-Tresen in Seoul, ein freundlicher erster Kontakt.', en: 'A bright Seoul cafe counter and a friendly first contact.' },
      trophyWord: {
        word: '영어',
        meaning: { de: 'Englisch', en: 'English' },
        example: '영어를 할 수 있어요?',
        whyThisWord: { de: '영어 ist das alltagstaugliche Wort für Englisch. Mit 할 수 있어요? fragst du höflich, ob jemand es sprechen kann.', en: '영어 is the everyday word for English. 할 수 있어요? politely asks whether someone can speak it.' },
      },
      placeholderCaption: { de: 'Morgendliches Cafélicht und eine höfliche Frage an der Theke.', en: 'Morning cafe light and a polite question at the counter.' },
      songMood: 'polite morning hello',
      visualNotes: 'Warm Seoul cafe counter, a small greeting gesture, clear focus on the first polite exchange.',
    }),
  },
  {
    slug: 'cheoncheonhi-please',
    title: { de: 'Bitte langsam', en: 'Slowly, please' },
    situation: {
      en: 'The cashier spoke too quickly, so you apologize, ask for slower speech, and thank them.',
      de: 'Die Person an der Kasse hat zu schnell gesprochen; du entschuldigst dich, bittest um langsameres Sprechen und bedankst dich.',
    },
    pedagogicalGoal: 'Mit 천천히 말해 주세요 eine höfliche Reparaturphrase bilden und sie mit Entschuldigung und Dank einrahmen.',
    variant: makeBrightKoreanVariant({
      corePhrase: {
        targetText: '죄송합니다. 천천히 말해 주세요. 감사합니다.',
        baseText: { de: 'Entschuldigung. Bitte sprechen Sie langsam. Vielen Dank.', en: 'Sorry. Please speak slowly. Thank you.' },
      },
      meaning: { de: 'Eine vollständige höfliche Reaktion, wenn Koreanisch gerade zu schnell war.', en: 'A complete polite response when the Korean was too fast.' },
      chunks: [
        { id: 'slowly-joesonghamnida', targetText: '죄송합니다.', baseText: { de: 'Entschuldigung.', en: 'Sorry.' } },
        { id: 'slowly-cheoncheonhi-malhae-juseyo', targetText: '천천히 말해 주세요.', baseText: { de: 'Bitte sprechen Sie langsam.', en: 'Please speak slowly.' } },
        { id: 'slowly-gamsahamnida', targetText: '감사합니다.', baseText: { de: 'Vielen Dank.', en: 'Thank you.' } },
      ],
      lessonItems: [
        { id: 'slowly-item-joesonghamnida', targetText: '죄송합니다', baseText: { de: 'Entschuldigung', en: 'sorry / excuse me' }, acceptedAnswers: ['죄송합니다'] },
        { id: 'slowly-item-cheoncheonhi', targetText: '천천히', baseText: { de: 'langsam', en: 'slowly' }, acceptedAnswers: ['천천히'] },
        { id: 'slowly-item-juseyo', targetText: '주세요', baseText: { de: 'bitte geben / bitte tun Sie', en: 'please give / please do' }, acceptedAnswers: ['주세요'] },
        { id: 'slowly-item-gamsahamnida', targetText: '감사합니다', baseText: { de: 'vielen Dank', en: 'thank you' }, acceptedAnswers: ['감사합니다'] },
      ],
      buildChips: ['죄송합니다.', '천천히 말해', '주세요.', '감사합니다.', '괜찮아요.', '빨리'],
      typeRecall: {
        before: '죄송합니다. ',
        answer: '천천히',
        after: ' 말해 주세요. 감사합니다.',
        acceptedAnswers: ['천천히'],
        fallbackChoices: ['천천히', '지금', '정말', '혹시'],
      },
      speakTarget: {
        baseCue: { de: 'Entschuldigung. Bitte sprechen Sie langsam. Vielen Dank.', en: 'Sorry. Please speak slowly. Thank you.' },
        targetPhrase: '죄송합니다. 천천히 말해 주세요. 감사합니다.',
        requiredTokens: ['죄송합니다.', '천천히', '말해', '주세요.', '감사합니다.'],
        optionalTokens: [],
      },
      sceneCaption: { de: 'Kurzer Moment an der Kasse, dann eine ruhige Bitte um langsameres Sprechen.', en: 'A brief pause at the register, followed by a calm request for slower speech.' },
      trophyWord: {
        word: '단어',
        meaning: { de: 'Wort', en: 'word' },
        example: '이 단어를 천천히 말해 주세요.',
        whyThisWord: { de: '단어 ist ein nützliches Lernwort: Damit kannst du gezielt nach einem einzelnen koreanischen Wort fragen.', en: '단어 is a useful learner word: it lets you ask specifically about one Korean word.' },
      },
      placeholderCaption: { de: 'Ruhige Kassenszene mit einer freundlichen Wiederholungsbitte.', en: 'A calm checkout scene with a friendly request to repeat more slowly.' },
      songMood: 'patient polite repair',
      visualNotes: 'Convenience-store register, reassuring nod, slower conversational rhythm.',
    }),
  },
  {
    slug: 'jihacheolyeogi-eodiyeyo',
    title: { de: 'Wo ist die U-Bahn-Station?', en: 'Where is the subway station?' },
    situation: {
      en: 'On a Seoul street, politely ask where a nearby subway station is.',
      de: 'Auf einer Straße in Seoul fragst du höflich, wo eine U-Bahn-Station in der Nähe ist.',
    },
    pedagogicalGoal: 'Mit 어디예요? nach einem Ort fragen und 가까운 direkt vor dem gesuchten Ort verwenden.',
    variant: makeBrightKoreanVariant({
      corePhrase: {
        targetText: '죄송합니다. 가까운 지하철역이 어디예요?',
        baseText: { de: 'Entschuldigung. Wo ist eine U-Bahn-Station in der Nähe?', en: 'Excuse me. Where is a nearby subway station?' },
      },
      meaning: { de: 'Eine kurze, höfliche Wegfrage für den wichtigsten Stadtverkehr in Korea.', en: 'A short, polite directions question for Korea’s main urban transit.' },
      chunks: [
        { id: 'subway-joesonghamnida', targetText: '죄송합니다.', baseText: { de: 'Entschuldigung.', en: 'Excuse me.' } },
        { id: 'subway-gakkaun-jihacheolyeogi', targetText: '가까운 지하철역이', baseText: { de: 'die nächste U-Bahn-Station', en: 'the nearest subway station' } },
        { id: 'subway-eodiyeyo', targetText: '어디예요?', baseText: { de: 'wo ist sie?', en: 'where is it?' } },
      ],
      lessonItems: [
        { id: 'subway-item-joesonghamnida', targetText: '죄송합니다', baseText: { de: 'Entschuldigung', en: 'excuse me' }, acceptedAnswers: ['죄송합니다'] },
        { id: 'subway-item-gakkaun', targetText: '가까운', baseText: { de: 'nahe / nächste', en: 'nearby / nearest' }, acceptedAnswers: ['가까운'] },
        { id: 'subway-item-jihacheolyeogi', targetText: '지하철역이', baseText: { de: 'U-Bahn-Station (mit Subjektpartikel)', en: 'subway station (with subject particle)' }, acceptedAnswers: ['지하철역이'] },
        { id: 'subway-item-eodiyeyo', targetText: '어디예요', baseText: { de: 'wo ist es?', en: 'where is it?' }, acceptedAnswers: ['어디예요'] },
      ],
      buildChips: ['죄송합니다.', '가까운', '지하철역이', '어디예요?', '카페가', '여기예요.'],
      typeRecall: {
        before: '죄송합니다. 가까운 ',
        answer: '지하철역이',
        after: ' 어디예요?',
        acceptedAnswers: ['지하철역이'],
        fallbackChoices: ['지하철역이', '지하철은', '카페가', '출구가'],
      },
      speakTarget: {
        baseCue: { de: 'Entschuldigung. Wo ist eine U-Bahn-Station in der Nähe?', en: 'Excuse me. Where is a nearby subway station?' },
        targetPhrase: '죄송합니다. 가까운 지하철역이 어디예요?',
        requiredTokens: ['죄송합니다.', '가까운', '지하철역이', '어디예요?'],
        optionalTokens: [],
      },
      sceneCaption: { de: 'Straßenecke in Seoul mit sichtbarem U-Bahn-Schild und klarer Wegfrage.', en: 'A Seoul street corner with a visible subway sign and a clear directions question.' },
      trophyWord: {
        word: '지하철역',
        meaning: { de: 'U-Bahn-Station', en: 'subway station' },
        example: '지하철역이 어디예요?',
        whyThisWord: { de: '지하철역 verbindet 지하철 (U-Bahn) und 역 (Station). In der Frage trägt es die Subjektpartikel 이.', en: '지하철역 combines 지하철 (subway) and 역 (station). In the question it takes the subject particle 이.' },
      },
      placeholderCaption: { de: 'Klare Straßenszene mit U-Bahn-Symbol und kurzer Wegfrage.', en: 'A clear street scene with a subway symbol and a short directions question.' },
      songMood: 'clear city directions',
      visualNotes: 'Seoul sidewalk, recognizable subway roundel, directional glance toward a nearby entrance.',
    }),
  },
  {
    slug: 'americano-han-jan',
    title: { de: 'Einen Americano, bitte', en: 'An Americano, please' },
    situation: {
      en: 'At a cafe counter, order one Americano politely.',
      de: 'Am Café-Tresen bestellst du höflich einen Americano.',
    },
    pedagogicalGoal: 'Mit 한 잔 und 주세요 eine einfache, natürliche Getränkebestellung auf Koreanisch formulieren.',
    variant: makeBrightKoreanVariant({
      corePhrase: {
        targetText: '아메리카노 한 잔 주세요.',
        baseText: { de: 'Einen Americano, bitte.', en: 'One Americano, please.' },
      },
      meaning: { de: 'Eine natürliche Café-Bestellung mit dem Zählwort 잔 für Tassen und Gläser.', en: 'A natural cafe order using 잔, the counter for cups and glasses.' },
      chunks: [
        { id: 'order-americano', targetText: '아메리카노', baseText: { de: 'Americano', en: 'Americano' } },
        { id: 'order-han-jan', targetText: '한 잔', baseText: { de: 'eine Tasse / ein Glas', en: 'one cup / glass' } },
        { id: 'order-juseyo', targetText: '주세요.', baseText: { de: 'bitte geben Sie mir.', en: 'please give me.' } },
      ],
      lessonItems: [
        { id: 'order-item-americano', targetText: '아메리카노', baseText: { de: 'Americano', en: 'Americano' }, acceptedAnswers: ['아메리카노'] },
        { id: 'order-item-han', targetText: '한', baseText: { de: 'ein / eine (vor Zählwort)', en: 'one (before a counter)' }, acceptedAnswers: ['한'] },
        { id: 'order-item-jan', targetText: '잔', baseText: { de: 'Tasse / Glas (Zählwort)', en: 'cup / glass (counter)' }, acceptedAnswers: ['잔'] },
        { id: 'order-item-juseyo', targetText: '주세요', baseText: { de: 'bitte geben Sie mir', en: 'please give me' }, acceptedAnswers: ['주세요'] },
      ],
      buildChips: ['아메리카노', '한 잔', '주세요.', '물', '얼마예요?'],
      typeRecall: {
        before: '',
        answer: '아메리카노',
        after: ' 한 잔 주세요.',
        acceptedAnswers: ['아메리카노'],
        fallbackChoices: ['아메리카노', '물', '삼각김밥', '카페'],
      },
      speakTarget: {
        baseCue: { de: 'Einen Americano, bitte.', en: 'One Americano, please.' },
        targetPhrase: '아메리카노 한 잔 주세요.',
        requiredTokens: ['아메리카노', '한', '잔', '주세요.'],
        optionalTokens: [],
      },
      sceneCaption: { de: 'Belebter Café-Tresen, eine klare Bestellung für genau ein Getränk.', en: 'A lively cafe counter and a clear order for exactly one drink.' },
      trophyWord: {
        word: '아메리카노',
        meaning: { de: 'Americano', en: 'Americano' },
        example: '아메리카노 한 잔 주세요.',
        whyThisWord: { de: '아메리카노 ist in koreanischen Cafés sehr gebräuchlich. 한 잔 zählt eine Tasse oder ein Glas davon.', en: '아메리카노 is extremely common in Korean cafes. 한 잔 counts one cup or glass of it.' },
      },
      placeholderCaption: { de: 'Moderner Café-Tresen mit einem Americano und einer kurzen Bestellung.', en: 'A modern cafe counter with an Americano and a short order.' },
      songMood: 'confident cafe order',
      visualNotes: 'Modern Korean cafe, one drink on the counter, simple one-item ordering gesture.',
    }),
  },
  {
    slug: 'samgakgimbap-price',
    title: { de: 'Wie viel kostet das?', en: 'How much is this?' },
    situation: {
      en: 'At a convenience store, ask the price of a triangular rice snack.',
      de: 'In einem koreanischen Convenience-Store fragst du nach dem Preis eines dreieckigen Reissnacks.',
    },
    pedagogicalGoal: 'Mit 얼마예요? eine kurze Preisfrage stellen und den Gegenstand mit 이 markieren.',
    variant: makeBrightKoreanVariant({
      corePhrase: {
        targetText: '저기요, 이 삼각김밥은 얼마예요?',
        baseText: { de: 'Entschuldigung, wie viel kostet dieses Samgak-Gimbap?', en: 'Excuse me, how much is this triangle kimbap?' },
      },
      meaning: { de: 'Eine praktische Preisfrage für einen konkreten Gegenstand im Convenience-Store.', en: 'A practical price question about a specific item in a convenience store.' },
      chunks: [
        { id: 'price-jeogiyo', targetText: '저기요,', baseText: { de: 'Entschuldigung,', en: 'Excuse me,' } },
        { id: 'price-i-samgakgimbabeun', targetText: '이 삼각김밥은', baseText: { de: 'dieses Samgak-Gimbap', en: 'this triangle kimbap' } },
        { id: 'price-eolmayeyo', targetText: '얼마예요?', baseText: { de: 'wie viel kostet es?', en: 'how much is it?' } },
      ],
      lessonItems: [
        { id: 'price-item-jeogiyo', targetText: '저기요', baseText: { de: 'Entschuldigung / hallo', en: 'excuse me / hello' }, acceptedAnswers: ['저기요'] },
        { id: 'price-item-i', targetText: '이', baseText: { de: 'dieser / diese / dieses', en: 'this' }, acceptedAnswers: ['이'] },
        { id: 'price-item-samgakgimbabeun', targetText: '삼각김밥은', baseText: { de: 'Samgak-Gimbap (mit Themenpartikel)', en: 'triangle kimbap (with topic particle)' }, acceptedAnswers: ['삼각김밥은'] },
        { id: 'price-item-eolmayeyo', targetText: '얼마예요', baseText: { de: 'wie viel kostet es?', en: 'how much is it?' }, acceptedAnswers: ['얼마예요'] },
      ],
      buildChips: ['저기요,', '이 삼각김밥은', '얼마예요?', '주세요.', '맛있어요.'],
      typeRecall: {
        before: '저기요, 이 삼각김밥은 ',
        answer: '얼마예요',
        after: '?',
        acceptedAnswers: ['얼마예요', '얼마예요?'],
        fallbackChoices: ['얼마예요', '어디예요', '필요해요', '좋아요'],
      },
      speakTarget: {
        baseCue: { de: 'Entschuldigung, wie viel kostet dieses Samgak-Gimbap?', en: 'Excuse me, how much is this triangle kimbap?' },
        targetPhrase: '저기요, 이 삼각김밥은 얼마예요?',
        requiredTokens: ['저기요,', '이', '삼각김밥은', '얼마예요?'],
        optionalTokens: [],
      },
      sceneCaption: { de: 'Helles 편의점-Regal, du zeigst auf ein Samgak-Gimbap und fragst nach dem Preis.', en: 'A bright convenience-store shelf as you point to triangle kimbap and ask its price.' },
      trophyWord: {
        word: '삼각김밥',
        meaning: { de: 'dreieckiges Gimbap', en: 'triangle kimbap' },
        example: '삼각김밥 한 개 주세요.',
        whyThisWord: { de: '삼각김밥 ist ein typischer, günstiger Convenience-Store-Snack. In der Preisfrage steht 은 direkt am Nomen.', en: '삼각김밥 is a typical inexpensive convenience-store snack. In the price question, 은 attaches directly to the noun.' },
      },
      placeholderCaption: { de: 'Kühlregal im 편의점 mit deutlich sichtbarem Samgak-Gimbap.', en: 'A convenience-store chilled shelf with triangle kimbap clearly visible.' },
      songMood: 'curious convenience-store stop',
      visualNotes: 'Korean convenience store, triangle kimbap package, clear pointing gesture toward the price label.',
    }),
  },
  {
    slug: 'jihacheol-hongdae',
    title: { de: 'Fährt diese U-Bahn nach Hongdae?', en: 'Does this subway go to Hongdae?' },
    situation: {
      en: 'On a subway platform, check whether this train goes to Hongdae.',
      de: 'Auf einem U-Bahnsteig fragst du, ob dieser Zug nach Hongdae fährt.',
    },
    pedagogicalGoal: 'Mit 에 가요? ein Ziel erfragen und die konkrete U-Bahn mit 은 zum Thema machen.',
    variant: makeBrightKoreanVariant({
      corePhrase: {
        targetText: '이 지하철은 홍대에 가요?',
        baseText: { de: 'Fährt diese U-Bahn nach Hongdae?', en: 'Does this subway go to Hongdae?' },
      },
      meaning: { de: 'Eine kurze Kontrollfrage, bevor du in die U-Bahn steigst.', en: 'A short confirmation question before boarding the subway.' },
      chunks: [
        { id: 'transport-i-jihacheoreun', targetText: '이 지하철은', baseText: { de: 'diese U-Bahn', en: 'this subway' } },
        { id: 'transport-hongdaee', targetText: '홍대에', baseText: { de: 'nach Hongdae', en: 'to Hongdae' } },
        { id: 'transport-gayo', targetText: '가요?', baseText: { de: 'fährt sie?', en: 'does it go?' } },
      ],
      lessonItems: [
        { id: 'transport-item-i', targetText: '이', baseText: { de: 'dieser / diese / dieses', en: 'this' }, acceptedAnswers: ['이'] },
        { id: 'transport-item-jihacheoreun', targetText: '지하철은', baseText: { de: 'U-Bahn (mit Themenpartikel)', en: 'subway (with topic particle)' }, acceptedAnswers: ['지하철은'] },
        { id: 'transport-item-hongdaee', targetText: '홍대에', baseText: { de: 'nach Hongdae', en: 'to Hongdae' }, acceptedAnswers: ['홍대에'] },
        { id: 'transport-item-gayo', targetText: '가요', baseText: { de: 'fährt / geht', en: 'goes' }, acceptedAnswers: ['가요'] },
      ],
      buildChips: ['이', '지하철은', '홍대에', '가요?', '카페가', '좋아요.'],
      typeRecall: {
        before: '이 지하철은 홍대에 ',
        answer: '가요',
        after: '?',
        acceptedAnswers: ['가요', '가요?'],
        fallbackChoices: ['가요', '주세요', '필요해요', '좋아요'],
      },
      speakTarget: {
        baseCue: { de: 'Fährt diese U-Bahn nach Hongdae?', en: 'Does this subway go to Hongdae?' },
        targetPhrase: '이 지하철은 홍대에 가요?',
        requiredTokens: ['이', '지하철은', '홍대에', '가요?'],
        optionalTokens: [],
      },
      sceneCaption: { de: 'U-Bahnsteig mit Linienplan, du prüfst vor dem Einsteigen das Ziel.', en: 'A subway platform and route map as you confirm the destination before boarding.' },
      trophyWord: {
        word: '출구',
        meaning: { de: 'Ausgang', en: 'exit' },
        example: '출구가 어디예요?',
        whyThisWord: { de: '출구 ist in großen koreanischen U-Bahn-Stationen besonders nützlich, weil Ausgänge nummeriert und klar ausgeschildert sind.', en: '출구 is especially useful in large Korean subway stations, where exits are numbered and clearly marked.' },
      },
      placeholderCaption: { de: 'Moderner U-Bahnsteig mit Linienplan und Zielanzeige.', en: 'A modern subway platform with a route map and destination display.' },
      songMood: 'focused subway check',
      visualNotes: 'Seoul subway platform, route map to Hongdae, boarding decision held for confirmation.',
    }),
  },
  {
    slug: 'mul-piryohaeyo',
    title: { de: 'Ich brauche Wasser', en: 'I need water' },
    situation: {
      en: 'At a convenience store, state simply that you need one bottle of water.',
      de: 'In einem koreanischen Convenience-Store sagst du einfach, dass du eine Flasche Wasser brauchst.',
    },
    pedagogicalGoal: 'Mit 필요해요 ein konkretes Bedürfnis in höflicher Alltagssprache ausdrücken.',
    variant: makeBrightKoreanVariant({
      corePhrase: {
        targetText: '물 한 병이 필요해요.',
        baseText: { de: 'Ich brauche eine Flasche Wasser.', en: 'I need one bottle of water.' },
      },
      meaning: { de: 'Eine direkte, höfliche Aussage über ein konkretes Bedürfnis.', en: 'A direct, polite statement of a concrete need.' },
      chunks: [
        { id: 'need-mul', targetText: '물', baseText: { de: 'Wasser', en: 'water' } },
        { id: 'need-han-byeongi', targetText: '한 병이', baseText: { de: 'eine Flasche (mit Subjektpartikel)', en: 'one bottle (with subject particle)' } },
        { id: 'need-piryohaeyo', targetText: '필요해요.', baseText: { de: 'brauche ich.', en: 'I need.' } },
      ],
      lessonItems: [
        { id: 'need-item-mul', targetText: '물', baseText: { de: 'Wasser', en: 'water' }, acceptedAnswers: ['물'] },
        { id: 'need-item-han', targetText: '한', baseText: { de: 'ein / eine (vor Zählwort)', en: 'one (before a counter)' }, acceptedAnswers: ['한'] },
        { id: 'need-item-byeongi', targetText: '병이', baseText: { de: 'Flasche (mit Subjektpartikel)', en: 'bottle (with subject particle)' }, acceptedAnswers: ['병이'] },
        { id: 'need-item-piryohaeyo', targetText: '필요해요', baseText: { de: 'ich brauche / es ist nötig', en: 'I need / it is necessary' }, acceptedAnswers: ['필요해요'] },
      ],
      buildChips: ['물', '한 병이', '필요해요.', '좋아요.', '얼마예요?'],
      typeRecall: {
        before: '물 한 병이 ',
        answer: '필요해요',
        after: '.',
        acceptedAnswers: ['필요해요', '필요해요.'],
        fallbackChoices: ['필요해요', '좋아요', '가요', '하세요'],
      },
      speakTarget: {
        baseCue: { de: 'Ich brauche eine Flasche Wasser.', en: 'I need one bottle of water.' },
        targetPhrase: '물 한 병이 필요해요.',
        requiredTokens: ['물', '한', '병이', '필요해요.'],
        optionalTokens: [],
      },
      sceneCaption: { de: 'Getränkeregal im Convenience-Store, eine einzelne Wasserflasche im Blick.', en: 'A convenience-store drinks shelf with one bottle of water in view.' },
      trophyWord: {
        word: '물',
        meaning: { de: 'Wasser', en: 'water' },
        example: '물 한 병 주세요.',
        whyThisWord: { de: '물 ist eines der nützlichsten Alltagswörter. Für eine Flasche verwendest du das Zählwort 병.', en: '물 is one of the most useful everyday words. For one bottle, use the counter 병.' },
      },
      placeholderCaption: { de: 'Helles Getränkeregal mit einer Wasserflasche als klarer Fokus.', en: 'A bright drinks shelf with one water bottle in clear focus.' },
      songMood: 'simple practical need',
      visualNotes: 'Convenience-store cooler, one water bottle, uncluttered visual focus on the concrete need.',
    }),
  },
  {
    slug: 'i-kapega-joayo',
    title: { de: 'Dieses Café gefällt mir', en: 'I like this cafe' },
    situation: {
      en: 'While sitting in a cafe, tell your companion that you really like the place.',
      de: 'Im Café sagst du deiner Begleitung, dass dir der Ort wirklich gefällt.',
    },
    pedagogicalGoal: 'Mit 정말 좋아요 eine einfache positive Vorliebe ausdrücken und den Ort mit 이 benennen.',
    variant: makeBrightKoreanVariant({
      corePhrase: {
        targetText: '이 카페가 정말 좋아요.',
        baseText: { de: 'Dieses Café gefällt mir wirklich gut.', en: 'I really like this cafe.' },
      },
      meaning: { de: 'Eine natürliche, höfliche Aussage darüber, dass dir ein Ort gefällt.', en: 'A natural polite statement that you like a place.' },
      chunks: [
        { id: 'like-i-kapega', targetText: '이 카페가', baseText: { de: 'dieses Café', en: 'this cafe' } },
        { id: 'like-jeongmal', targetText: '정말', baseText: { de: 'wirklich', en: 'really' } },
        { id: 'like-joayo', targetText: '좋아요.', baseText: { de: 'gefällt mir.', en: 'I like it.' } },
      ],
      lessonItems: [
        { id: 'like-item-i', targetText: '이', baseText: { de: 'dieser / diese / dieses', en: 'this' }, acceptedAnswers: ['이'] },
        { id: 'like-item-kapega', targetText: '카페가', baseText: { de: 'Café (mit Subjektpartikel)', en: 'cafe (with subject particle)' }, acceptedAnswers: ['카페가'] },
        { id: 'like-item-jeongmal', targetText: '정말', baseText: { de: 'wirklich', en: 'really' }, acceptedAnswers: ['정말'] },
        { id: 'like-item-joayo', targetText: '좋아요', baseText: { de: 'ist gut / gefällt mir', en: 'is good / I like it' }, acceptedAnswers: ['좋아요'] },
      ],
      buildChips: ['이', '카페가', '정말', '좋아요.', '필요해요.', '어디예요?'],
      typeRecall: {
        before: '이 카페가 정말 ',
        answer: '좋아요',
        after: '.',
        acceptedAnswers: ['좋아요', '좋아요.'],
        fallbackChoices: ['좋아요', '필요해요', '가요', '하세요'],
      },
      speakTarget: {
        baseCue: { de: 'Dieses Café gefällt mir wirklich gut.', en: 'I really like this cafe.' },
        targetPhrase: '이 카페가 정말 좋아요.',
        requiredTokens: ['이', '카페가', '정말', '좋아요.'],
        optionalTokens: [],
      },
      sceneCaption: { de: 'Gemütlicher Sitzplatz im Café, ein spontanes positives Urteil über den Ort.', en: 'A comfortable cafe seat and a spontaneous positive comment about the place.' },
      trophyWord: {
        word: '카페',
        meaning: { de: 'Café', en: 'cafe' },
        example: '이 카페가 좋아요.',
        whyThisWord: { de: '카페 ist ein häufiges Lehnwort im koreanischen Alltag. In diesem Satz folgt die Subjektpartikel 가 direkt darauf.', en: '카페 is a common loanword in everyday Korean. In this sentence, the subject particle 가 attaches directly to it.' },
      },
      placeholderCaption: { de: 'Ruhige Café-Ecke mit warmem Licht und angenehmer Stimmung.', en: 'A quiet cafe corner with warm light and an inviting mood.' },
      songMood: 'warm cafe appreciation',
      visualNotes: 'Cozy Korean cafe interior, relaxed smile, warm light without romantic framing.',
    }),
  },
  {
    slug: 'jigeum-myeot-siyeyo',
    title: { de: 'Wie spät ist es?', en: 'What time is it?' },
    situation: {
      en: 'Near a subway entrance, politely ask someone for the current time.',
      de: 'In der Nähe eines U-Bahn-Eingangs fragst du jemanden höflich nach der aktuellen Uhrzeit.',
    },
    pedagogicalGoal: 'Mit 지금 몇 시예요? ohne komplexe Zahlwörter nach der aktuellen Uhrzeit fragen.',
    variant: makeBrightKoreanVariant({
      corePhrase: {
        targetText: '죄송하지만, 지금 몇 시예요?',
        baseText: { de: 'Entschuldigung, wie spät ist es jetzt?', en: 'Excuse me, what time is it now?' },
      },
      meaning: { de: 'Eine höfliche Zeitfrage, die noch keine koreanischen Zahlwörter verlangt.', en: 'A polite time question that does not yet require Korean number words.' },
      chunks: [
        { id: 'time-joesonghajiman', targetText: '죄송하지만,', baseText: { de: 'Entschuldigung, aber', en: 'Excuse me, but' } },
        { id: 'time-jigeum', targetText: '지금', baseText: { de: 'jetzt', en: 'now' } },
        { id: 'time-myeot-siyeyo', targetText: '몇 시예요?', baseText: { de: 'wie spät ist es?', en: 'what time is it?' } },
      ],
      lessonItems: [
        { id: 'time-item-joesonghajiman', targetText: '죄송하지만', baseText: { de: 'Entschuldigung, aber', en: 'excuse me, but' }, acceptedAnswers: ['죄송하지만'] },
        { id: 'time-item-jigeum', targetText: '지금', baseText: { de: 'jetzt', en: 'now' }, acceptedAnswers: ['지금'] },
        { id: 'time-item-myeot', targetText: '몇', baseText: { de: 'wie viele / welche Zahl', en: 'how many / what number' }, acceptedAnswers: ['몇'] },
        { id: 'time-item-siyeyo', targetText: '시예요', baseText: { de: 'Uhr ist es', en: 'o’clock is it' }, acceptedAnswers: ['시예요'] },
      ],
      buildChips: ['죄송하지만,', '지금', '몇 시예요?', '어디예요?', '감사합니다.'],
      typeRecall: {
        before: '죄송하지만, 지금 몇 ',
        answer: '시예요',
        after: '?',
        acceptedAnswers: ['시예요', '시예요?'],
        fallbackChoices: ['시예요', '얼마예요', '어디예요', '필요해요'],
      },
      speakTarget: {
        baseCue: { de: 'Entschuldigung, wie spät ist es jetzt?', en: 'Excuse me, what time is it now?' },
        targetPhrase: '죄송하지만, 지금 몇 시예요?',
        requiredTokens: ['죄송하지만,', '지금', '몇', '시예요?'],
        optionalTokens: [],
      },
      sceneCaption: { de: 'U-Bahn-Eingang am frühen Abend, eine kurze höfliche Frage nach der Zeit.', en: 'A subway entrance in the early evening and a short polite question about the time.' },
      trophyWord: {
        word: '시계',
        meaning: { de: 'Uhr / Armbanduhr', en: 'clock / watch' },
        example: '시계가 여기 있어요.',
        whyThisWord: { de: '시계 bezeichnet sowohl eine Uhr als auch eine Armbanduhr. Die Zeitfrage selbst verwendet 몇 시예요?.', en: '시계 can mean either a clock or a watch. The time question itself uses 몇 시예요?.' },
      },
      placeholderCaption: { de: 'Abendlicher U-Bahn-Eingang mit sichtbarer Uhr und ruhiger Straßenszene.', en: 'An evening subway entrance with a visible clock and a calm street scene.' },
      songMood: 'gentle time check',
      visualNotes: 'Early-evening subway entrance, visible clock face, brief respectful interaction.',
    }),
  },
  {
    slug: 'gamsahamnida-annyeonghi-gyeseyo',
    title: { de: 'Danke und auf Wiedersehen', en: 'Thank you and goodbye' },
    situation: {
      en: 'As you leave the cafe, thank the staff and say goodbye to the person staying behind.',
      de: 'Beim Verlassen des Cafés bedankst du dich und verabschiedest dich von der Person, die dort bleibt.',
    },
    pedagogicalGoal: 'Mit 감사합니다 danken und mit 안녕히 계세요 die zurückbleibende Person korrekt verabschieden.',
    variant: makeBrightKoreanVariant({
      corePhrase: {
        targetText: '정말 감사합니다. 안녕히 계세요.',
        baseText: { de: 'Vielen Dank. Auf Wiedersehen.', en: 'Thank you very much. Goodbye.' },
      },
      meaning: { de: 'Ein warmer Dank plus der passende Abschied, wenn du gehst und die andere Person bleibt.', en: 'Warm thanks plus the right farewell when you leave and the other person stays.' },
      chunks: [
        { id: 'goodbye-jeongmal', targetText: '정말', baseText: { de: 'wirklich / sehr', en: 'really / very much' } },
        { id: 'goodbye-gamsahamnida', targetText: '감사합니다.', baseText: { de: 'vielen Dank.', en: 'thank you.' } },
        { id: 'goodbye-annyeonghi-gyeseyo', targetText: '안녕히 계세요.', baseText: { de: 'Auf Wiedersehen.', en: 'Goodbye.' } },
      ],
      lessonItems: [
        { id: 'goodbye-item-jeongmal', targetText: '정말', baseText: { de: 'wirklich / sehr', en: 'really / very much' }, acceptedAnswers: ['정말'] },
        { id: 'goodbye-item-gamsahamnida', targetText: '감사합니다', baseText: { de: 'vielen Dank', en: 'thank you' }, acceptedAnswers: ['감사합니다'] },
        { id: 'goodbye-item-annyeonghi', targetText: '안녕히', baseText: { de: 'in Frieden / wohl', en: 'peacefully / well' }, acceptedAnswers: ['안녕히'] },
        { id: 'goodbye-item-gyeseyo', targetText: '계세요', baseText: { de: 'bleiben Sie', en: 'please stay' }, acceptedAnswers: ['계세요'] },
      ],
      buildChips: ['정말', '감사합니다.', '안녕히 계세요.', '안녕하세요.', '가요?'],
      typeRecall: {
        before: '정말 감사합니다. 안녕히 ',
        answer: '계세요',
        after: '.',
        acceptedAnswers: ['계세요', '계세요.'],
        fallbackChoices: ['계세요', '하세요', '가요', '주세요'],
      },
      speakTarget: {
        baseCue: { de: 'Vielen Dank. Auf Wiedersehen.', en: 'Thank you very much. Goodbye.' },
        targetPhrase: '정말 감사합니다. 안녕히 계세요.',
        requiredTokens: ['정말', '감사합니다.', '안녕히', '계세요.'],
        optionalTokens: [],
      },
      sceneCaption: { de: 'Du gehst zur Cafétür, bedankst dich und verabschiedest dich von der Bedienung.', en: 'You head for the cafe door, thank the staff, and say goodbye.' },
      trophyWord: {
        word: '집',
        meaning: { de: 'Haus / Zuhause', en: 'house / home' },
        example: '이제 집에 가요.',
        whyThisWord: { de: '집 ist das alltägliche Wort für Haus oder Zuhause. 집에 가요 bedeutet „ich gehe nach Hause“.', en: '집 is the everyday word for house or home. 집에 가요 means “I’m going home.”' },
      },
      placeholderCaption: { de: 'Warmer Abschied an der Cafétür, die Bedienung bleibt hinter dem Tresen.', en: 'A warm farewell at the cafe door while the staff member remains behind the counter.' },
      songMood: 'warm respectful farewell',
      visualNotes: 'Cafe doorway at golden hour, learner leaving while staff stays, small respectful bow.',
    }),
  },
]

export const KOREAN_A1_PRACTICAL_1_LESSONS: GuidedLessonDefinition[] = makeKoreanPracticalLessons(
  GUIDED_TODAY_PATH_KOREAN_ONE_METADATA,
  koreanA1Practical1Inputs,
  {
    de: 'Du hast Koreanisch A1 Praxis 1 abgeschlossen.',
    en: 'You have completed Korean A1 Practical 1.',
  },
)
