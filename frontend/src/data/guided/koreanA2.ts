/**
 * Korean A2 — the Regular tier (10 paths × 10 lessons), per
 * docs/Product/FABLE_A2_LEARNING_PATH_DESIGN.md (§4 integration, §5 authoring
 * contract) and the spec in tmp\A2_KOREAN_P1_P10_SPEC.md.
 *
 * Authoring contract highlights enforced in this module:
 * - Base locales are GERMAN + ENGLISH (matching Korean A1, baseLanguage
 *   'German'): every GuidedBaseContentText field carries both .de and .en.
 * - Two-turn shape: sceneCaption carries the interlocutor's Korean line quoted
 *   inside both base-locale captions; the learner's corePhrase is the response.
 * - Register: 해요체 (polite 요-form) EVERYWHERE, including the friend paths
 *   (P4/P8/P10) — Korean A1 taught only 요-form and adults naturally keep it
 *   with new friends; 반말 is out of scope. Fixed formal chunks allowed:
 *   안녕하세요, 죄송합니다, 감사합니다, 알겠습니다. No other 습니다-forms,
 *   no -십시오 imperatives, no -겠- beyond 알겠-.
 * - Tense contract: present everywhere; past -았/었어요 only from the spec
 *   whitelist (P3/P9 + light recycling); future -(으)ㄹ 거예요 from P4.
 *   Korean past forms never mark speaker gender — no agreement hazards.
 * - Numbers: prices in Sino-Korean + 원; small object counts native + counter
 *   (개/잔/장/명). Particle correctness (이/가, 을/를, 은/는, 에/에서) is a
 *   line-by-line review checkpoint.
 * - Trophies unique across the entire Korean guided corpus (A1 + A2).
 * - TTS LIVE (2026-07-15, 474 clips / 0 failed, rotation Yuna/Selly/Kanna/Emily/
 *   Sola/Jini continuing the A1 roster): ALL path/lesson/chunk ids in this module
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

const KOREAN_A2_GUIDED_TODAY_STEPS: GuidedLessonStep[] = ['scene', 'matchPairs', 'build', 'type', 'speak', 'complete']

type KoreanA2VariantInput = {
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

export type KoreanA2LessonInput = {
  slug: string
  title: GuidedBaseContentText
  situation: GuidedLessonDefinition['situation']
  pedagogicalGoal: string
  variant: GuidedLessonVibeVariant
}

function makeBrightKoreanA2Variant(input: KoreanA2VariantInput): GuidedLessonVibeVariant {
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
      language: 'ko-KR',
      // matches Korean A1: Hangul STT is noisier than Latin-script languages
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

export function makeKoreanA2PracticalLessons(
  metadata: GuidedPathMetadata,
  inputs: KoreanA2LessonInput[],
  completionSituation: { de: string; en: string },
): GuidedLessonDefinition[] {
  const pathNumber = Number(metadata.id.replace('korean-a2-practical-', ''))

  return inputs.map((lessonInput, index) => {
    const lessonNumber = index + 1
    const globalNumber = String((pathNumber - 1) * 10 + lessonNumber).padStart(3, '0')
    const id = `korean-a2-practical-${pathNumber}-${globalNumber}-${lessonInput.slug}`
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
      steps: KOREAN_A2_GUIDED_TODAY_STEPS,
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

export type KoreanA2CompactLesson = {
  slug: string
  title: GuidedBaseContentText
  situation: GuidedLessonDefinition['situation']
  pedagogicalGoal: string
  targetText: string
  baseText: GuidedBaseContentText
  chunks: Array<{ targetText: string; baseText: GuidedBaseContentText }>
  terms: Array<{ targetText: string; baseText: GuidedBaseContentText }>
  recall: { before: string; answer: string; after: string; fallbackChoices: string[] }
  /** Exactly the salient single Hangul words (whitespace-delimited eojeol, particle attached) the speech check requires — never multi-word phrases, no punctuation. */
  speakRequired: [string, string, string]
  sceneCaption: GuidedBaseContentText
  trophyWord: GuidedLessonTrophyWord
  distractors: [string, string]
  placeholderCaption: GuidedBaseContentText
  songMood: string
  visualNotes: string
}

/** Hangul has no case or accent variants — accepted answers are the exact text (lowercase is identity, kept for any embedded Latin). */
function koreanA2Answers(text: string): string[] {
  return [...new Set([text, text.toLowerCase()])]
}

function koreanA2SpeakTokens(targetText: string, required: [string, string, string]): { requiredTokens: string[]; optionalTokens: string[] } {
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

export function makeKoreanA2CompactLesson(input: KoreanA2CompactLesson): KoreanA2LessonInput {
  const prefix = input.slug.split('-')[0]
  return {
    slug: input.slug,
    title: input.title,
    situation: input.situation,
    pedagogicalGoal: input.pedagogicalGoal,
    variant: makeBrightKoreanA2Variant({
      corePhrase: { targetText: input.targetText, baseText: input.baseText },
      meaning: input.baseText,
      chunks: input.chunks.map((chunk, index) => ({ id: `${prefix}-${index + 1}`, ...chunk })),
      lessonItems: input.terms.map((term, index) => ({
        id: `${prefix}-item-${index + 1}`,
        ...term,
        acceptedAnswers: koreanA2Answers(term.targetText),
      })),
      buildChips: [...input.chunks.map((chunk) => chunk.targetText), ...input.distractors],
      typeRecall: {
        ...input.recall,
        acceptedAnswers: koreanA2Answers(input.recall.answer),
      },
      speakTarget: {
        baseCue: input.baseText,
        targetPhrase: input.targetText,
        ...koreanA2SpeakTokens(input.targetText, input.speakRequired),
      },
      sceneCaption: input.sceneCaption,
      trophyWord: input.trophyWord,
      placeholderCaption: input.placeholderCaption,
      songMood: input.songMood,
      visualNotes: input.visualNotes,
    }),
  }
}

export const GUIDED_TODAY_PATH_KOREAN_A2_ONE_METADATA: GuidedPathMetadata = {
  id: 'korean-a2-practical-1', title: 'Korean A2 Practical 1', shortTitle: 'A2 Practical 1',
  subtitle: { de: 'Vertraute Alltagswege, Einkäufe und kurze Rückfragen', en: 'Familiar errands, purchases, and quick follow-up questions' },
  level: 'A2', baseLanguage: 'German', targetLanguage: 'Korean', estimatedMinutes: 5,
}

const koreanA2Practical1Inputs: KoreanA2LessonInput[] = [
  makeKoreanA2CompactLesson({
    slug: 'oneuldo-americano-han-jan', title: { de: 'Wie immer', en: 'The usual' },
    situation: { de: 'Die Barista erkennt dich in deinem Stammcafé und fragt nach deiner üblichen Bestellung. Du bestätigst sie freundlich.', en: 'The barista recognizes you at your regular cafe and asks for your usual order. Confirm it warmly.' },
    pedagogicalGoal: 'Eine vertraute Frage an der Theke mit einer vollständigen Bestellung freundlich bestätigen.',
    targetText: '네, 오늘도 아메리카노 한 잔 주세요.', baseText: { de: 'Ja, heute wieder einen Americano, bitte.', en: 'Yes, an Americano again today, please.' },
    chunks: [{ targetText: '네, 오늘도', baseText: { de: 'Ja, heute wieder', en: 'Yes, again today' } }, { targetText: '아메리카노 한 잔', baseText: { de: 'einen Americano', en: 'one Americano' } }, { targetText: '주세요.', baseText: { de: 'bitte.', en: 'please.' } }],
    terms: [{ targetText: '오늘도', baseText: { de: 'heute wieder', en: 'again today' } }, { targetText: '아메리카노', baseText: { de: 'Americano', en: 'Americano' } }, { targetText: '한 잔', baseText: { de: 'eine Tasse', en: 'one cup' } }, { targetText: '주세요', baseText: { de: 'bitte geben Sie mir', en: 'please give me' } }, { targetText: '커피', baseText: { de: 'Kaffee', en: 'coffee' } }],
    recall: { before: '네, 오늘도 아메리카노 한 ', answer: '잔', after: ' 주세요.', fallbackChoices: ['잔', '개', '병', '장'] }, speakRequired: ['오늘도', '아메리카노', '주세요'],
    sceneCaption: { de: 'Die Barista lächelt über den Tresen und fragt: „오늘도 아메리카노로 드릴까요?“', en: 'The barista smiles across the counter and asks: “오늘도 아메리카노로 드릴까요?”' },
    trophyWord: { word: '오늘도', meaning: { de: 'heute wieder', en: 'again today' }, example: '오늘도 같은 시간에 와요.', whyThisWord: { de: 'Dieses Wort macht aus einer Bestellung eine vertraute Wiederholung und passt genau zu deinem Stammcafé.', en: 'This word turns an order into a familiar repeat and fits your regular cafe perfectly.' } },
    distractors: ['라떼 한 잔하고', '차 두 잔보다'], placeholderCaption: { de: 'Eine weiße Tasse steht auf dem hellen Tresen deines Stammcafés.', en: 'A white cup sits on the bright counter of your regular cafe.' }, songMood: 'a sunny familiar coffee stop before the day starts', visualNotes: 'Warm neighborhood cafe, familiar barista, white Americano cup and a small welcoming nod.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'pojang-total-price', title: { de: 'Zum Mitnehmen', en: 'To go' },
    situation: { de: 'Die Barista fragt, ob du hier trinken oder das Getränk mitnehmen möchtest. Du wählst Mitnehmen und fragst nach dem Gesamtpreis.', en: 'The barista asks whether you will drink here or take the drink away. Choose to go and ask for the total.' },
    pedagogicalGoal: 'Eine Mitnahmebestellung abschließen und nach dem Gesamtpreis fragen.',
    targetText: '포장해 주세요. 다 해서 얼마예요?', baseText: { de: 'Bitte zum Mitnehmen. Wie viel ist das alles zusammen?', en: 'Please make it to go. How much is it altogether?' },
    chunks: [{ targetText: '포장해 주세요.', baseText: { de: 'Bitte zum Mitnehmen.', en: 'Please make it to go.' } }, { targetText: '다 해서', baseText: { de: 'alles zusammen', en: 'all together' } }, { targetText: '얼마예요?', baseText: { de: 'wie viel ist es?', en: 'how much is it?' } }],
    terms: [{ targetText: '포장해', baseText: { de: 'zum Mitnehmen machen', en: 'make it to go' } }, { targetText: '포장', baseText: { de: 'Mitnahmeverpackung', en: 'takeaway packaging' } }, { targetText: '해서', baseText: { de: 'zusammengerechnet', en: 'added together' } }, { targetText: '얼마예요', baseText: { de: 'wie viel ist es?', en: 'how much is it?' } }, { targetText: '주세요', baseText: { de: 'bitte geben Sie mir', en: 'please give me' } }],
    recall: { before: '포장해 주세요. 다 해서 ', answer: '얼마예요', after: '?', fallbackChoices: ['얼마예요', '어디예요', '필요해요', '언제예요'] }, speakRequired: ['포장해', '해서', '얼마예요'],
    sceneCaption: { de: 'Die Barista hält einen Mehrwegbecher hoch und fragt: „드시고 가세요, 아니면 포장해 드릴까요?“', en: 'The barista holds up a reusable cup and asks: “드시고 가세요, 아니면 포장해 드릴까요?”' },
    trophyWord: { word: '얼마예요', meaning: { de: 'wie viel ist es?', en: 'how much is it?' }, example: '이거 얼마예요?', whyThisWord: { de: 'Mit dieser Frage holst du nach einer Entscheidung direkt den Preis ein, ohne einen neuen Satz bauen zu müssen.', en: 'This question gets the price immediately after a decision without needing a new sentence.' } },
    distractors: ['여기에서 마셔요', '카드로 낼게요'], placeholderCaption: { de: 'Ein Becher mit Deckel und ein Kartenleser warten auf dem Cafétresen.', en: 'A lidded cup and card reader wait on the cafe counter.' }, songMood: 'a brisk takeaway stop before a city walk', visualNotes: 'Cafe counter with reusable cup, receipt screen, and a customer already turning toward the door.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'yusim-for-my-phone', title: { de: 'Eine SIM-Karte', en: 'A SIM card' },
    situation: { de: 'In einem Telefonladen bietet dir ein Mitarbeiter Hilfe an. Du fragst nach einer passenden SIM-Karte für dein Handy.', en: 'A staff member in a phone shop offers help. Ask for a SIM card that fits your phone.' },
    pedagogicalGoal: 'Eine konkrete technische Sache im Laden nennen und nach ihrer Verfügbarkeit fragen.',
    targetText: '제 휴대폰에 맞는 유심이 있어요?', baseText: { de: 'Haben Sie eine SIM-Karte, die zu meinem Handy passt?', en: 'Do you have a SIM card that fits my phone?' },
    chunks: [{ targetText: '제 휴대폰에', baseText: { de: 'zu meinem Handy', en: 'for my phone' } }, { targetText: '맞는 유심이', baseText: { de: 'eine passende SIM-Karte', en: 'a suitable SIM card' } }, { targetText: '있어요?', baseText: { de: 'haben Sie eine?', en: 'do you have one?' } }],
    terms: [{ targetText: '휴대폰에', baseText: { de: 'für das Handy', en: 'for the phone' } }, { targetText: '맞는', baseText: { de: 'passend', en: 'that fits' } }, { targetText: '유심이', baseText: { de: 'SIM-Karte mit Subjektpartikel', en: 'SIM card with subject particle' } }, { targetText: '있어요', baseText: { de: 'es gibt; haben Sie', en: 'there is; do you have' } }, { targetText: '휴대폰', baseText: { de: 'Handy', en: 'mobile phone' } }],
    recall: { before: '제 휴대폰에 맞는 ', answer: '유심이', after: ' 있어요?', fallbackChoices: ['유심이', '카드가', '충전기가', '휴대폰이'] }, speakRequired: ['휴대폰에', '유심이', '있어요'],
    sceneCaption: { de: 'Ein Mitarbeiter deutet auf die Zubehörwand und fragt: „어떤 걸 찾으세요?“', en: 'A staff member gestures to the accessories wall and asks: “어떤 걸 찾으세요?”' },
    trophyWord: { word: '유심', meaning: { de: 'SIM-Karte', en: 'SIM card' }, example: '새 유심으로 바꿔요.', whyThisWord: { de: 'Dieses Wort benennt genau das kleine Teil, das du brauchst, um dein Handy vor Ort zu verbinden.', en: 'This word names the exact small item you need to get your phone connected locally.' } },
    distractors: ['새 휴대폰이', '충전기 하나'], placeholderCaption: { de: 'SIM-Karten-Packungen stehen ordentlich hinter dem Tresen eines Telefonladens.', en: 'SIM-card packs are neatly displayed behind the counter in a phone shop.' }, songMood: 'a practical city errand with a quick connection', visualNotes: 'Bright Seoul phone shop, wall of accessories, SIM packs and a helpful staff gesture.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'georeoseo-myeot-bun', title: { de: 'Wie viele Minuten zu Fuß?', en: 'How many minutes on foot?' },
    situation: { de: 'Jemand sagt nur, die Station sei gleich dort. Du fragst nach einer brauchbaren Gehzeit.', en: 'Someone only says the station is right over there. Ask for a useful walking estimate.' },
    pedagogicalGoal: 'Eine ungenaue Wegauskunft in eine konkrete Gehzeit verwandeln.',
    targetText: '여기에서 걸어서 몇 분 걸려요?', baseText: { de: 'Wie viele Minuten dauert es von hier zu Fuß?', en: 'How many minutes does it take to walk from here?' },
    chunks: [{ targetText: '여기에서 걸어서', baseText: { de: 'von hier zu Fuß', en: 'walking from here' } }, { targetText: '몇 분', baseText: { de: 'wie viele Minuten', en: 'how many minutes' } }, { targetText: '걸려요?', baseText: { de: 'dauert es?', en: 'does it take?' } }],
    terms: [{ targetText: '여기에서', baseText: { de: 'von hier', en: 'from here' } }, { targetText: '걸어서', baseText: { de: 'zu Fuß', en: 'on foot' } }, { targetText: '몇 분', baseText: { de: 'wie viele Minuten', en: 'how many minutes' } }, { targetText: '걸려요', baseText: { de: 'es dauert', en: 'it takes' } }, { targetText: '분', baseText: { de: 'Minute', en: 'minute' } }],
    recall: { before: '여기에서 걸어서 몇 분 ', answer: '걸려요', after: '?', fallbackChoices: ['걸려요', '멀어요', '보여요', '있어요'] }, speakRequired: ['걸어서', '몇', '걸려요'],
    sceneCaption: { de: 'Ein Passant zeigt die Straße entlang und sagt: „바로 저기예요.“', en: 'A passer-by points down the street and says: “바로 저기예요.”' },
    trophyWord: { word: '걸어서', meaning: { de: 'zu Fuß', en: 'on foot' }, example: '여기에서 걸어서 가요.', whyThisWord: { de: 'Dieses Wort macht eine Wegfrage praktisch, weil du damit gezielt die Gehzeit statt nur die Richtung erfährst.', en: 'This word makes a directions question practical because it asks for walking time rather than only direction.' } },
    distractors: ['지하철로 가요', '택시를 타요'], placeholderCaption: { de: 'Ein Bürgersteig führt zu einem fernen Stationsschild, während ein Passant die Richtung zeigt.', en: 'A sidewalk leads toward a distant station sign while a passer-by points the way.' }, songMood: 'a curious walk through an unfamiliar block', visualNotes: 'Seoul street corner, distant station sign, pedestrian pointing along a walkable sidewalk.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'masisseoyo-gyesanseo', title: { de: 'Die Rechnung, bitte', en: 'The bill, please' },
    situation: { de: 'Nach dem Essen fragt die Bedienung, ob alles in Ordnung ist. Du bestätigst das und bittest um die Rechnung.', en: 'After your meal, the server asks whether everything is all right. Confirm it and ask for the bill.' },
    pedagogicalGoal: 'Auf eine Servicefrage positiv reagieren und anschließend höflich die Rechnung erbitten.',
    targetText: '네, 맛있어요. 계산서 좀 주세요.', baseText: { de: 'Ja, es ist lecker. Bitte die Rechnung.', en: 'Yes, it is delicious. The bill, please.' },
    chunks: [{ targetText: '네, 맛있어요.', baseText: { de: 'Ja, es ist lecker.', en: 'Yes, it is delicious.' } }, { targetText: '계산서 좀', baseText: { de: 'die Rechnung bitte', en: 'the bill, please' } }, { targetText: '주세요.', baseText: { de: 'geben Sie sie mir.', en: 'please give it to me.' } }],
    terms: [{ targetText: '맛있어요', baseText: { de: 'es ist lecker', en: 'it is delicious' } }, { targetText: '계산서', baseText: { de: 'Rechnung', en: 'bill' } }, { targetText: '좀', baseText: { de: 'bitte; ein wenig', en: 'please; a little' } }, { targetText: '주세요', baseText: { de: 'bitte geben Sie mir', en: 'please give me' } }, { targetText: '식사', baseText: { de: 'Mahlzeit', en: 'meal' } }],
    recall: { before: '네, 맛있어요. ', answer: '계산서', after: ' 좀 주세요.', fallbackChoices: ['계산서', '메뉴판', '영수증', '물'] }, speakRequired: ['맛있어요', '계산서', '주세요'],
    sceneCaption: { de: 'Die Bedienung räumt Teller ab und fragt: „식사는 괜찮으세요?“', en: 'The server clears the plates and asks: “식사는 괜찮으세요?”' },
    trophyWord: { word: '맛있어요', meaning: { de: 'es ist lecker', en: 'it is delicious' }, example: '이 국은 정말 맛있어요.', whyThisWord: { de: 'Damit gibst du der Bedienung eine ehrliche positive Antwort, bevor du die nächste Bitte äußerst.', en: 'It lets you give the server a genuine positive answer before making your next request.' } },
    distractors: ['물 좀 주세요', '커피 한 잔'], placeholderCaption: { de: 'Abgeräumte Teller und eine Rechnungsmappe liegen auf einem kleinen Restauranttisch bereit.', en: 'Cleared plates and a bill folder wait on a small restaurant table.' }, songMood: 'a relaxed meal ending with easy confidence', visualNotes: 'Cozy Korean restaurant after lunch, server clearing dishes and a discreet bill folder.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'martin-hotel-reservation', title: { de: 'Unter dem Namen Martin', en: 'Under the name Martin' },
    situation: { de: 'An der Hotelrezeption wirst du nach dem Namen der Reservierung gefragt. Du nennst ihn klar.', en: 'At hotel reception, you are asked for the name on the reservation. State it clearly.' },
    pedagogicalGoal: 'Den Namen einer bestehenden Hotelreservierung in einem kurzen Empfangsdialog nennen.',
    targetText: '예약이 하나 있어요. 이름은 마틴이에요.', baseText: { de: 'Ich habe eine Reservierung. Der Name ist Martin.', en: 'I have one reservation. The name is Martin.' },
    chunks: [{ targetText: '예약이 하나 있어요.', baseText: { de: 'Ich habe eine Reservierung.', en: 'I have one reservation.' } }, { targetText: '이름은', baseText: { de: 'der Name ist', en: 'the name is' } }, { targetText: '마틴이에요.', baseText: { de: 'Martin.', en: 'Martin.' } }],
    terms: [{ targetText: '예약이', baseText: { de: 'Reservierung mit Subjektpartikel', en: 'reservation with subject particle' } }, { targetText: '하나', baseText: { de: 'eins', en: 'one' } }, { targetText: '있어요', baseText: { de: 'ich habe; es gibt', en: 'I have; there is' } }, { targetText: '이름은', baseText: { de: 'was den Namen angeht', en: 'as for the name' } }, { targetText: '마틴이에요', baseText: { de: 'es ist Martin', en: 'it is Martin' } }],
    recall: { before: '', answer: '예약이', after: ' 하나 있어요. 이름은 마틴이에요.', fallbackChoices: ['예약이', '자리가', '방이', '표가'] }, speakRequired: ['예약이', '하나', '마틴이에요'],
    sceneCaption: { de: 'Die Rezeptionistin blickt auf den Bildschirm und fragt: „예약자 이름이 뭐예요?“', en: 'The receptionist looks at the screen and asks: “예약자 이름이 뭐예요?”' },
    trophyWord: { word: '이름', meaning: { de: 'Name', en: 'name' }, example: '이름이 뭐예요?', whyThisWord: { de: 'Der Name ist der Schlüssel, mit dem die Rezeption deine vorhandene Reservierung sofort findet — und 이름 brauchst du bei jeder Anmeldung.', en: 'The name is the key that lets reception find your reservation immediately — and you need 이름 at every check-in.' } },
    distractors: ['이틀이에요', '방 하나예요'], placeholderCaption: { de: 'Eine Rezeptionistin prüft eine Buchung neben einer bereitliegenden Schlüsselkarte.', en: 'A receptionist checks a booking beside a waiting key card.' }, songMood: 'a calm hotel arrival with a room key waiting', visualNotes: 'Polished hotel desk, booking screen, key card and an unhurried arrival exchange.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'jeonbu-eolmayeyo', title: { de: 'Sonst nichts', en: 'Nothing else' },
    situation: { de: 'In der Apotheke fragt das Personal, ob du noch etwas brauchst. Du verneinst und fragst nach dem Gesamtpreis.', en: 'At the pharmacy, the staff member asks whether you need anything else. Decline and ask for the total.' },
    pedagogicalGoal: 'Einen kleinen Einkauf höflich abschließen und nach dem Gesamtpreis fragen.',
    targetText: '아니요, 더 필요 없어요. 전부 얼마예요?', baseText: { de: 'Nein, ich brauche nichts mehr. Wie viel ist alles zusammen?', en: 'No, I do not need anything else. How much is everything?' },
    chunks: [{ targetText: '아니요, 더 필요 없어요.', baseText: { de: 'Nein, ich brauche nichts mehr.', en: 'No, I do not need anything else.' } }, { targetText: '전부', baseText: { de: 'alles', en: 'everything' } }, { targetText: '얼마예요?', baseText: { de: 'wie viel ist es?', en: 'how much is it?' } }],
    terms: [{ targetText: '더', baseText: { de: 'mehr; zusätzlich', en: 'more; additionally' } }, { targetText: '필요 없어요', baseText: { de: 'ich brauche es nicht', en: 'I do not need it' } }, { targetText: '전부', baseText: { de: 'alles', en: 'everything' } }, { targetText: '얼마예요', baseText: { de: 'wie viel ist es?', en: 'how much is it?' } }, { targetText: '아니요', baseText: { de: 'nein', en: 'no' } }],
    recall: { before: '아니요, 더 필요 없어요. ', answer: '전부', after: ' 얼마예요?', fallbackChoices: ['전부', '조금', '아직', '많이'] }, speakRequired: ['필요', '전부', '얼마예요'],
    sceneCaption: { de: 'Die Apothekerin stellt eine kleine Schachtel hin und fragt: „더 필요한 거 있으세요?“', en: 'The pharmacist sets down a small box and asks: “더 필요한 거 있으세요?”' },
    trophyWord: { word: '전부', meaning: { de: 'alles', en: 'everything' }, example: '전부 다 주세요.', whyThisWord: { de: 'Dieses Wort fasst mehrere kleine Artikel zu einer klaren Frage nach einem Gesamtbetrag zusammen.', en: 'This word gathers several small items into one clear question about a total amount.' } },
    distractors: ['하나 더 주세요', '카드로 낼게요'], placeholderCaption: { de: 'Eine kleine Arzneischachtel liegt neben dem Kartenleser auf dem Apothekentresen.', en: 'A small medicine box rests beside the card reader on the pharmacy counter.' }, songMood: 'a quick helpful pharmacy errand', visualNotes: 'Neighborhood pharmacy, small medicine box, payment terminal, and a calm closing question.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'gil-kkeute-jihacheol', title: { de: 'Am Ende der Straße', en: 'At the end of the street' },
    situation: { de: 'Ein Tourist fragt dich nach der U-Bahn-Station. Du gibst eine klare kurze Wegauskunft.', en: 'A tourist asks you for the subway station. Give one clear short direction.' },
    pedagogicalGoal: 'Eine kurze Wegauskunft mit einem sichtbaren Orientierungspunkt geben.',
    targetText: '지하철역은 이 길 끝에 있어요.', baseText: { de: 'Die U-Bahn-Station ist am Ende dieser Straße.', en: 'The subway station is at the end of this street.' },
    chunks: [{ targetText: '지하철역은', baseText: { de: 'die U-Bahn-Station', en: 'the subway station' } }, { targetText: '이 길 끝에', baseText: { de: 'am Ende dieser Straße', en: 'at the end of this street' } }, { targetText: '있어요.', baseText: { de: 'ist dort.', en: 'is there.' } }],
    terms: [{ targetText: '지하철역은', baseText: { de: 'U-Bahn-Station mit Themenpartikel', en: 'subway station with topic particle' } }, { targetText: '길', baseText: { de: 'Straße oder Weg', en: 'street or road' } }, { targetText: '끝에', baseText: { de: 'am Ende', en: 'at the end' } }, { targetText: '있어요', baseText: { de: 'es ist da', en: 'it is there' } }, { targetText: '관광객', baseText: { de: 'Tourist', en: 'tourist' } }],
    recall: { before: '지하철역은 이 길 ', answer: '끝에', after: ' 있어요.', fallbackChoices: ['끝에', '앞에', '옆에', '안에'] }, speakRequired: ['지하철역은', '끝에', '있어요'],
    sceneCaption: { de: 'Ein Tourist hält eine Karte hoch und fragt: „지하철역이 어디에 있어요?“', en: 'A tourist holds up a map and asks: “지하철역이 어디에 있어요?”' },
    trophyWord: { word: '끝에', meaning: { de: 'am Ende', en: 'at the end' }, example: '길 끝에 공원이 있어요.', whyThisWord: { de: 'Mit diesem Ortsausdruck gibst du einem Besucher eine konkrete und leicht merkbare Richtung.', en: 'This location phrase gives a visitor a concrete, easy-to-remember direction.' } },
    distractors: ['왼쪽 길로', '횡단보도 앞에서'], placeholderCaption: { de: 'Ein Straßenplan, ein Stationsschild in der Ferne und eine klare Blickrichtung die Straße entlang.', en: 'A street map, a distant station sign, and a clear sightline down the road.' }, songMood: 'a friendly moment of local confidence', visualNotes: 'City corner, visitor holding a map, subway entrance visible at the far end of the street.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'sagwa-se-gae-remondo', title: { de: 'Obst für die Tüte', en: 'Fruit for the bag' },
    situation: { de: 'Auf dem Markt fragt der Händler nach deiner Menge. Du bestellst Äpfel und fügst Zitronen hinzu.', en: 'At the market, the vendor asks how much you want. Order apples and add lemons.' },
    pedagogicalGoal: 'Eine Marktmenge nennen und mit der Zusatzpartikel einen zweiten Artikel ergänzen.',
    targetText: '사과 세 개하고 레몬도 두 개 주세요.', baseText: { de: 'Drei Äpfel und auch zwei Zitronen, bitte.', en: 'Three apples and two lemons as well, please.' },
    chunks: [{ targetText: '사과 세 개하고', baseText: { de: 'drei Äpfel und', en: 'three apples and' } }, { targetText: '레몬도 두 개', baseText: { de: 'auch zwei Zitronen', en: 'two lemons as well' } }, { targetText: '주세요.', baseText: { de: 'bitte.', en: 'please.' } }],
    terms: [{ targetText: '사과', baseText: { de: 'Apfel', en: 'apple' } }, { targetText: '세 개', baseText: { de: 'drei Stück', en: 'three items' } }, { targetText: '레몬도', baseText: { de: 'auch Zitronen', en: 'lemons too' } }, { targetText: '두 개', baseText: { de: 'zwei Stück', en: 'two items' } }, { targetText: '주세요', baseText: { de: 'bitte geben Sie mir', en: 'please give me' } }],
    recall: { before: '사과 세 개하고 ', answer: '레몬도', after: ' 두 개 주세요.', fallbackChoices: ['레몬도', '사과도', '포도도', '배도'] }, speakRequired: ['사과', '레몬도', '주세요'],
    sceneCaption: { de: 'Der Markthändler öffnet eine Papiertüte und fragt: „뭘 얼마나 드릴까요?“', en: 'The market vendor opens a paper bag and asks: “뭘 얼마나 드릴까요?”' },
    trophyWord: { word: '레몬도', meaning: { de: 'auch Zitronen', en: 'lemons too' }, example: '레몬도 두 개 주세요.', whyThisWord: { de: 'Die angehängte Zusatzpartikel lässt dich auf dem Markt einen zweiten Artikel natürlich ergänzen.', en: 'The attached addition particle lets you naturally add a second item at the market.' } },
    distractors: ['포도 한 송이보다', '봉투 하나하고'], placeholderCaption: { de: 'Äpfel und Zitronen liegen neben einer offenen Papiertüte auf einem bunten Marktstand.', en: 'Apples and lemons sit beside an open paper bag at a colorful market stall.' }, songMood: 'a colorful market stop full of fresh choices', visualNotes: 'Outdoor market stall, apples and lemons, small scale, vendor holding open a paper bag.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'ije-dongnereul-araayo', title: { de: 'Schon etwas vertraut', en: 'A little familiar now' },
    situation: { de: 'Im Treppenhaus fragt ein Nachbar, wie es dir geht. Du sagst, dass du die Gegend inzwischen etwas kennst.', en: 'In the stairwell, a neighbor asks how you are doing. Say that you know the neighborhood a little now.' },
    pedagogicalGoal: 'Einem Nachbarn freundlich zeigen, dass der neue Alltag allmählich vertraut wird.',
    targetText: '네, 잘 지내요. 이제 동네를 조금 알아요.', baseText: { de: 'Ja, mir geht es gut. Ich kenne die Nachbarschaft jetzt ein bisschen.', en: 'Yes, I am doing well. I know the neighborhood a little now.' },
    chunks: [{ targetText: '네, 잘 지내요.', baseText: { de: 'Ja, mir geht es gut.', en: 'Yes, I am doing well.' } }, { targetText: '이제 동네를', baseText: { de: 'jetzt die Nachbarschaft', en: 'now, the neighborhood' } }, { targetText: '조금 알아요.', baseText: { de: 'kenne ich ein wenig.', en: 'I know a little.' } }],
    terms: [{ targetText: '이제', baseText: { de: 'jetzt, inzwischen', en: 'now, by now' } }, { targetText: '동네를', baseText: { de: 'die Nachbarschaft mit Objektpartikel', en: 'the neighborhood with object particle' } }, { targetText: '조금', baseText: { de: 'ein wenig', en: 'a little' } }, { targetText: '알아요', baseText: { de: 'ich kenne oder weiß', en: 'I know' } }, { targetText: '지내요', baseText: { de: 'mir geht es; ich verbringe Zeit', en: 'I am doing; I get along' } }],
    recall: { before: '네, 잘 지내요. 이제 ', answer: '동네를', after: ' 조금 알아요.', fallbackChoices: ['동네를', '시장을', '공원을', '거리를'] }, speakRequired: ['이제', '동네를', '알아요'],
    sceneCaption: { de: 'Ein Nachbar öffnet die Treppenhaustür und fragt: „요즘 잘 지내세요?“', en: 'A neighbor opens the stairwell door and asks: “요즘 잘 지내세요?”' },
    trophyWord: { word: '동네', meaning: { de: 'Nachbarschaft, Viertel', en: 'neighborhood' }, example: '이 동네를 좋아해요.', whyThisWord: { de: 'Dieses Wort macht deine Antwort persönlich: Du sprichst nicht nur über eine Adresse, sondern über deinen neuen Alltag.', en: 'This word makes your reply personal: you are talking not just about an address but about your new daily life.' } },
    distractors: ['집을 알아요', '가게가 있어요'], placeholderCaption: { de: 'Zwei Nachbarn begegnen sich in einem hellen Treppenhaus mit einem kleinen Begrüßungslächeln.', en: 'Two neighbors meet in a bright stairwell with a small welcoming smile.' }, songMood: 'a warm everyday hello among new neighbors', visualNotes: 'Apartment stairwell, open doorway, friendly neighbor, and a growing sense of belonging.',
  }),
]

export const KOREAN_A2_PRACTICAL_1_LESSONS: GuidedLessonDefinition[] = makeKoreanA2PracticalLessons(
  GUIDED_TODAY_PATH_KOREAN_A2_ONE_METADATA, koreanA2Practical1Inputs,
  { de: 'Du hast Koreanisch A2 Praxis 1 abgeschlossen und kannst vertraute Alltagsgespräche sicher weiterführen.', en: 'You have completed Korean A2 Practical 1 and can confidently continue familiar everyday exchanges.' },
)

export const GUIDED_TODAY_PATH_KOREAN_A2_TWO_METADATA: GuidedPathMetadata = {
  id: 'korean-a2-practical-2', title: 'Korean A2 Practical 2', shortTitle: 'A2 Practical 2',
  subtitle: { de: 'Auswählen, begründen und freundlich entscheiden', en: 'Choosing, giving reasons, and deciding politely' },
  level: 'A2', baseLanguage: 'German', targetLanguage: 'Korean', estimatedMinutes: 5,
}

const koreanA2Practical2Inputs: KoreanA2LessonInput[] = [
  makeKoreanA2CompactLesson({
    slug: 'ige-deo-ssaseo', title: { de: 'Dieses, weil es günstiger ist', en: 'This one, because it is cheaper' },
    situation: { de: 'Auf dem Markt hält der Händler zwei Apfelsorten hoch. Du wählst die günstigere aus.', en: 'At the market, the vendor holds up two kinds of apples. Choose the cheaper one.' },
    pedagogicalGoal: 'Eine Wahl mit einer kurzen Begründung treffen und höflich abschließen.',
    targetText: '이게 더 싸서 이걸로 주세요.', baseText: { de: 'Dieses ist günstiger, also bitte dieses hier.', en: 'This one is cheaper, so please give me this one.' },
    chunks: [{ targetText: '이게 더 싸서', baseText: { de: 'weil dieses günstiger ist', en: 'because this is cheaper' } }, { targetText: '이걸로', baseText: { de: 'dieses hier', en: 'this one' } }, { targetText: '주세요.', baseText: { de: 'bitte.', en: 'please.' } }],
    terms: [{ targetText: '싸서', baseText: { de: 'weil es günstig ist', en: 'because it is cheap' } }, { targetText: '이걸로', baseText: { de: 'dieses hier', en: 'this one' } }, { targetText: '사과', baseText: { de: 'Apfel', en: 'apple' } }, { targetText: '더', baseText: { de: 'mehr; hier: günstiger', en: 'more; here: cheaper' } }, { targetText: '주세요', baseText: { de: 'bitte geben Sie mir', en: 'please give me' } }],
    recall: { before: '이게 더 ', answer: '싸서', after: ' 이걸로 주세요.', fallbackChoices: ['싸서', '커서', '작아서', '예뻐서'] }, speakRequired: ['싸서', '이걸로', '주세요'],
    sceneCaption: { de: 'Der Händler hält zwei Äpfel nebeneinander und fragt: „어느 사과로 드릴까요?“', en: 'The vendor holds two apples side by side and asks: “어느 사과로 드릴까요?”' },
    trophyWord: { word: '싸서', meaning: { de: 'weil es günstig ist', en: 'because it is cheap' }, example: '이게 더 싸서 좋아요.', whyThisWord: { de: 'Die Form gibt dir auf dem Markt einen einfachen, natürlichen Grund für deine Auswahl.', en: 'This form gives you a simple, natural reason for your choice at the market.' } },
    distractors: ['저 사과로', '두 개 주세요'], placeholderCaption: { de: 'Zwei Apfelsorten liegen mit gut sichtbaren Preisschildern auf einem Marktstand.', en: 'Two varieties of apples sit on a market stall with clear price labels.' }, songMood: 'a bright market choice with a clear reason', visualNotes: 'Fruit stall, two apples in the vendor hands, price tags and a decisive pointing gesture.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'deowoseo-iceuro', title: { de: 'Heute lieber kalt', en: 'Iced today' },
    situation: { de: 'Im Café fragt die Barista nach deiner Getränkewahl. Weil es heiß ist, wählst du die kalte Variante.', en: 'At the cafe, the barista asks for your drink choice. Because it is hot, choose the iced version.' },
    pedagogicalGoal: 'Eine Getränkewahl mit einer einfachen Wetterbegründung treffen.',
    targetText: '오늘은 너무 더워서 아이스로 할게요.', baseText: { de: 'Heute ist es so heiß, deshalb nehme ich es mit Eis.', en: 'It is so hot today, so I will have it iced.' },
    chunks: [{ targetText: '오늘은 너무 더워서', baseText: { de: 'weil es heute so heiß ist', en: 'because it is so hot today' } }, { targetText: '아이스로', baseText: { de: 'als kalte Variante', en: 'as an iced drink' } }, { targetText: '할게요.', baseText: { de: 'nehme ich.', en: 'I will have.' } }],
    terms: [{ targetText: '너무', baseText: { de: 'sehr', en: 'so' } }, { targetText: '더워서', baseText: { de: 'weil es heiß ist', en: 'because it is hot' } }, { targetText: '아이스로', baseText: { de: 'kalt serviert', en: 'served iced' } }, { targetText: '할게요', baseText: { de: 'ich nehme es', en: 'I will have it' } }, { targetText: '오늘은', baseText: { de: 'was heute angeht', en: 'as for today' } }],
    recall: { before: '오늘은 너무 ', answer: '더워서', after: ' 아이스로 할게요.', fallbackChoices: ['더워서', '추워서', '피곤해서', '바빠서'] }, speakRequired: ['더워서', '아이스로', '할게요'],
    sceneCaption: { de: 'Die Barista schaut auf die heiße Straße und fragt: „오늘은 따뜻한 걸로 드릴까요?“', en: 'The barista glances at the hot street and asks: “오늘은 따뜻한 걸로 드릴까요?”' },
    trophyWord: { word: '더워서', meaning: { de: 'weil es heiß ist', en: 'because it is hot' }, example: '날씨가 더워서 물을 마셔요.', whyThisWord: { de: 'Damit verknüpfst du die Hitze direkt mit einer passenden Getränkewahl.', en: 'It links the heat directly to an appropriate drink choice.' } },
    distractors: ['따뜻하게 할게요', '물 한 병'], placeholderCaption: { de: 'Eiswürfel, ein kalter Becher und helles Sommerlicht stehen auf dem Cafétresen.', en: 'Ice cubes, a cold cup, and bright summer light sit on the cafe counter.' }, songMood: 'a cool drink choice on a hot Seoul afternoon', visualNotes: 'Sunny cafe window, iced drink, glowing street heat and a quick confident switch.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'paransaegi-deo-yeppeo', title: { de: 'Das Blau', en: 'The blue one' },
    situation: { de: 'In einem Laden zeigt dir ein Mitarbeiter zwei Farben. Du wählst die blaue, weil sie schöner ist.', en: 'In a shop, a staff member shows you two colors. Choose the blue one because it is prettier.' },
    pedagogicalGoal: 'Eine Farbe vergleichen, begründen und mit einer Entscheidung abschließen.',
    targetText: '파란색이 더 예뻐서 이걸로 할게요.', baseText: { de: 'Blau ist hübscher, deshalb nehme ich dieses hier.', en: 'The blue one is prettier, so I will take this one.' },
    chunks: [{ targetText: '파란색이 더 예뻐서', baseText: { de: 'weil Blau hübscher ist', en: 'because blue is prettier' } }, { targetText: '이걸로', baseText: { de: 'dieses hier', en: 'this one' } }, { targetText: '할게요.', baseText: { de: 'nehme ich.', en: 'I will take it.' } }],
    terms: [{ targetText: '파란색이', baseText: { de: 'Blau mit Subjektpartikel', en: 'blue with subject particle' } }, { targetText: '예뻐서', baseText: { de: 'weil es hübsch ist', en: 'because it is pretty' } }, { targetText: '이걸로', baseText: { de: 'dieses hier', en: 'this one' } }, { targetText: '할게요', baseText: { de: 'ich nehme es', en: 'I will take it' } }, { targetText: '색', baseText: { de: 'Farbe', en: 'color' } }],
    recall: { before: '파란색이 더 ', answer: '예뻐서', after: ' 이걸로 할게요.', fallbackChoices: ['예뻐서', '커서', '작아서', '밝아서'] }, speakRequired: ['파란색이', '예뻐서', '할게요'],
    sceneCaption: { de: 'Ein Mitarbeiter hält zwei Hemden hoch und fragt: „어느 색으로 해 드릴까요?“', en: 'A staff member holds up two shirts and asks: “어느 색으로 해 드릴까요?”' },
    trophyWord: { word: '파란색', meaning: { de: 'blaue Farbe', en: 'blue color' }, example: '파란색이 더 예뻐요.', whyThisWord: { de: 'Mit diesem Farbnamen kannst du eine sichtbare Auswahl konkret und freundlich begründen.', en: 'This color word lets you explain a visible choice specifically and politely.' } },
    distractors: ['검은색으로 할게요', '큰 걸로 주세요'], placeholderCaption: { de: 'Zwei farbige Hemden hängen nebeneinander in einem aufgeräumten kleinen Laden.', en: 'Two colored shirts hang side by side in a tidy small shop.' }, songMood: 'a light confident color choice', visualNotes: 'Compact clothing shop, two shirt colors, mirror light and a clear selection gesture.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'gugi-deo-gabyeowo', title: { de: 'Etwas Leichteres', en: 'Something lighter' },
    situation: { de: 'Im Restaurant nennt die Bedienung zwei Gerichte. Du entscheidest dich für die Suppe, weil sie leichter ist.', en: 'At a restaurant, the server names two dishes. Choose the soup because it is lighter.' },
    pedagogicalGoal: 'Zwischen Gerichten vergleichen und eine Entscheidung mit einem Grund treffen.',
    targetText: '국이 더 가벼워서 이걸로 할게요.', baseText: { de: 'Die Suppe ist leichter, deshalb nehme ich dieses Gericht.', en: 'The soup is lighter, so I will take this dish.' },
    chunks: [{ targetText: '국이 더 가벼워서', baseText: { de: 'weil die Suppe leichter ist', en: 'because the soup is lighter' } }, { targetText: '이걸로', baseText: { de: 'dieses Gericht', en: 'this dish' } }, { targetText: '할게요.', baseText: { de: 'nehme ich.', en: 'I will take it.' } }],
    terms: [{ targetText: '국이', baseText: { de: 'Suppe mit Subjektpartikel', en: 'soup with subject particle' } }, { targetText: '가벼워서', baseText: { de: 'weil es leicht ist', en: 'because it is light' } }, { targetText: '이걸로', baseText: { de: 'dieses Gericht', en: 'this dish' } }, { targetText: '할게요', baseText: { de: 'ich nehme es', en: 'I will take it' } }, { targetText: '음식', baseText: { de: 'Essen oder Gericht', en: 'food or dish' } }],
    recall: { before: '국이 더 ', answer: '가벼워서', after: ' 이걸로 할게요.', fallbackChoices: ['가벼워서', '따뜻해서', '싸서', '매워서'] }, speakRequired: ['국이', '가벼워서', '할게요'],
    sceneCaption: { de: 'Die Bedienung zeigt auf die Karte und fragt: „비빔밥하고 국 중에 뭐가 좋아요?“', en: 'The server points to the menu and asks: “비빔밥하고 국 중에 뭐가 좋아요?”' },
    trophyWord: { word: '가벼워서', meaning: { de: 'weil es leicht ist', en: 'because it is light' }, example: '이 음식이 가벼워서 좋아요.', whyThisWord: { de: 'Die Form hilft dir, beim Essen eine weniger schwere Wahl höflich zu erklären.', en: 'This form helps you explain a less heavy food choice politely.' } },
    distractors: ['비빔밥으로 할게요', '물도 주세요'], placeholderCaption: { de: 'Eine Speisekarte zeigt eine Schale Suppe neben einem kräftigeren Gericht.', en: 'A menu shows a bowl of soup beside a heartier dish.' }, songMood: 'a calm lunch choice with a gentle reason', visualNotes: 'Small Korean restaurant, soup bowl photo on menu, relaxed lunchtime decision.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'ttatteuthaeseo-ppang', title: { de: 'Das warme Brot', en: 'The warm bread' },
    situation: { de: 'In einer Bäckerei stellt die Verkäuferin zwei Brote hin. Du nimmst das wärmere.', en: 'At a bakery, the clerk sets out two loaves. Choose the warmer one.' },
    pedagogicalGoal: 'Eine Wahl im Laden mit einer einfachen Eigenschaft begründen.',
    targetText: '이 빵이 더 따뜻해서 이걸로 할게요.', baseText: { de: 'Dieses Brot ist wärmer, deshalb nehme ich dieses hier.', en: 'This bread is warmer, so I will take this one.' },
    chunks: [{ targetText: '이 빵이 더 따뜻해서', baseText: { de: 'weil dieses Brot wärmer ist', en: 'because this bread is warmer' } }, { targetText: '이걸로', baseText: { de: 'dieses hier', en: 'this one' } }, { targetText: '할게요.', baseText: { de: 'nehme ich.', en: 'I will take it.' } }],
    terms: [{ targetText: '빵이', baseText: { de: 'Brot mit Subjektpartikel', en: 'bread with subject particle' } }, { targetText: '따뜻해서', baseText: { de: 'weil es warm ist', en: 'because it is warm' } }, { targetText: '이걸로', baseText: { de: 'dieses hier', en: 'this one' } }, { targetText: '할게요', baseText: { de: 'ich nehme es', en: 'I will take it' } }, { targetText: '더', baseText: { de: 'mehr; hier: wärmer', en: 'more; here: warmer' } }],
    recall: { before: '이 빵이 더 ', answer: '따뜻해서', after: ' 이걸로 할게요.', fallbackChoices: ['따뜻해서', '신선해서', '부드러워서', '달아서'] }, speakRequired: ['빵이', '따뜻해서', '할게요'],
    sceneCaption: { de: 'Die Verkäuferin legt zwei Brote auf ein Tablett und fragt: „어느 빵으로 드릴까요?“', en: 'The clerk places two loaves on a tray and asks: “어느 빵으로 드릴까요?”' },
    trophyWord: { word: '따뜻해서', meaning: { de: 'weil es warm ist', en: 'because it is warm' }, example: '빵이 따뜻해서 맛있어요.', whyThisWord: { de: 'Damit erklärst du eine sofort sichtbare Bäckereiwahl mit einem natürlichen Grund.', en: 'It lets you explain an immediately visible bakery choice with a natural reason.' } },
    distractors: ['저 빵으로 할게요', '봉투에 주세요'], placeholderCaption: { de: 'Frische Brote liegen auf einem Blech unter warmem Bäckereilicht.', en: 'Fresh loaves sit on a tray under warm bakery light.' }, songMood: 'a cozy bakery choice fresh from the oven', visualNotes: 'Neighborhood bakery, warm loaves, metal tray and an inviting golden counter light.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'jihacheori-deo-ppalla', title: { de: 'Die U-Bahn ist schneller', en: 'The subway is faster' },
    situation: { de: 'Ein Freund fragt, ob ihr den Bus nehmen sollt. Du wählst die U-Bahn, weil sie schneller ist.', en: 'A friend asks whether you should take the bus. Choose the subway because it is faster.' },
    pedagogicalGoal: 'Zwei Verkehrsmittel vergleichen und die gewählte Route begründen.',
    targetText: '지하철이 더 빨라서 지하철로 가요.', baseText: { de: 'Die U-Bahn ist schneller, deshalb fahren wir mit der U-Bahn.', en: 'The subway is faster, so we go by subway.' },
    chunks: [{ targetText: '지하철이 더 빨라서', baseText: { de: 'weil die U-Bahn schneller ist', en: 'because the subway is faster' } }, { targetText: '지하철로', baseText: { de: 'mit der U-Bahn', en: 'by subway' } }, { targetText: '가요.', baseText: { de: 'fahren wir.', en: 'we go.' } }],
    terms: [{ targetText: '지하철이', baseText: { de: 'U-Bahn mit Subjektpartikel', en: 'subway with subject particle' } }, { targetText: '빨라서', baseText: { de: 'weil sie schnell ist', en: 'because it is fast' } }, { targetText: '지하철로', baseText: { de: 'mit der U-Bahn', en: 'by subway' } }, { targetText: '가요', baseText: { de: 'wir gehen oder fahren', en: 'we go' } }, { targetText: '버스', baseText: { de: 'Bus', en: 'bus' } }],
    recall: { before: '지하철이 더 ', answer: '빨라서', after: ' 지하철로 가요.', fallbackChoices: ['빨라서', '가까워서', '조용해서', '편해서'] }, speakRequired: ['지하철이', '빨라서', '지하철로'],
    sceneCaption: { de: 'Dein Freund schaut auf die Haltestelle und fragt: „버스하고 지하철 중에 뭐가 빨라요?“', en: 'Your friend looks at the stop and asks: “버스하고 지하철 중에 뭐가 빨라요?”' },
    trophyWord: { word: '빨라서', meaning: { de: 'weil es schnell ist', en: 'because it is fast' }, example: '지하철이 빨라서 좋아요.', whyThisWord: { de: 'Diese Form begründet eine Verkehrsentscheidung, wenn Zeit bei deinem Weg durch die Stadt zählt.', en: 'This form explains a transport choice when time matters on your way through the city.' } },
    distractors: ['버스로 가요', '걸어서 가요'], placeholderCaption: { de: 'Ein U-Bahn-Schild und eine Bushaltestelle stehen an derselben belebten Kreuzung.', en: 'A subway sign and bus stop stand at the same busy intersection.' }, songMood: 'a quick city route choice with momentum', visualNotes: 'Seoul intersection, subway entrance and bus stop, two friends deciding between routes.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'joyonghan-bang', title: { de: 'Das ruhigere Zimmer', en: 'The quieter room' },
    situation: { de: 'Im Hotel zeigt dir die Rezeption zwei Zimmer. Du wählst das ruhigere, weil du dort besser schlafen kannst.', en: 'At the hotel, reception shows you two rooms. Choose the quieter one because you can sleep better there.' },
    pedagogicalGoal: 'Eine Zimmerwahl mit Ruhe und Komfort begründen.',
    targetText: '조용한 방이 더 편해서 이 방으로 할게요.', baseText: { de: 'Das ruhige Zimmer ist bequemer, deshalb nehme ich dieses Zimmer.', en: 'The quiet room is more comfortable, so I will take this room.' },
    chunks: [{ targetText: '조용한 방이 더 편해서', baseText: { de: 'weil das ruhige Zimmer bequemer ist', en: 'because the quiet room is more comfortable' } }, { targetText: '이 방으로', baseText: { de: 'dieses Zimmer', en: 'this room' } }, { targetText: '할게요.', baseText: { de: 'nehme ich.', en: 'I will take it.' } }],
    terms: [{ targetText: '조용한', baseText: { de: 'ruhig', en: 'quiet' } }, { targetText: '방이', baseText: { de: 'Zimmer mit Subjektpartikel', en: 'room with subject particle' } }, { targetText: '편해서', baseText: { de: 'weil es bequem ist', en: 'because it is comfortable' } }, { targetText: '이 방으로', baseText: { de: 'dieses Zimmer', en: 'this room' } }, { targetText: '할게요', baseText: { de: 'ich nehme es', en: 'I will take it' } }],
    recall: { before: '조용한 방이 더 ', answer: '편해서', after: ' 이 방으로 할게요.', fallbackChoices: ['편해서', '조용해서', '넓어서', '밝아서'] }, speakRequired: ['조용한', '편해서', '할게요'],
    sceneCaption: { de: 'Die Rezeptionistin legt zwei Schlüsselanhänger hin und fragt: „어느 방으로 해 드릴까요?“', en: 'The receptionist lays out two key tags and asks: “어느 방으로 해 드릴까요?”' },
    trophyWord: { word: '조용한', meaning: { de: 'ruhig', en: 'quiet' }, example: '조용한 방이 좋아요.', whyThisWord: { de: 'Mit diesem Adjektiv beschreibst du genau die Eigenschaft, die dir für eine gute Nacht wichtig ist.', en: 'This adjective describes the exact quality that matters to you for a good night.' } },
    distractors: ['큰 방으로 할게요', '창문을 열어요'], placeholderCaption: { de: 'Zwei Schlüsselanhänger liegen auf einem ruhigen Hotelrezeptionstresen.', en: 'Two key tags rest on a quiet hotel reception counter.' }, songMood: 'a calm room choice for a restful night', visualNotes: 'Hotel desk, two room keys, quiet corridor beyond, thoughtful but easy decision.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'sinbari-deo-pyeonhae', title: { de: 'Die bequemen Schuhe', en: 'The comfortable shoes' },
    situation: { de: 'An einem Marktstand probierst du zwei Paar Schuhe an. Du entscheidest dich für das bequemere Paar.', en: 'At a market stall, you try on two pairs of shoes. Choose the more comfortable pair.' },
    pedagogicalGoal: 'Eine Kaufentscheidung auf die Eigenschaft bequem stützen.',
    targetText: '이 신발이 더 편해서 이걸로 할게요.', baseText: { de: 'Dieser Schuh ist bequemer, deshalb nehme ich diesen.', en: 'This shoe is more comfortable, so I will take this one.' },
    chunks: [{ targetText: '이 신발이 더 편해서', baseText: { de: 'weil dieser Schuh bequemer ist', en: 'because this shoe is more comfortable' } }, { targetText: '이걸로', baseText: { de: 'dieses hier', en: 'this one' } }, { targetText: '할게요.', baseText: { de: 'nehme ich.', en: 'I will take it.' } }],
    terms: [{ targetText: '신발이', baseText: { de: 'Schuh mit Subjektpartikel', en: 'shoe with subject particle' } }, { targetText: '편해서', baseText: { de: 'weil er bequem ist', en: 'because it is comfortable' } }, { targetText: '이걸로', baseText: { de: 'dieses hier', en: 'this one' } }, { targetText: '할게요', baseText: { de: 'ich nehme es', en: 'I will take it' } }, { targetText: '시장', baseText: { de: 'Markt', en: 'market' } }],
    recall: { before: '이 ', answer: '신발이', after: ' 더 편해서 이걸로 할게요.', fallbackChoices: ['신발이', '가방이', '모자가', '양말이'] }, speakRequired: ['신발이', '편해서', '할게요'],
    sceneCaption: { de: 'Die Verkäuferin stellt zwei Paar hin und fragt: „어느 신발이 편해요?“', en: 'The seller puts down two pairs and asks: “어느 신발이 편해요?”' },
    trophyWord: { word: '신발', meaning: { de: 'Schuhe', en: 'shoes' }, example: '이 신발이 편해요.', whyThisWord: { de: 'Dieses Wort steht im Mittelpunkt deiner Entscheidung, wenn du ein Paar für längere Wege aussuchst.', en: 'This word is central to your decision when choosing a pair for longer walks.' } },
    distractors: ['검은색으로 할게요', '가방 하나 주세요'], placeholderCaption: { de: 'Zwei Paar Schuhe stehen auf einer kleinen Sitzbank an einem Marktstand.', en: 'Two pairs of shoes sit on a small bench at a market stall.' }, songMood: 'a practical market choice for walking the city', visualNotes: 'Street market shoe stall, two pairs on a bench, comfortable fit checked with a small step.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'jageun-mulbyeong', title: { de: 'Die kleinere Flasche', en: 'The smaller bottle' },
    situation: { de: 'Im Laden schlägt das Personal eine große Flasche vor. Du nimmst die kleinere, weil sie günstiger ist.', en: 'In a shop, the staff member suggests a large bottle. Choose the smaller one because it is cheaper.' },
    pedagogicalGoal: 'Bei einem Einkauf Größe und Preis in einer kurzen Begründung verbinden.',
    targetText: '작은 물병이 더 싸서 이걸로 할게요.', baseText: { de: 'Die kleine Wasserflasche ist günstiger, deshalb nehme ich diese.', en: 'The small water bottle is cheaper, so I will take this one.' },
    chunks: [{ targetText: '작은 물병이 더 싸서', baseText: { de: 'weil die kleine Wasserflasche günstiger ist', en: 'because the small water bottle is cheaper' } }, { targetText: '이걸로', baseText: { de: 'diese hier', en: 'this one' } }, { targetText: '할게요.', baseText: { de: 'nehme ich.', en: 'I will take it.' } }],
    terms: [{ targetText: '작은', baseText: { de: 'klein', en: 'small' } }, { targetText: '물병이', baseText: { de: 'Wasserflasche mit Subjektpartikel', en: 'water bottle with subject particle' } }, { targetText: '싸서', baseText: { de: 'weil sie günstig ist', en: 'because it is cheap' } }, { targetText: '이걸로', baseText: { de: 'diese hier', en: 'this one' } }, { targetText: '할게요', baseText: { de: 'ich nehme sie', en: 'I will take it' } }],
    recall: { before: '작은 ', answer: '물병이', after: ' 더 싸서 이걸로 할게요.', fallbackChoices: ['물병이', '음료가', '주스가', '우유가'] }, speakRequired: ['물병이', '싸서', '할게요'],
    sceneCaption: { de: 'Die Verkäuferin zeigt auf zwei Größen und fragt: „큰 물병으로 드릴까요?“', en: 'The clerk points to two sizes and asks: “큰 물병으로 드릴까요?”' },
    trophyWord: { word: '물병', meaning: { de: 'Wasserflasche', en: 'water bottle' }, example: '작은 물병이 있어요.', whyThisWord: { de: 'Mit diesem Alltagswort kannst du eine konkrete Größe wählen, ohne auf die Flasche zeigen zu müssen.', en: 'This everyday word lets you choose a specific size without having to point at the bottle.' } },
    distractors: ['큰 걸로 할게요', '주스 한 병'], placeholderCaption: { de: 'Eine kleine und eine große Wasserflasche stehen nebeneinander im Kühlregal.', en: 'A small and large water bottle stand side by side in a chilled case.' }, songMood: 'a simple everyday choice that saves a little', visualNotes: 'Convenience-store cooler, two water bottle sizes, clear price labels and a practical hand gesture.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'gakkapgo-joyonghan-cafe', title: { de: 'Mein Lieblingscafé', en: 'My favorite cafe' },
    situation: { de: 'Ein Nachbar fragt nach deinem Lieblingsort in der Gegend. Du nennst dieses Café, weil es nah und ruhig ist.', en: 'A neighbor asks for your favorite spot in the neighborhood. Name this cafe because it is close and quiet.' },
    pedagogicalGoal: 'Einen Lieblingsort mit zwei einfachen Eigenschaften beschreiben.',
    targetText: '가깝고 조용해서 이 카페를 좋아해요.', baseText: { de: 'Weil es nah und ruhig ist, mag ich dieses Café.', en: 'Because it is close and quiet, I like this cafe.' },
    chunks: [{ targetText: '가깝고 조용해서', baseText: { de: 'weil es nah und ruhig ist', en: 'because it is close and quiet' } }, { targetText: '이 카페를', baseText: { de: 'dieses Café', en: 'this cafe' } }, { targetText: '좋아해요.', baseText: { de: 'mag ich.', en: 'I like.' } }],
    terms: [{ targetText: '가깝고', baseText: { de: 'nah und', en: 'close and' } }, { targetText: '조용해서', baseText: { de: 'weil es ruhig ist', en: 'because it is quiet' } }, { targetText: '카페를', baseText: { de: 'das Café mit Objektpartikel', en: 'the cafe with object particle' } }, { targetText: '좋아해요', baseText: { de: 'ich mag', en: 'I like' } }, { targetText: '동네', baseText: { de: 'Nachbarschaft', en: 'neighborhood' } }],
    recall: { before: '가깝고 ', answer: '조용해서', after: ' 이 카페를 좋아해요.', fallbackChoices: ['조용해서', '넓어서', '밝아서', '싸서'] }, speakRequired: ['가깝고', '조용해서', '좋아해요'],
    sceneCaption: { de: 'Dein Nachbar schaut zur Caféfront und fragt: „이 동네에서 좋아하는 곳이 있어요?“', en: 'Your neighbor looks toward the cafe front and asks: “이 동네에서 좋아하는 곳이 있어요?”' },
    trophyWord: { word: '가깝고', meaning: { de: 'nah und', en: 'close and' }, example: '집에서 가깝고 조용해요.', whyThisWord: { de: 'Die Verknüpfung verbindet deine zwei Gründe flüssig, wenn du einen Ort in der Nachbarschaft empfiehlst.', en: 'This connector joins your two reasons smoothly when recommending a place in the neighborhood.' } },
    distractors: ['저 카페보다', '공원에 가서'], placeholderCaption: { de: 'Ein ruhiges Café an einer nahen Seitenstraße liegt im warmen Nachmittagslicht.', en: 'A quiet cafe on a nearby side street sits in warm afternoon light.' }, songMood: 'a quiet local cafe that feels like a small discovery', visualNotes: 'Neighborhood cafe exterior, leafy side street, two neighbors talking with the entrance in view.',
  }),
]

export const KOREAN_A2_PRACTICAL_2_LESSONS: GuidedLessonDefinition[] = makeKoreanA2PracticalLessons(
  GUIDED_TODAY_PATH_KOREAN_A2_TWO_METADATA, koreanA2Practical2Inputs,
  { de: 'Du hast Koreanisch A2 Praxis 2 abgeschlossen und kannst Entscheidungen freundlich begründen.', en: 'You have completed Korean A2 Practical 2 and can explain choices politely.' },
)

export const GUIDED_TODAY_PATH_KOREAN_A2_THREE_METADATA: GuidedPathMetadata = {
  id: 'korean-a2-practical-3', title: 'Korean A2 Practical 3', shortTitle: 'A2 Practical 3',
  subtitle: { de: 'Über gestern, schon und noch nicht sprechen', en: 'Talking about yesterday, already, and not yet' },
  level: 'A2', baseLanguage: 'German', targetLanguage: 'Korean', estimatedMinutes: 5,
}

const koreanA2Practical3Inputs: KoreanA2LessonInput[] = [
  makeKoreanA2CompactLesson({
    slug: 'beolsseo-gyesanhaesseoyo', title: { de: 'Schon bezahlt', en: 'Already paid' },
    situation: { de: 'An der Kasse bietet das Personal an zu helfen. Du erklärst, dass du schon bezahlt hast, und bittest um einen Beleg.', en: 'At the counter, the staff member offers to help. Explain that you have already paid and ask for a receipt.' },
    pedagogicalGoal: 'Mit einem Zeitadverb sagen, dass eine Handlung bereits erledigt ist.',
    targetText: '벌써 계산했어요. 영수증도 한 장 주세요.', baseText: { de: 'Ich habe schon bezahlt. Bitte auch einen Beleg.', en: 'I already paid. Please give me a receipt too.' },
    chunks: [{ targetText: '벌써 계산했어요.', baseText: { de: 'Ich habe schon bezahlt.', en: 'I already paid.' } }, { targetText: '영수증도 한 장', baseText: { de: 'auch einen Beleg', en: 'a receipt too' } }, { targetText: '주세요.', baseText: { de: 'bitte.', en: 'please.' } }],
    terms: [{ targetText: '벌써', baseText: { de: 'schon', en: 'already' } }, { targetText: '계산했어요', baseText: { de: 'ich habe bezahlt', en: 'I paid' } }, { targetText: '영수증도', baseText: { de: 'auch einen Beleg', en: 'a receipt too' } }, { targetText: '한 장', baseText: { de: 'ein Blatt', en: 'one sheet' } }, { targetText: '주세요', baseText: { de: 'bitte geben Sie mir', en: 'please give me' } }],
    recall: { before: '벌써 ', answer: '계산했어요', after: '. 영수증도 한 장 주세요.', fallbackChoices: ['계산했어요', '주문했어요', '샀어요', '봤어요'] }, speakRequired: ['벌써', '계산했어요', '영수증도'],
    sceneCaption: { de: 'Die Kassiererin deutet auf das Kartenlesergerät und fragt: „계산 도와드릴까요?“', en: 'The cashier gestures to the card reader and asks: “계산 도와드릴까요?”' },
    trophyWord: { word: '벌써', meaning: { de: 'schon', en: 'already' }, example: '벌써 밥을 먹었어요.', whyThisWord: { de: 'Dieses Zeitwort zeigt der Kassiererin klar, dass der Bezahlvorgang schon abgeschlossen ist.', en: 'This time word clearly tells the cashier that payment has already been completed.' } },
    distractors: ['카드로 낼게요', '현금으로 낼게요'], placeholderCaption: { de: 'Ein Kartenleser und ein gedruckter Beleg liegen auf einem aufgeräumten Ladentresen.', en: 'A card reader and printed receipt sit on a tidy shop counter.' }, songMood: 'a quick completed errand with a neat receipt', visualNotes: 'Checkout counter, contactless terminal, receipt printer and a calm completed-payment gesture.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'eojenyeok-dochakaesseoyo', title: { de: 'Gestern angekommen', en: 'Arrived yesterday' },
    situation: { de: 'An der Hotelrezeption fragt man, wann du angekommen bist. Du nennst den gestrigen Abend.', en: 'At hotel reception, you are asked when you arrived. Say that it was yesterday evening.' },
    pedagogicalGoal: 'Eine abgeschlossene Ankunft mit einer einfachen Zeitangabe ausdrücken.',
    targetText: '어제 저녁에 호텔에 늦게 도착했어요.', baseText: { de: 'Ich bin gestern Abend spät im Hotel angekommen.', en: 'I arrived at the hotel late yesterday evening.' },
    chunks: [{ targetText: '어제 저녁에', baseText: { de: 'gestern Abend', en: 'yesterday evening' } }, { targetText: '호텔에 늦게', baseText: { de: 'spät im Hotel', en: 'late at the hotel' } }, { targetText: '도착했어요.', baseText: { de: 'bin ich angekommen.', en: 'I arrived.' } }],
    terms: [{ targetText: '어제', baseText: { de: 'gestern', en: 'yesterday' } }, { targetText: '저녁에', baseText: { de: 'am Abend', en: 'in the evening' } }, { targetText: '늦게', baseText: { de: 'spät', en: 'late' } }, { targetText: '도착했어요', baseText: { de: 'ich bin angekommen', en: 'I arrived' } }, { targetText: '호텔에', baseText: { de: 'zum Hotel', en: 'at the hotel' } }],
    recall: { before: '어제 저녁에 호텔에 늦게 ', answer: '도착했어요', after: '.', fallbackChoices: ['도착했어요', '왔어요', '갔어요', '주문했어요'] }, speakRequired: ['어제', '호텔에', '도착했어요'],
    sceneCaption: { de: 'Die Rezeptionistin prüft den Eintrag und fragt: „언제 호텔에 오셨어요?“', en: 'The receptionist checks the entry and asks: “언제 호텔에 오셨어요?”' },
    trophyWord: { word: '어제', meaning: { de: 'gestern', en: 'yesterday' }, example: '어제 친구를 봤어요.', whyThisWord: { de: 'Dieses Wort verankert deine erste Vergangenheitsaussage sofort in einer klaren Zeit.', en: 'This word anchors your first past statement immediately in a clear time.' } },
    distractors: ['오늘 아침에 왔어요', '지금 도착해요'], placeholderCaption: { de: 'Eine ruhige Hotelrezeption am Morgen mit Gepäck neben einem Schlüsselanhänger.', en: 'A calm hotel reception in the morning with luggage beside a key tag.' }, songMood: 'a gentle late-arrival memory settling into morning', visualNotes: 'Hotel desk, suitcase, early morning light, and a receptionist checking an arrival record.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'beolsseo-jumunhaesseoyo', title: { de: 'Schon bestellt', en: 'Already ordered' },
    situation: { de: 'Im Restaurant möchte die Bedienung deine Bestellung aufnehmen. Du sagst, dass du schon bestellt hast, und bittest noch um Wasser.', en: 'At the restaurant, the server wants to take your order. Say that you already ordered and ask for water too.' },
    pedagogicalGoal: 'Sagen, dass eine Bestellung bereits erledigt ist, und eine kleine Ergänzung hinzufügen.',
    targetText: '벌써 메뉴를 주문했어요. 물도 주세요.', baseText: { de: 'Ich habe das Essen schon bestellt. Bitte auch Wasser.', en: 'I already ordered the food. Please give me water too.' },
    chunks: [{ targetText: '벌써 메뉴를', baseText: { de: 'das Essen schon', en: 'the food already' } }, { targetText: '주문했어요.', baseText: { de: 'habe ich bestellt.', en: 'I ordered.' } }, { targetText: '물도 주세요.', baseText: { de: 'Bitte auch Wasser.', en: 'Water too, please.' } }],
    terms: [{ targetText: '벌써', baseText: { de: 'schon', en: 'already' } }, { targetText: '메뉴를', baseText: { de: 'das Essen mit Objektpartikel', en: 'the food with object particle' } }, { targetText: '주문했어요', baseText: { de: 'ich habe bestellt', en: 'I ordered' } }, { targetText: '물도', baseText: { de: 'auch Wasser', en: 'water too' } }, { targetText: '주세요', baseText: { de: 'bitte geben Sie mir', en: 'please give me' } }],
    recall: { before: '벌써 메뉴를 ', answer: '주문했어요', after: '. 물도 주세요.', fallbackChoices: ['주문했어요', '계산했어요', '샀어요', '봤어요'] }, speakRequired: ['메뉴를', '주문했어요', '물도'],
    sceneCaption: { de: 'Die Bedienung kommt mit Notizblock an den Tisch und fragt: „주문하실까요?“', en: 'The server comes to the table with a notepad and asks: “주문하실까요?”' },
    trophyWord: { word: '주문했어요', meaning: { de: 'ich habe bestellt', en: 'I ordered' }, example: '커피를 주문했어요.', whyThisWord: { de: 'Die genaue Vergangenheitsform zeigt der Bedienung freundlich, dass der Hauptschritt schon erledigt ist.', en: 'This exact past form politely tells the server that the main step is already done.' } },
    distractors: ['메뉴판 주세요', '비빔밥 하나'], placeholderCaption: { de: 'Ein Notizblock, Wasserglas und eine kleine Speisekarte liegen auf einem Restauranttisch.', en: 'A notepad, water glass, and small menu rest on a restaurant table.' }, songMood: 'an easy restaurant follow-up after ordering', visualNotes: 'Restaurant table, server with notepad, simple water request after the order is already in.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'oneul-achime-gwail-sasseoyo', title: { de: 'Obst am Morgen gekauft', en: 'Bought fruit this morning' },
    situation: { de: 'Auf dem Markt fragt die Verkäuferin, ob du noch Obst suchst. Du sagst, dass du heute Morgen schon Obst gekauft hast.', en: 'At the market, the seller asks whether you are still looking for fruit. Say that you bought fruit this morning.' },
    pedagogicalGoal: 'Einen Einkauf mit einer heutigen Zeitangabe in die Vergangenheit setzen.',
    targetText: '오늘 아침에 시장에서 과일을 샀어요.', baseText: { de: 'Ich habe heute Morgen auf dem Markt Obst gekauft.', en: 'I bought fruit at the market this morning.' },
    chunks: [{ targetText: '오늘 아침에', baseText: { de: 'heute Morgen', en: 'this morning' } }, { targetText: '시장에서 과일을', baseText: { de: 'auf dem Markt Obst', en: 'fruit at the market' } }, { targetText: '샀어요.', baseText: { de: 'habe ich gekauft.', en: 'I bought.' } }],
    terms: [{ targetText: '오늘 아침에', baseText: { de: 'heute Morgen', en: 'this morning' } }, { targetText: '시장에서', baseText: { de: 'auf dem Markt', en: 'at the market' } }, { targetText: '과일을', baseText: { de: 'Obst mit Objektpartikel', en: 'fruit with object particle' } }, { targetText: '샀어요', baseText: { de: 'ich habe gekauft', en: 'I bought' } }, { targetText: '시장', baseText: { de: 'Markt', en: 'market' } }],
    recall: { before: '오늘 아침에 시장에서 과일을 ', answer: '샀어요', after: '.', fallbackChoices: ['샀어요', '봤어요', '갔어요', '먹었어요'] }, speakRequired: ['시장에서', '과일을', '샀어요'],
    sceneCaption: { de: 'Die Verkäuferin ordnet Pfirsiche und fragt: „오늘 아침에 시장에 가셨어요?“', en: 'The seller arranges peaches and asks: “오늘 아침에 시장에 가셨어요?”' },
    trophyWord: { word: '과일', meaning: { de: 'Obst', en: 'fruit' }, example: '과일을 많이 사요.', whyThisWord: { de: 'Dieses Wort benennt direkt den Marktartikel, über den du deinen Kauf von heute Morgen erzählst.', en: 'This word directly names the market item you are talking about buying this morning.' } },
    distractors: ['사과를 샀어요', '빵을 먹었어요'], placeholderCaption: { de: 'Pfirsiche, Äpfel und eine Stofftasche füllen einen sonnigen Morgenmarktstand.', en: 'Peaches, apples, and a cloth bag fill a sunny morning market stall.' }, songMood: 'a fresh morning market memory', visualNotes: 'Morning market, fruit crates, cloth shopping bag, warm light and a brief chat with the seller.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'sijangeseo-jangeul-bwasseoyo', title: { de: 'Den Einkauf erledigt', en: 'Did the shopping' },
    situation: { de: 'Ein Händler fragt, ob du noch etwas für deinen Einkauf brauchst. Du erklärst, dass du heute Morgen schon eingekauft hast.', en: 'A vendor asks whether you need anything else for your shopping. Explain that you did your shopping this morning.' },
    pedagogicalGoal: 'Über einen erledigten Einkauf mit einem natürlichen Vergangenheitsverb sprechen.',
    targetText: '오늘 아침에 시장에서 장을 봤어요.', baseText: { de: 'Ich habe heute Morgen auf dem Markt eingekauft.', en: 'I did my shopping at the market this morning.' },
    chunks: [{ targetText: '오늘 아침에', baseText: { de: 'heute Morgen', en: 'this morning' } }, { targetText: '시장에서 장을', baseText: { de: 'auf dem Markt den Einkauf', en: 'the shopping at the market' } }, { targetText: '봤어요.', baseText: { de: 'habe ich erledigt.', en: 'I did.' } }],
    terms: [{ targetText: '오늘 아침에', baseText: { de: 'heute Morgen', en: 'this morning' } }, { targetText: '시장에서', baseText: { de: 'auf dem Markt', en: 'at the market' } }, { targetText: '장을', baseText: { de: 'den Einkauf mit Objektpartikel', en: 'shopping with object particle' } }, { targetText: '봤어요', baseText: { de: 'ich habe erledigt', en: 'I did' } }, { targetText: '장', baseText: { de: 'Einkauf', en: 'shopping' } }],
    recall: { before: '오늘 아침에 시장에서 장을 ', answer: '봤어요', after: '.', fallbackChoices: ['봤어요', '샀어요', '갔어요', '먹었어요'] }, speakRequired: ['시장에서', '장을', '봤어요'],
    sceneCaption: { de: 'Der Händler reicht dir eine Tüte und fragt: „오늘 장 보셨어요?“', en: 'The vendor offers you a bag and asks: “오늘 장 보셨어요?”' },
    trophyWord: { word: '시장에서', meaning: { de: 'auf dem Markt', en: 'at the market' }, example: '시장에서 채소를 사요.', whyThisWord: { de: 'Dieser Ortsausdruck verankert deinen erledigten Einkauf in einer ganz konkreten Alltagsszene.', en: 'This location phrase anchors your completed shopping in a very concrete everyday scene.' } },
    distractors: ['과일을 샀어요', '빵을 봤어요'], placeholderCaption: { de: 'Ein offener Marktgang mit Taschen, Gemüse und einem Händler hinter einer kleinen Waage.', en: 'An open market aisle with bags, vegetables, and a vendor behind a small scale.' }, songMood: 'a satisfied morning errand already checked off', visualNotes: 'Market aisle, grocery bag, vegetable crates and a vendor wrapping up a small exchange.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'eje-jal-mot-jasseoyo', title: { de: 'Nicht gut geschlafen', en: 'Did not sleep well' },
    situation: { de: 'Ein Nachbar fragt am Morgen, ob du müde bist. Du sagst, dass du gestern nicht gut geschlafen hast, aber heute geht es dir gut.', en: 'A neighbor asks in the morning whether you are tired. Say that you did not sleep well yesterday but are fine today.' },
    pedagogicalGoal: 'Eine schlechte Nacht mit einer zugelassenen negativen Vergangenheitsform ausdrücken.',
    targetText: '어제 잘 못 잤어요. 오늘은 괜찮아요.', baseText: { de: 'Ich habe gestern nicht gut geschlafen. Heute geht es mir gut.', en: 'I did not sleep well yesterday. I am fine today.' },
    chunks: [{ targetText: '어제 잘 못 잤어요.', baseText: { de: 'Ich habe gestern nicht gut geschlafen.', en: 'I did not sleep well yesterday.' } }, { targetText: '오늘은', baseText: { de: 'was heute angeht', en: 'as for today' } }, { targetText: '괜찮아요.', baseText: { de: 'es geht mir gut.', en: 'I am fine.' } }],
    terms: [{ targetText: '어제', baseText: { de: 'gestern', en: 'yesterday' } }, { targetText: '못', baseText: { de: 'nicht können', en: 'not be able to' } }, { targetText: '잤어요', baseText: { de: 'ich habe geschlafen', en: 'I slept' } }, { targetText: '오늘은', baseText: { de: 'was heute angeht', en: 'as for today' } }, { targetText: '괜찮아요', baseText: { de: 'es geht mir gut', en: 'I am fine' } }],
    recall: { before: '어제 잘 못 ', answer: '잤어요', after: '. 오늘은 괜찮아요.', fallbackChoices: ['잤어요', '먹었어요', '봤어요', '샀어요'] }, speakRequired: ['어제', '잤어요', '오늘은'],
    sceneCaption: { de: 'Dein Nachbar sieht dich am Morgen und fragt: „어제 잘 잤어요?“', en: 'Your neighbor sees you in the morning and asks: “어제 잘 잤어요?”' },
    trophyWord: { word: '잤어요', meaning: { de: 'ich habe geschlafen', en: 'I slept' }, example: '어제 일찍 잤어요.', whyThisWord: { de: 'Diese Vergangenheitsform hilft dir, eine kleine schlechte Nacht ehrlich zu erwähnen, ohne die Unterhaltung schwer zu machen.', en: 'This past form helps you mention a small bad night honestly without making the conversation heavy.' } },
    distractors: ['커피를 마셔요', '집에 가요'], placeholderCaption: { de: 'Morgenlicht fällt in ein ruhiges Treppenhaus, während zwei Nachbarn kurz miteinander sprechen.', en: 'Morning light falls into a quiet stairwell while two neighbors have a brief chat.' }, songMood: 'a gentle morning after a restless night', visualNotes: 'Soft morning apartment hallway, neighbor checking in, tired but reassuring expression.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'bibimbapeun-beolsseo-meogeosseoyo', title: { de: 'Bibimbap schon probiert', en: 'Already tried bibimbap' },
    situation: { de: 'Im Restaurant fragt die Bedienung, ob du Bibimbap kennst. Du sagst, dass du es schon gegessen hast und es sehr lecker findest.', en: 'At a restaurant, the server asks whether you know bibimbap. Say that you have already eaten it and found it delicious.' },
    pedagogicalGoal: 'Eine bekannte Speise mit einem bereits abgeschlossenen Erlebnis verbinden.',
    targetText: '비빔밥은 벌써 먹었어요. 정말 맛있어요.', baseText: { de: 'Bibimbap habe ich schon gegessen. Es ist wirklich lecker.', en: 'I have already eaten bibimbap. It is really delicious.' },
    chunks: [{ targetText: '비빔밥은 벌써', baseText: { de: 'was Bibimbap angeht, schon', en: 'as for bibimbap, already' } }, { targetText: '먹었어요.', baseText: { de: 'habe ich gegessen.', en: 'I ate it.' } }, { targetText: '정말 맛있어요.', baseText: { de: 'Es ist wirklich lecker.', en: 'It is really delicious.' } }],
    terms: [{ targetText: '비빔밥은', baseText: { de: 'Bibimbap mit Themenpartikel', en: 'bibimbap with topic particle' } }, { targetText: '벌써', baseText: { de: 'schon', en: 'already' } }, { targetText: '먹었어요', baseText: { de: 'ich habe gegessen', en: 'I ate' } }, { targetText: '정말', baseText: { de: 'wirklich', en: 'really' } }, { targetText: '맛있어요', baseText: { de: 'es ist lecker', en: 'it is delicious' } }],
    recall: { before: '비빔밥은 벌써 ', answer: '먹었어요', after: '. 정말 맛있어요.', fallbackChoices: ['먹었어요', '봤어요', '샀어요', '갔어요'] }, speakRequired: ['비빔밥은', '벌써', '먹었어요'],
    sceneCaption: { de: 'Die Bedienung zeigt auf das Bild in der Karte und fragt: „비빔밥 드셔 보셨어요?“', en: 'The server points to the menu photo and asks: “비빔밥 드셔 보셨어요?”' },
    trophyWord: { word: '비빔밥', meaning: { de: 'Bibimbap', en: 'bibimbap' }, example: '비빔밥을 좋아해요.', whyThisWord: { de: 'Der Name des Gerichts macht deine Antwort persönlich und zeigt, dass du schon lokale Speisen ausprobierst.', en: 'The dish name makes your response personal and shows that you are already trying local food.' } },
    distractors: ['국을 주문해요', '김밥 하나 주세요'], placeholderCaption: { de: 'Eine Schüssel Bibimbap leuchtet auf einer Speisekarte neben kleinen Beilagen.', en: 'A bowl of bibimbap shines on a menu beside small side dishes.' }, songMood: 'a warm food memory shared over a menu', visualNotes: 'Restaurant menu close-up, colorful bibimbap bowl, friendly server and an easy food conversation.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'gyeongbokgung-ajik-mot-bwasseoyo', title: { de: 'Den Palast noch nicht gesehen', en: 'Have not seen the palace yet' },
    situation: { de: 'Ein Stadtführer fragt, ob du schon im Gyeongbokgung warst. Du sagst, dass du ihn noch nicht gesehen hast und morgen hingehst.', en: 'A city guide asks whether you have been to Gyeongbokgung. Say that you have not seen it yet and will go tomorrow.' },
    pedagogicalGoal: 'Mit noch nicht über ein fehlendes Erlebnis sprechen und eine einfache nächste Absicht nennen.',
    targetText: '경복궁은 아직 못 봤어요. 내일 가요.', baseText: { de: 'Den Gyeongbokgung habe ich noch nicht gesehen. Morgen gehe ich hin.', en: 'I have not seen Gyeongbokgung yet. I am going tomorrow.' },
    chunks: [{ targetText: '경복궁은 아직', baseText: { de: 'was den Gyeongbokgung angeht, noch', en: 'as for Gyeongbokgung, yet' } }, { targetText: '못 봤어요.', baseText: { de: 'habe ich nicht gesehen.', en: 'I have not seen it.' } }, { targetText: '내일 가요.', baseText: { de: 'Morgen gehe ich hin.', en: 'I am going tomorrow.' } }],
    terms: [{ targetText: '경복궁은', baseText: { de: 'Gyeongbokgung mit Themenpartikel', en: 'Gyeongbokgung with topic particle' } }, { targetText: '아직', baseText: { de: 'noch', en: 'yet' } }, { targetText: '못 봤어요', baseText: { de: 'ich habe nicht gesehen', en: 'I have not seen' } }, { targetText: '내일', baseText: { de: 'morgen', en: 'tomorrow' } }, { targetText: '가요', baseText: { de: 'ich gehe', en: 'I go' } }],
    recall: { before: '경복궁은 아직 못 ', answer: '봤어요', after: '. 내일 가요.', fallbackChoices: ['봤어요', '갔어요', '샀어요', '먹었어요'] }, speakRequired: ['경복궁은', '아직', '봤어요'],
    sceneCaption: { de: 'Ein Stadtführer zeigt auf einen Palastplan und fragt: „경복궁은 봤어요?“', en: 'A city guide points to a palace map and asks: “경복궁은 봤어요?”' },
    trophyWord: { word: '경복궁', meaning: { de: 'Gyeongbokgung-Palast', en: 'Gyeongbokgung Palace' }, example: '경복궁에 내일 가요.', whyThisWord: { de: 'Dieser Ortsname macht deine Antwort zu einem echten Seoul-Plan statt zu einer abstrakten Vergangenheitsübung.', en: 'This place name makes your answer a real Seoul plan instead of an abstract past-tense exercise.' } },
    distractors: ['창덕궁에 가요', '박물관을 봤어요'], placeholderCaption: { de: 'Ein übersichtlicher Palastplan liegt neben dem Eingang zu einem historischen Seoul-Besuch.', en: 'A clear palace map sits beside the entrance to a historic Seoul visit.' }, songMood: 'a quiet tomorrow plan among palace gates', visualNotes: 'Palace map, traditional gate in the distance, guide pointing and a visitor making tomorrow’s plan.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'eje-bangmulgwane-gasseoyo', title: { de: 'Gestern im Museum', en: 'At the museum yesterday' },
    situation: { de: 'Ein Freund fragt, was du gestern gemacht hast. Du erzählst von deinem Museumsbesuch und davon, dass es dort viele Fotos gibt.', en: 'A friend asks what you did yesterday. Tell them about your museum visit and say that there are many photos there.' },
    pedagogicalGoal: 'Einen einzelnen gestrigen Besuch mit einer passenden Ortsangabe erzählen.',
    targetText: '어제 박물관에 갔어요. 사진이 많아요.', baseText: { de: 'Ich war gestern im Museum. Es gibt viele Fotos.', en: 'I went to the museum yesterday. There are many photos.' },
    chunks: [{ targetText: '어제 박물관에', baseText: { de: 'gestern ins Museum', en: 'to the museum yesterday' } }, { targetText: '갔어요.', baseText: { de: 'bin ich gegangen.', en: 'I went.' } }, { targetText: '사진이 많아요.', baseText: { de: 'Es gibt viele Fotos.', en: 'There are many photos.' } }],
    terms: [{ targetText: '어제', baseText: { de: 'gestern', en: 'yesterday' } }, { targetText: '박물관에', baseText: { de: 'ins Museum', en: 'to the museum' } }, { targetText: '갔어요', baseText: { de: 'ich bin gegangen', en: 'I went' } }, { targetText: '사진이', baseText: { de: 'Fotos mit Subjektpartikel', en: 'photos with subject particle' } }, { targetText: '많아요', baseText: { de: 'es gibt viele', en: 'there are many' } }],
    recall: { before: '어제 박물관에 ', answer: '갔어요', after: '. 사진이 많아요.', fallbackChoices: ['갔어요', '봤어요', '샀어요', '먹었어요'] }, speakRequired: ['박물관에', '갔어요', '사진이'],
    sceneCaption: { de: 'Dein Freund sieht einen Flyer in deiner Hand und fragt: „어제 박물관에 갔어요?“', en: 'Your friend sees a flyer in your hand and asks: “어제 박물관에 갔어요?”' },
    trophyWord: { word: '박물관', meaning: { de: 'Museum', en: 'museum' }, example: '박물관에 사진이 많아요.', whyThisWord: { de: 'Dieses Ortswort gibt deiner kleinen Erzählung einen klaren Zielpunkt und lädt zu einem einfachen Anschlussgespräch ein.', en: 'This place word gives your short story a clear destination and invites an easy follow-up conversation.' } },
    distractors: ['공원에 갔어요', '시장에 갔어요'], placeholderCaption: { de: 'Ein Museumsflyer, gerahmte Fotos und ein ruhiger Ausstellungsraum stehen für den gestrigen Besuch.', en: 'A museum flyer, framed photos, and a quiet gallery evoke yesterday’s visit.' }, songMood: 'a thoughtful museum memory from yesterday', visualNotes: 'Small Seoul museum gallery, visitor flyer, framed photos and a friend listening nearby.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'ibeon-jue-mani-haesseoyo', title: { de: 'Diese Woche viel gemacht', en: 'Did a lot this week' },
    situation: { de: 'Ein Händler fragt, wie deine Woche in Seoul läuft. Du fasst zusammen, dass du diese Woche wirklich viel gemacht hast.', en: 'A vendor asks how your week in Seoul is going. Sum up by saying that you did a lot this week.' },
    pedagogicalGoal: 'Mit einer Zeitspanne und viel eine erste Wochenbilanz in der Vergangenheit ziehen.',
    targetText: '이번 주에 정말 많이 했어요.', baseText: { de: 'Ich habe diese Woche wirklich viel gemacht.', en: 'I did a lot this week.' },
    chunks: [{ targetText: '이번 주에', baseText: { de: 'diese Woche', en: 'this week' } }, { targetText: '정말 많이', baseText: { de: 'wirklich viel', en: 'really a lot' } }, { targetText: '했어요.', baseText: { de: 'habe ich gemacht.', en: 'I did.' } }],
    terms: [{ targetText: '이번 주에', baseText: { de: 'diese Woche', en: 'this week' } }, { targetText: '정말', baseText: { de: 'wirklich', en: 'really' } }, { targetText: '많이', baseText: { de: 'viel', en: 'a lot' } }, { targetText: '했어요', baseText: { de: 'ich habe gemacht', en: 'I did' } }, { targetText: '서울', baseText: { de: 'Seoul', en: 'Seoul' } }],
    recall: { before: '이번 주에 정말 많이 ', answer: '했어요', after: '.', fallbackChoices: ['했어요', '갔어요', '샀어요', '봤어요'] }, speakRequired: ['이번', '많이', '했어요'],
    sceneCaption: { de: 'Ein Händler reicht dir eine Tüte und fragt: „이번 주에 서울에서 뭐 했어요?“', en: 'A vendor hands you a bag and asks: “이번 주에 서울에서 뭐 했어요?”' },
    trophyWord: { word: '많이', meaning: { de: 'viel', en: 'a lot' }, example: '오늘 시장에서 많이 샀어요.', whyThisWord: { de: 'Dieses Wort fasst viele kleine Erlebnisse der Woche zusammen, ohne jedes einzeln aufzählen zu müssen.', en: 'This word gathers many small experiences from the week without needing to list every one.' } },
    distractors: ['서울에 갔어요', '시장에서 샀어요'], placeholderCaption: { de: 'Eine volle Stofftasche und ein freundlicher Händler markieren den Abschluss einer ereignisreichen Seoul-Woche.', en: 'A full cloth bag and friendly vendor mark the close of an eventful Seoul week.' }, songMood: 'a satisfied weekly recap full of small city wins', visualNotes: 'Market vendor, full cloth bag, late-afternoon Seoul street and a proud reflective smile.',
  }),
]

export const KOREAN_A2_PRACTICAL_3_LESSONS: GuidedLessonDefinition[] = makeKoreanA2PracticalLessons(
  GUIDED_TODAY_PATH_KOREAN_A2_THREE_METADATA, koreanA2Practical3Inputs,
  { de: 'Du hast Koreanisch A2 Praxis 3 abgeschlossen und kannst über erste vergangene Erlebnisse sprechen.', en: 'You have completed Korean A2 Practical 3 and can talk about first past experiences.' },
)

export const GUIDED_TODAY_PATH_KOREAN_A2_FOUR_METADATA: GuidedPathMetadata = {
  id: 'korean-a2-practical-4', title: 'Korean A2 Practical 4', shortTitle: 'A2 Practical 4',
  subtitle: { de: 'Pläne verabreden, Zeiten klären und freundlich umplanen', en: 'Making plans, agreeing times, and changing them politely' },
  level: 'A2', baseLanguage: 'German', targetLanguage: 'Korean', estimatedMinutes: 5,
}

const koreanA2Practical4Inputs: KoreanA2LessonInput[] = [
  makeKoreanA2CompactLesson({
    slug: 'ohu-e-mannalkkayo', title: { de: 'Kaffee am Nachmittag', en: 'Coffee in the afternoon' },
    situation: { de: 'Eine Nachbarin, mit der du inzwischen befreundet bist, schlägt Kaffee vor. Du nimmst gern an und schlägst den Nachmittag vor.', en: 'A neighbor who has become a friend suggests coffee. Happily accept and suggest the afternoon.' },
    pedagogicalGoal: 'Eine freundliche Einladung annehmen und mit -(으)ㄹ까요? eine konkrete Zeit vorschlagen.',
    targetText: '좋아요. 내일 오후에 커피 마실까요?', baseText: { de: 'Gern. Trinken wir morgen Nachmittag Kaffee?', en: 'Sounds good. Shall we have coffee tomorrow afternoon?' },
    chunks: [{ targetText: '좋아요.', baseText: { de: 'Gern.', en: 'Sounds good.' } }, { targetText: '내일 오후에', baseText: { de: 'morgen Nachmittag', en: 'tomorrow afternoon' } }, { targetText: '커피 마실까요?', baseText: { de: 'trinken wir Kaffee?', en: 'shall we have coffee?' } }],
    terms: [{ targetText: '좋아요', baseText: { de: 'gern; das klingt gut', en: 'sounds good' } }, { targetText: '내일', baseText: { de: 'morgen', en: 'tomorrow' } }, { targetText: '오후에', baseText: { de: 'am Nachmittag', en: 'in the afternoon' } }, { targetText: '커피', baseText: { de: 'Kaffee', en: 'coffee' } }, { targetText: '마실까요', baseText: { de: 'sollen wir trinken?', en: 'shall we drink?' } }],
    recall: { before: '좋아요. 내일 오후에 커피 ', answer: '마실까요', after: '?', fallbackChoices: ['마실까요', '읽을까요', '쓸까요', '닫을까요'] }, speakRequired: ['오후에', '커피', '마실까요'],
    sceneCaption: { de: 'Deine Nachbarin hält zwei Kaffeebecher hoch und fragt: „내일 커피 마실까요?“', en: 'Your neighbor holds up two coffee cups and asks: “내일 커피 마실까요?”' },
    trophyWord: { word: '오후에', meaning: { de: 'am Nachmittag', en: 'in the afternoon' }, example: '오후에 친구를 만나요.', whyThisWord: { de: 'Mit diesem Zeitwort machst du aus einer netten Einladung sofort einen klaren, brauchbaren Plan.', en: 'This time word turns a friendly invitation straight into a clear, useful plan.' } },
    distractors: ['저녁에 갈까요', '아침에 봐요'], placeholderCaption: { de: 'Zwei Kaffeebecher stehen auf einer Bank in einem ruhigen Wohnviertel.', en: 'Two coffee cups sit on a bench in a quiet residential neighborhood.' }, songMood: 'an easy coffee plan with a new friend', visualNotes: 'Sunny neighborhood bench, two takeaway coffee cups, relaxed friends making a plan.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'misulgwan-gal-geoyeyo', title: { de: 'Ein Museumsplan', en: 'A museum plan' },
    situation: { de: 'Dein Freund fragt nach deinem Plan für morgen. Du erzählst von deinem geplanten Besuch im Kunstmuseum.', en: 'Your friend asks about your plan for tomorrow. Tell them about your planned visit to the art museum.' },
    pedagogicalGoal: 'Einen eigenen Plan mit -(으)ㄹ 거예요 klar ankündigen.',
    targetText: '저는 내일 미술관에 갈 거예요.', baseText: { de: 'Ich werde morgen ins Kunstmuseum gehen.', en: 'I will go to the art museum tomorrow.' },
    chunks: [{ targetText: '저는 내일', baseText: { de: 'ich morgen', en: 'I, tomorrow' } }, { targetText: '미술관에', baseText: { de: 'ins Kunstmuseum', en: 'to the art museum' } }, { targetText: '갈 거예요.', baseText: { de: 'werde ich gehen.', en: 'I will go.' } }],
    terms: [{ targetText: '저는', baseText: { de: 'was mich angeht', en: 'as for me' } }, { targetText: '내일', baseText: { de: 'morgen', en: 'tomorrow' } }, { targetText: '미술관에', baseText: { de: 'zum Kunstmuseum', en: 'to the art museum' } }, { targetText: '갈', baseText: { de: 'gehen werde', en: 'will go' } }, { targetText: '거예요', baseText: { de: 'werde ich', en: 'I will' } }],
    recall: { before: '저는 내일 미술관에 ', answer: '갈', after: ' 거예요.', fallbackChoices: ['갈', '먹을', '마실', '쓸'] }, speakRequired: ['내일', '미술관에', '갈'],
    sceneCaption: { de: 'Dein Freund sieht auf den Kalender und fragt: „내일 뭐 할 거예요?“', en: 'Your friend looks at the calendar and asks: “내일 뭐 할 거예요?”' },
    trophyWord: { word: '미술관', meaning: { de: 'Kunstmuseum', en: 'art museum' }, example: '미술관에 그림이 많아요.', whyThisWord: { de: 'Das Wort gibt deinem Zukunftssatz ein konkretes Ziel und macht deinen freien Tag sofort anschaulich.', en: 'This word gives your future sentence a concrete destination and makes your day off immediately vivid.' } },
    distractors: ['공원에 있어요', '카페에서 만나요'], placeholderCaption: { de: 'Ein helles Kunstmuseum mit großen Plakaten liegt an einer belebten Straße in Seoul.', en: 'A bright art museum with large posters stands on a busy Seoul street.' }, songMood: 'a curious cultural plan for tomorrow', visualNotes: 'Contemporary Seoul art museum exterior, posters, clear sky, and a visitor planning a calm day.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'geumyoil-yeonghwa-bolkkayo', title: { de: 'Kino am Freitag', en: 'A Friday movie' },
    situation: { de: 'Ihr sucht zusammen einen Plan für Freitagabend. Du schlägst einen gemeinsamen Kinobesuch vor.', en: 'You and your friend are looking for a Friday-evening plan. Suggest going to a movie together.' },
    pedagogicalGoal: 'Mit 같이 und -(으)ㄹ까요? einen gemeinsamen Freizeitplan vorschlagen.',
    targetText: '금요일에 같이 영화 한 편 볼까요?', baseText: { de: 'Sollen wir am Freitag zusammen einen Film sehen?', en: 'Shall we watch a movie together on Friday?' },
    chunks: [{ targetText: '금요일에 같이', baseText: { de: 'am Freitag zusammen', en: 'together on Friday' } }, { targetText: '영화 한 편', baseText: { de: 'einen Film', en: 'one movie' } }, { targetText: '볼까요?', baseText: { de: 'sollen wir sehen?', en: 'shall we watch?' } }],
    terms: [{ targetText: '금요일에', baseText: { de: 'am Freitag', en: 'on Friday' } }, { targetText: '같이', baseText: { de: 'zusammen', en: 'together' } }, { targetText: '영화 한 편', baseText: { de: 'einen Film', en: 'one movie' } }, { targetText: '볼까요', baseText: { de: 'sollen wir sehen?', en: 'shall we watch?' } }, { targetText: '저녁', baseText: { de: 'Abend', en: 'evening' } }],
    recall: { before: '금요일에 같이 영화 한 편 ', answer: '볼까요', after: '?', fallbackChoices: ['볼까요', '먹을까요', '마실까요', '닫을까요'] }, speakRequired: ['금요일에', '같이', '볼까요'],
    sceneCaption: { de: 'Dein Freund zeigt auf ein Kinoplakat und fragt: „금요일 저녁에 시간 있어요?“', en: 'Your friend points to a cinema poster and asks: “금요일 저녁에 시간 있어요?”' },
    trophyWord: { word: '같이', meaning: { de: 'zusammen', en: 'together' }, example: '같이 저녁을 먹어요.', whyThisWord: { de: 'Dieses kleine Wort macht deinen Vorschlag zu einem gemeinsamen Plan statt zu einer bloßen Information.', en: 'This small word makes your suggestion a shared plan instead of mere information.' } },
    distractors: ['영화 한 편하고', '음악을 들으러'], placeholderCaption: { de: 'Ein Kinoplakat leuchtet neben zwei Tickets auf einem kleinen Tisch.', en: 'A cinema poster glows beside two tickets on a small table.' }, songMood: 'a light Friday movie invitation', visualNotes: 'Evening cinema posters, two tickets, warm street lights, and friends choosing a film.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'yeodeol-si-yeok-ape', title: { de: 'Treffen um acht', en: 'Meeting at eight' },
    situation: { de: 'Nachdem ihr euch auf den Film geeinigt habt, fragt dein Freund nach dem Treffpunkt. Du bestätigst Zeit und Ort.', en: 'After agreeing on the movie, your friend asks where to meet. Confirm the time and place.' },
    pedagogicalGoal: 'Eine Verabredung mit Uhrzeit und Treffpunkt knapp und klar bestätigen.',
    targetText: '여덟 시에 역 앞에서 만나요.', baseText: { de: 'Wir treffen uns um acht vor dem Bahnhof.', en: 'We will meet at eight in front of the station.' },
    chunks: [{ targetText: '여덟 시에', baseText: { de: 'um acht Uhr', en: 'at eight o’clock' } }, { targetText: '역 앞에서', baseText: { de: 'vor dem Bahnhof', en: 'in front of the station' } }, { targetText: '만나요.', baseText: { de: 'wir treffen uns.', en: 'we meet.' } }],
    terms: [{ targetText: '여덟', baseText: { de: 'acht', en: 'eight' } }, { targetText: '시에', baseText: { de: 'um ... Uhr', en: 'at ... o’clock' } }, { targetText: '역', baseText: { de: 'Bahnhof', en: 'station' } }, { targetText: '앞에서', baseText: { de: 'vor; vor dem', en: 'in front of; at the front of' } }, { targetText: '만나요', baseText: { de: 'wir treffen uns', en: 'we meet' } }],
    recall: { before: '여덟 시에 ', answer: '역', after: ' 앞에서 만나요.', fallbackChoices: ['역', '커피', '가방', '책'] }, speakRequired: ['여덟', '앞에서', '만나요'],
    sceneCaption: { de: 'Dein Freund öffnet die Fahrplan-App und fragt: „몇 시에 어디에서 만날까요?“', en: 'Your friend opens a transit app and asks: “몇 시에 어디에서 만날까요?”' },
    trophyWord: { word: '여덟', meaning: { de: 'acht', en: 'eight' }, example: '여덟 시에 일해요.', whyThisWord: { de: 'Mit dieser Zahl legst du den genauen Zeitpunkt einer Verabredung natürlich auf Koreanisch fest.', en: 'This number lets you set the exact time of a meeting naturally in Korean.' } },
    distractors: ['버스 안에서', '공원 옆에서'], placeholderCaption: { de: 'Eine Bahnhofsuhr zeigt kurz vor acht, vor dem Eingang warten zwei Personen.', en: 'A station clock shows almost eight while two people wait outside the entrance.' }, songMood: 'a clear evening meetup in the city', visualNotes: 'Seoul station entrance, large clock, friends meeting under evening lights.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'toyoillo-omgil-su-issoyo', title: { de: 'Auf Samstag verschieben', en: 'Move it to Saturday' },
    situation: { de: 'Der Termin am Freitag passt deinem Freund doch nicht. Du fragst höflich, ob ihr eure Verabredung auf Samstag verschieben könnt.', en: 'Friday no longer works for your friend. Politely ask whether you can move your meeting to Saturday.' },
    pedagogicalGoal: 'Mit -(으)ㄹ 수 있어요? eine höfliche Möglichkeit zum Verschieben anfragen.',
    targetText: '우리 약속을 토요일로 옮길 수 있어요?', baseText: { de: 'Können wir unsere Verabredung auf Samstag verschieben?', en: 'Can we move our appointment to Saturday?' },
    chunks: [{ targetText: '우리 약속을', baseText: { de: 'unsere Verabredung', en: 'our appointment' } }, { targetText: '토요일로', baseText: { de: 'auf Samstag', en: 'to Saturday' } }, { targetText: '옮길 수 있어요?', baseText: { de: 'können wir verschieben?', en: 'can we move it?' } }],
    terms: [{ targetText: '우리', baseText: { de: 'unser', en: 'our' } }, { targetText: '약속을', baseText: { de: 'Verabredung mit Objektpartikel', en: 'appointment with object particle' } }, { targetText: '토요일로', baseText: { de: 'auf Samstag', en: 'to Saturday' } }, { targetText: '옮길', baseText: { de: 'verschieben können', en: 'be able to move' } }, { targetText: '수 있어요', baseText: { de: 'kann man; ist es möglich', en: 'can; is it possible' } }],
    recall: { before: '우리 약속을 토요일로 ', answer: '옮길', after: ' 수 있어요?', fallbackChoices: ['옮길', '먹을', '마실', '읽을'] }, speakRequired: ['약속을', '토요일로', '옮길'],
    sceneCaption: { de: 'Dein Freund schaut entschuldigend auf sein Handy und fragt: „금요일은 좀 어려워요. 다른 날 괜찮아요?“', en: 'Your friend looks apologetically at their phone and asks: “금요일은 좀 어려워요. 다른 날 괜찮아요?”' },
    trophyWord: { word: '토요일', meaning: { de: 'Samstag', en: 'Saturday' }, example: '토요일에 공원에 가요.', whyThisWord: { de: 'Der Wochentag gibt deiner Umplanung ein klares neues Ziel, ohne dass der freundliche Ton verloren geht.', en: 'This weekday gives your rescheduling a clear new destination without losing the friendly tone.' } },
    distractors: ['금요일 약속은', '토요일로 옮기고'], placeholderCaption: { de: 'Ein Kalender auf einem Handy zeigt Freitag und Samstag neben zwei Kaffeetassen.', en: 'A phone calendar shows Friday and Saturday beside two coffee cups.' }, songMood: 'a flexible plan changing without stress', visualNotes: 'Close-up of phone calendar, two dates highlighted, calm friendly message exchange.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'oneul-mot-gayo', title: { de: 'Heute kann ich nicht', en: 'I cannot go today' },
    situation: { de: 'Dein Freund fragt, ob du heute Abend kommen kannst. Du sagst freundlich ab, weil du Arbeit hast.', en: 'Your friend asks whether you can come this evening. Decline politely because you have work.' },
    pedagogicalGoal: 'Eine Einladung mit 못 가요 und einem einfachen Grund höflich absagen.',
    targetText: '일이 있어서 오늘은 못 가요. 죄송해요.', baseText: { de: 'Ich habe Arbeit, deshalb kann ich heute nicht gehen. Es tut mir leid.', en: 'I have work, so I cannot go today. I am sorry.' },
    chunks: [{ targetText: '일이 있어서', baseText: { de: 'weil ich Arbeit habe', en: 'because I have work' } }, { targetText: '오늘은 못 가요.', baseText: { de: 'heute kann ich nicht gehen.', en: 'I cannot go today.' } }, { targetText: '죄송해요.', baseText: { de: 'Es tut mir leid.', en: 'I am sorry.' } }],
    terms: [{ targetText: '일이', baseText: { de: 'Arbeit mit Subjektpartikel', en: 'work with subject particle' } }, { targetText: '있어서', baseText: { de: 'weil es gibt; weil ich habe', en: 'because there is; because I have' } }, { targetText: '오늘은', baseText: { de: 'was heute angeht', en: 'as for today' } }, { targetText: '못 가요', baseText: { de: 'ich kann nicht gehen', en: 'I cannot go' } }, { targetText: '죄송해요', baseText: { de: 'es tut mir leid', en: 'I am sorry' } }],
    recall: { before: '', answer: '일이', after: ' 있어서 오늘은 못 가요. 죄송해요.', fallbackChoices: ['일이', '책이', '가방이', '우산이'] }, speakRequired: ['일이', '못', '죄송해요'],
    sceneCaption: { de: 'Dein Freund deckt den Tisch und fragt: „오늘 저녁에 올 수 있어요?“', en: 'Your friend sets the table and asks: “오늘 저녁에 올 수 있어요?”' },
    trophyWord: { word: '일', meaning: { de: 'Arbeit; Sache', en: 'work; matter' }, example: '오늘 일이 많아요.', whyThisWord: { de: 'Dieses Alltagswort gibt dir einen einfachen, glaubwürdigen Grund für eine höfliche Absage.', en: 'This everyday word gives you a simple, believable reason for a polite decline.' } },
    distractors: ['오늘은 와요', '저녁에 만나요'], placeholderCaption: { de: 'Ein gedeckter Tisch wartet zu Hause, während auf einem Handy eine freundliche Entschuldigung steht.', en: 'A set table waits at home while a friendly apology appears on a phone.' }, songMood: 'a gentle apology and a plan for another day', visualNotes: 'Warm dinner table, phone message, soft evening light, no dramatic disappointment.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'jega-jeonyeok-salgeyo', title: { de: 'Das Abendessen geht auf mich', en: 'Dinner is on me' },
    situation: { de: 'Dein Freund schlägt vor, zusammen Abend zu essen. Du lädst ein und bietest an zu bezahlen.', en: 'Your friend suggests having dinner together. Invite them and offer to pay.' },
    pedagogicalGoal: 'Mit 제가 살게요 eine freundliche Entscheidung und Einladung ausdrücken.',
    targetText: '좋아요. 함께 먹어요. 제가 저녁을 살게요.', baseText: { de: 'Gern. Essen wir zusammen. Ich übernehme das Abendessen.', en: 'Sounds good. Let us eat together. I will pay for dinner.' },
    chunks: [{ targetText: '좋아요.', baseText: { de: 'Gern.', en: 'Sounds good.' } }, { targetText: '함께 먹어요.', baseText: { de: 'Essen wir zusammen.', en: 'Let us eat together.' } }, { targetText: '제가 저녁을', baseText: { de: 'ich das Abendessen', en: 'I, the dinner' } }, { targetText: '살게요.', baseText: { de: 'werde ich bezahlen.', en: 'will pay for it.' } }],
    terms: [{ targetText: '제가', baseText: { de: 'ich mit Subjektpartikel', en: 'I with subject particle' } }, { targetText: '저녁을', baseText: { de: 'Abendessen mit Objektpartikel', en: 'dinner with object particle' } }, { targetText: '살게요', baseText: { de: 'ich bezahle', en: 'I will pay' } }, { targetText: '함께', baseText: { de: 'zusammen', en: 'together' } }, { targetText: '먹어요', baseText: { de: 'wir essen', en: 'we eat' } }],
    recall: { before: '좋아요. 함께 먹어요. 제가 저녁을 ', answer: '살게요', after: '.', fallbackChoices: ['살게요', '쓸게요', '걸을게요', '읽을게요'] }, speakRequired: ['저녁을', '살게요', '함께'],
    sceneCaption: { de: 'Dein Freund sieht ein kleines Restaurant und fragt: „오늘 저녁 같이 먹을까요?“', en: 'Your friend spots a small restaurant and asks: “오늘 저녁 같이 먹을까요?”' },
    trophyWord: { word: '함께', meaning: { de: 'zusammen', en: 'together' }, example: '함께 공원에 가요.', whyThisWord: { de: 'Dieses Wort macht aus deinem Bezahlangebot zugleich eine herzliche Einladung, die ihr miteinander teilt.', en: 'This word makes your offer to pay into a warm invitation that you share together.' } },
    distractors: ['제가 커피를 마셔요', '혼자 저녁을 먹어요'], placeholderCaption: { de: 'Zwei freie Plätze an einem kleinen Restauranttisch warten auf Freunde.', en: 'Two empty seats at a small restaurant table wait for friends.' }, songMood: 'a generous dinner invitation between friends', visualNotes: 'Intimate Korean restaurant, two places set, friendly host gesture and warm evening colors.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'jogeum-neujeul-geot-gatayo', title: { de: 'Ich komme etwas später', en: 'I will be a little late' },
    situation: { de: 'Dein Freund wartet am Treffpunkt und schreibt dir. Du kündigst vorsichtig an, dass du etwas später sein wirst.', en: 'Your friend is waiting at the meeting point and messages you. Gently say that you will be a little late.' },
    pedagogicalGoal: 'Mit 것 같아요 eine Verspätung vorsichtig und natürlich ankündigen.',
    targetText: '조금 늦을 것 같아요. 먼저 들어가세요.', baseText: { de: 'Ich werde wohl etwas zu spät sein. Geh schon mal rein.', en: 'I think I will be a little late. Please go in ahead of me.' },
    chunks: [{ targetText: '조금 늦을 것 같아요.', baseText: { de: 'Ich werde wohl etwas zu spät sein.', en: 'I think I will be a little late.' } }, { targetText: '먼저', baseText: { de: 'schon mal zuerst', en: 'ahead first' } }, { targetText: '들어가세요.', baseText: { de: 'geh bitte rein.', en: 'please go in.' } }],
    terms: [{ targetText: '조금', baseText: { de: 'ein wenig', en: 'a little' } }, { targetText: '늦을', baseText: { de: 'spät sein werde', en: 'will be late' } }, { targetText: '것 같아요', baseText: { de: 'ich glaube wohl', en: 'I think; it seems' } }, { targetText: '먼저', baseText: { de: 'zuerst; schon mal', en: 'first; ahead' } }, { targetText: '들어가세요', baseText: { de: 'geh bitte hinein', en: 'please go inside' } }],
    recall: { before: '조금 ', answer: '늦을', after: ' 것 같아요. 먼저 들어가세요.', fallbackChoices: ['늦을', '먹을', '마실', '읽을'] }, speakRequired: ['조금', '늦을', '들어가세요'],
    sceneCaption: { de: 'Dein Freund wartet vor dem Kino und schreibt: „지금 어디예요? 곧 와요?“', en: 'Your friend waits outside the cinema and writes: “지금 어디예요? 곧 와요?”' },
    trophyWord: { word: '늦을', meaning: { de: 'spät sein werde', en: 'will be late' }, example: '버스가 늦을 것 같아요.', whyThisWord: { de: 'Dieses Wort benennt die Verspätung direkt, während 것 같아요 die Nachricht angenehm vorsichtig hält.', en: 'This word names the delay directly while 것 같아요 keeps the message pleasantly gentle.' } },
    distractors: ['조금 빨라요', '먼저 만나요'], placeholderCaption: { de: 'Eine Nachricht über eine kleine Verspätung erscheint neben einem Kinoplakat im Abendlicht.', en: 'A message about a small delay appears beside a cinema poster in the evening light.' }, songMood: 'a soft apologetic message on the way', visualNotes: 'Phone notification, cinema entrance, evening street, friend waiting calmly rather than frustrated.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'geureom-toyoil-du-si', title: { de: 'Samstag um zwei', en: 'Saturday at two' },
    situation: { de: 'Ihr habt euren Plan verschoben. Du wiederholst den neuen Termin, damit ihr beide sicher seid.', en: 'You have moved your plan. Repeat the new time so that you are both sure.' },
    pedagogicalGoal: 'Einen geänderten Plan mit 그럼 als kurze Bestätigung zurückspiegeln.',
    targetText: '그럼 토요일 두 시 맞아요?', baseText: { de: 'Dann ist Samstag um zwei richtig?', en: 'Then Saturday at two is correct?' },
    chunks: [{ targetText: '그럼', baseText: { de: 'dann', en: 'then' } }, { targetText: '토요일 두 시', baseText: { de: 'Samstag um zwei', en: 'Saturday at two' } }, { targetText: '맞아요?', baseText: { de: 'stimmt das?', en: 'is that right?' } }],
    terms: [{ targetText: '그럼', baseText: { de: 'dann; in dem Fall', en: 'then; in that case' } }, { targetText: '토요일', baseText: { de: 'Samstag', en: 'Saturday' } }, { targetText: '두 시', baseText: { de: 'zwei Uhr', en: 'two o’clock' } }, { targetText: '맞아요', baseText: { de: 'es stimmt; es ist richtig', en: 'it is right; it matches' } }, { targetText: '약속', baseText: { de: 'Verabredung', en: 'appointment' } }],
    recall: { before: '그럼 토요일 두 시 ', answer: '맞아요', after: '?', fallbackChoices: ['맞아요', '비싸요', '멀어요', '커요'] }, speakRequired: ['그럼', '토요일', '맞아요'],
    sceneCaption: { de: 'Dein Freund prüft die Nachricht mit dir und fragt: „토요일 두 시로 할까요?“', en: 'Your friend checks the message with you and asks: “토요일 두 시로 할까요?”' },
    trophyWord: { word: '그럼', meaning: { de: 'dann; in dem Fall', en: 'then; in that case' }, example: '그럼 내일 만나요.', whyThisWord: { de: 'Mit diesem kleinen Anschlusswort fasst du eine Änderung freundlich zusammen und holst die letzte Bestätigung ein.', en: 'With this small connecting word, you summarize a change warmly and get the final confirmation.' } },
    distractors: ['토요일 두 시보다', '일요일 두 시하고'], placeholderCaption: { de: 'Ein Chat zeigt die bestätigte Verabredung für Samstag um zwei Uhr.', en: 'A chat shows the confirmed meeting for Saturday at two o’clock.' }, songMood: 'a clear final confirmation for a changed plan', visualNotes: 'Close-up chat screen with Saturday and two o’clock highlighted, calm confident planning.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'jumare-hangang-gal-geoyeyo', title: { de: 'Wochenende am Fluss', en: 'Weekend by the river' },
    situation: { de: 'Dein Freund fragt nach deinem Wochenendplan. Du erzählst von einem Ausflug in den Hangang-Park.', en: 'Your friend asks about your weekend plans. Tell them about a trip to Hangang Park.' },
    pedagogicalGoal: 'Einen Wochenendplan mit einem Ziel und -(으)ㄹ 거예요 formulieren.',
    targetText: '주말에 한강 공원에 갈 거예요.', baseText: { de: 'Am Wochenende werde ich in den Hangang-Park gehen.', en: 'At the weekend I will go to Hangang Park.' },
    chunks: [{ targetText: '주말에', baseText: { de: 'am Wochenende', en: 'at the weekend' } }, { targetText: '한강 공원에', baseText: { de: 'in den Hangang-Park', en: 'to Hangang Park' } }, { targetText: '갈 거예요.', baseText: { de: 'werde ich gehen.', en: 'I will go.' } }],
    terms: [{ targetText: '주말에', baseText: { de: 'am Wochenende', en: 'at the weekend' } }, { targetText: '한강', baseText: { de: 'Hangang-Fluss', en: 'Hangang River' } }, { targetText: '공원에', baseText: { de: 'in den Park', en: 'to the park' } }, { targetText: '갈', baseText: { de: 'gehen werde', en: 'will go' } }, { targetText: '거예요', baseText: { de: 'werde ich', en: 'I will' } }],
    recall: { before: '', answer: '주말에', after: ' 한강 공원에 갈 거예요.', fallbackChoices: ['주말에', '가방에', '책상에', '우산에'] }, speakRequired: ['주말에', '한강', '갈'],
    sceneCaption: { de: 'Dein Freund zeigt auf den sonnigen Wetterbericht und fragt: „주말에 뭐 할 거예요?“', en: 'Your friend points to the sunny forecast and asks: “주말에 뭐 할 거예요?”' },
    trophyWord: { word: '주말', meaning: { de: 'Wochenende', en: 'weekend' }, example: '주말에 친구를 만나요.', whyThisWord: { de: 'Dieses Wort öffnet einen natürlichen Gesprächsraum für freie Zeit, Pläne und gemeinsame Einladungen.', en: 'This word opens a natural conversation space for free time, plans, and shared invitations.' } },
    distractors: ['한강에서 자요', '공원에서 읽어요'], placeholderCaption: { de: 'Menschen sitzen im Hangang-Park am Fluss, während die Stadt dahinter leuchtet.', en: 'People sit in Hangang Park by the river while the city glows behind them.' }, songMood: 'an open sunny weekend by the river', visualNotes: 'Hangang riverside park, picnic mats, distant Seoul skyline, a relaxed weekend destination.',
  }),
]

export const KOREAN_A2_PRACTICAL_4_LESSONS: GuidedLessonDefinition[] = makeKoreanA2PracticalLessons(
  GUIDED_TODAY_PATH_KOREAN_A2_FOUR_METADATA, koreanA2Practical4Inputs,
  { de: 'Du hast Koreanisch A2 Praxis 4 abgeschlossen und kannst Pläne verabreden, ändern und bestätigen.', en: 'You have completed Korean A2 Practical 4 and can make, change, and confirm plans.' },
)

export const GUIDED_TODAY_PATH_KOREAN_A2_FIVE_METADATA: GuidedPathMetadata = {
  id: 'korean-a2-practical-5', title: 'Korean A2 Practical 5', shortTitle: 'A2 Practical 5',
  subtitle: { de: 'Freundlich korrigieren, Alternativen nennen und kleine Probleme lösen', en: 'Correcting politely, naming alternatives, and solving small problems' },
  level: 'A2', baseLanguage: 'German', targetLanguage: 'Korean', estimatedMinutes: 5,
}

const koreanA2Practical5Inputs: KoreanA2LessonInput[] = [
  makeKoreanA2CompactLesson({
    slug: 'cha-jumunhaesseoyo', title: { de: 'Tee, nicht Kaffee', en: 'Tea, not coffee' },
    situation: { de: 'Im Café stellt die Barista Kaffee hin. Du korrigierst die Bestellung höflich und sagst, dass du Tee bestellt hast.', en: 'At the cafe, the barista sets down coffee. Politely correct the order and say that you ordered tea.' },
    pedagogicalGoal: 'Eine falsche Bestellung mit 말고 höflich und klar korrigieren.',
    targetText: '저는 커피 말고 차를 주문했어요.', baseText: { de: 'Ich habe Tee bestellt, keinen Kaffee.', en: 'I ordered tea, not coffee.' },
    chunks: [{ targetText: '저는', baseText: { de: 'ich', en: 'I' } }, { targetText: '커피 말고', baseText: { de: 'nicht Kaffee, sondern', en: 'not coffee, but' } }, { targetText: '차를 주문했어요.', baseText: { de: 'Tee habe ich bestellt.', en: 'I ordered tea.' } }],
    terms: [{ targetText: '저는', baseText: { de: 'was mich angeht', en: 'as for me' } }, { targetText: '차를', baseText: { de: 'Tee mit Objektpartikel', en: 'tea with object particle' } }, { targetText: '주문했어요', baseText: { de: 'ich habe bestellt', en: 'I ordered' } }, { targetText: '커피', baseText: { de: 'Kaffee', en: 'coffee' } }, { targetText: '말고', baseText: { de: 'statt; nicht ..., sondern', en: 'instead of; not ..., but' } }],
    recall: { before: '저는 커피 말고 ', answer: '차를', after: ' 주문했어요.', fallbackChoices: ['차를', '물을', '주스를', '빵을'] }, speakRequired: ['말고', '차를', '주문했어요'],
    sceneCaption: { de: 'Die Barista stellt einen Kaffee vor dich und fragt: „커피 드릴까요?“', en: 'The barista sets down a coffee and asks: “커피 드릴까요?”' },
    trophyWord: { word: '차', meaning: { de: 'Tee', en: 'tea' }, example: '차를 한 잔 주세요.', whyThisWord: { de: 'Mit diesem Wort benennst du sofort die richtige Bestellung, bevor du den kleinen Fehler höflich korrigierst.', en: 'With this word, you name the correct order immediately before politely correcting the small mistake.' } },
    distractors: ['커피를 마셔요', '주스를 주세요'], placeholderCaption: { de: 'Eine Tasse Tee und eine versehentlich hingestellte Kaffeetasse stehen nebeneinander auf dem Tresen.', en: 'A cup of tea and a mistakenly placed coffee cup stand side by side on the counter.' }, songMood: 'a calm polite correction at a familiar cafe', visualNotes: 'Cafe counter with tea and coffee side by side, barista listening attentively.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'jageun-sai-je-gyohwan', title: { de: 'Zu klein', en: 'Too small' },
    situation: { de: 'Du probierst etwas im Laden an, aber es ist zu klein. Du fragst höflich nach einem Umtausch.', en: 'You try something on in a shop, but it is too small. Politely ask for an exchange.' },
    pedagogicalGoal: 'Ein Größenproblem nennen und mit -(으)ㄹ 수 있어요? nach einem Umtausch fragen.',
    targetText: '좀 작아요. 교환할 수 있어요?', baseText: { de: 'Es ist etwas klein. Kann ich es umtauschen?', en: 'It is a little small. Can I exchange it?' },
    chunks: [{ targetText: '좀 작아요.', baseText: { de: 'Es ist etwas klein.', en: 'It is a little small.' } }, { targetText: '교환할', baseText: { de: 'umtauschen zu können', en: 'to be able to exchange' } }, { targetText: '수 있어요?', baseText: { de: 'ist das möglich?', en: 'is that possible?' } }],
    terms: [{ targetText: '좀', baseText: { de: 'etwas; bitte', en: 'a little; please' } }, { targetText: '작아요', baseText: { de: 'es ist klein', en: 'it is small' } }, { targetText: '교환할', baseText: { de: 'umtauschen können', en: 'be able to exchange' } }, { targetText: '수 있어요', baseText: { de: 'kann ich; ist es möglich', en: 'can I; is it possible' } }, { targetText: '사이즈', baseText: { de: 'Größe', en: 'size' } }],
    recall: { before: '좀 작아요. ', answer: '교환할', after: ' 수 있어요?', fallbackChoices: ['교환할', '마실', '읽을', '걸을'] }, speakRequired: ['작아요', '교환할', '있어요'],
    sceneCaption: { de: 'Die Verkäuferin wartet neben dem Spiegel und fragt: „사이즈가 괜찮아요?“', en: 'The shop assistant waits beside the mirror and asks: “사이즈가 괜찮아요?”' },
    trophyWord: { word: '교환', meaning: { de: 'Umtausch', en: 'exchange' }, example: '이 옷을 교환할 수 있어요?', whyThisWord: { de: 'Dieses Wort löst ein kleines Einkaufsproblem direkt, ohne dass du dich lange erklären musst.', en: 'This word solves a small shopping problem directly without needing a long explanation.' } },
    distractors: ['사이즈가 커요', '색이 예뻐요'], placeholderCaption: { de: 'Ein Kleidungsstück hängt neben einem Spiegel, während ein Umtauschschild sichtbar ist.', en: 'A garment hangs beside a mirror while an exchange sign is visible.' }, songMood: 'a practical shop visit handled with ease', visualNotes: 'Clothing shop fitting mirror, small garment tag, helpful assistant and a relaxed exchange.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'tansansu-malgo-mul', title: { de: 'Stilles Wasser bitte', en: 'Still water, please' },
    situation: { de: 'Im Restaurant bietet der Kellner Sprudelwasser an. Du bittest stattdessen höflich um normales Wasser.', en: 'At a restaurant, the server offers sparkling water. Politely ask for plain water instead.' },
    pedagogicalGoal: 'Mit N 말고 N eine klare und freundliche Alternative bestellen.',
    targetText: '탄산수 말고 그냥 물 주세요.', baseText: { de: 'Bitte normales Wasser statt Sprudelwasser.', en: 'Plain water instead of sparkling water, please.' },
    chunks: [{ targetText: '탄산수 말고', baseText: { de: 'statt Sprudelwasser', en: 'instead of sparkling water' } }, { targetText: '그냥 물', baseText: { de: 'einfach normales Wasser', en: 'just plain water' } }, { targetText: '주세요.', baseText: { de: 'bitte.', en: 'please.' } }],
    terms: [{ targetText: '탄산수', baseText: { de: 'Sprudelwasser', en: 'sparkling water' } }, { targetText: '말고', baseText: { de: 'statt; nicht ..., sondern', en: 'instead of; not ..., but' } }, { targetText: '그냥', baseText: { de: 'einfach; nur', en: 'just; simply' } }, { targetText: '물', baseText: { de: 'Wasser', en: 'water' } }, { targetText: '주세요', baseText: { de: 'bitte geben Sie mir', en: 'please give me' } }],
    recall: { before: '탄산수 ', answer: '말고', after: ' 그냥 물 주세요.', fallbackChoices: ['말고', '하고', '에서', '으로'] }, speakRequired: ['탄산수', '말고', '주세요'],
    sceneCaption: { de: 'Der Kellner hält eine Flasche hoch und fragt: „탄산수 드릴까요?“', en: 'The server holds up a bottle and asks: “탄산수 드릴까요?”' },
    trophyWord: { word: '탄산수', meaning: { de: 'Sprudelwasser', en: 'sparkling water' }, example: '탄산수 말고 물 주세요.', whyThisWord: { de: 'Das Wort macht die gewünschte Alternative im Restaurant sofort eindeutig.', en: 'This word makes the alternative you want immediately clear at the restaurant.' } },
    distractors: ['주스 말고 차', '커피하고 빵'], placeholderCaption: { de: 'Eine Flasche Sprudelwasser und ein Glas stilles Wasser stehen auf einem Restauranttisch.', en: 'A bottle of sparkling water and a glass of still water sit on a restaurant table.' }, songMood: 'a simple restaurant choice made politely', visualNotes: 'Restaurant table with two kinds of water, calm server gesture, clear uncomplicated choice.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'igeo-malgo-jeogeo', title: { de: 'Das da statt diesem', en: 'That one instead of this' },
    situation: { de: 'Auf dem Markt zeigt der Verkäufer auf einen Artikel. Du möchtest höflich den anderen nehmen.', en: 'At a market, the vendor points to one item. Politely ask for the other one.' },
    pedagogicalGoal: 'Eine Auswahl mit 말고 und 하나 natürlich präzisieren.',
    targetText: '이거 말고 저거 하나 주세요.', baseText: { de: 'Bitte das da, nicht dieses hier.', en: 'That one over there, not this one, please.' },
    chunks: [{ targetText: '이거 말고', baseText: { de: 'nicht dieses hier, sondern', en: 'not this one, but' } }, { targetText: '저거 하나', baseText: { de: 'eins von dem da', en: 'one of that one' } }, { targetText: '주세요.', baseText: { de: 'bitte.', en: 'please.' } }],
    terms: [{ targetText: '이거', baseText: { de: 'dieses hier', en: 'this one' } }, { targetText: '말고', baseText: { de: 'statt; nicht ..., sondern', en: 'instead of; not ..., but' } }, { targetText: '저거', baseText: { de: 'das da drüben', en: 'that one over there' } }, { targetText: '하나', baseText: { de: 'eins', en: 'one' } }, { targetText: '주세요', baseText: { de: 'bitte geben Sie mir', en: 'please give me' } }],
    recall: { before: '이거 ', answer: '말고', after: ' 저거 하나 주세요.', fallbackChoices: ['말고', '하고', '에서', '으로'] }, speakRequired: ['말고', '저거', '주세요'],
    sceneCaption: { de: 'Der Händler hält einen Artikel hoch und fragt: „이거 드릴까요?“', en: 'The vendor holds up an item and asks: “이거 드릴까요?”' },
    trophyWord: { word: '말고', meaning: { de: 'statt; nicht ..., sondern', en: 'instead of; not ..., but' }, example: '커피 말고 차 주세요.', whyThisWord: { de: 'Dieses Musterwort hilft dir, eine Auswahl höflich zu ändern, ohne den ganzen Satz neu bauen zu müssen.', en: 'This pattern word helps you change a choice politely without rebuilding the whole sentence.' } },
    distractors: ['이거 하나보다', '저거 두 개하고'], placeholderCaption: { de: 'Zwei ähnliche Marktartikel liegen nebeneinander, während eine Hand auf den weiter hinten zeigt.', en: 'Two similar market items sit side by side while a hand points to the one farther back.' }, songMood: 'a quick clear choice at a market stall', visualNotes: 'Market counter with two similar items, customer pointing, vendor waiting patiently.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'bang-sikkeureowoyo', title: { de: 'Ein ruhigeres Zimmer', en: 'A quieter room' },
    situation: { de: 'Im Hotel ist dein Zimmer sehr laut. Du erklärst das Problem und fragst höflich nach einem anderen Zimmer.', en: 'Your hotel room is very noisy. Explain the problem and politely ask for another room.' },
    pedagogicalGoal: 'Ein einfaches Zimmerproblem nennen und nach einer Alternative fragen.',
    targetText: '방이 너무 시끄러워요. 다른 방 있어요?', baseText: { de: 'Das Zimmer ist zu laut. Gibt es ein anderes Zimmer?', en: 'The room is too noisy. Is there another room?' },
    chunks: [{ targetText: '방이 너무', baseText: { de: 'das Zimmer ist zu', en: 'the room is too' } }, { targetText: '시끄러워요.', baseText: { de: 'laut.', en: 'noisy.' } }, { targetText: '다른 방 있어요?', baseText: { de: 'gibt es ein anderes Zimmer?', en: 'is there another room?' } }],
    terms: [{ targetText: '방이', baseText: { de: 'Zimmer mit Subjektpartikel', en: 'room with subject particle' } }, { targetText: '너무', baseText: { de: 'zu; sehr', en: 'too; very' } }, { targetText: '시끄러워요', baseText: { de: 'es ist laut', en: 'it is noisy' } }, { targetText: '다른', baseText: { de: 'anderer; anders', en: 'other; different' } }, { targetText: '있어요', baseText: { de: 'es gibt; haben Sie', en: 'there is; do you have' } }],
    recall: { before: '방이 너무 ', answer: '시끄러워요', after: '. 다른 방 있어요?', fallbackChoices: ['시끄러워요', '비싸요', '작아요', '짧아요'] }, speakRequired: ['방이', '너무', '시끄러워요'],
    sceneCaption: { de: 'Die Rezeptionistin fragt nach deinem ersten Eindruck: „방은 괜찮으세요?“', en: 'The receptionist asks about your first impression: “방은 괜찮으세요?”' },
    trophyWord: { word: '너무', meaning: { de: 'zu; sehr', en: 'too; very' }, example: '음악이 너무 커요.', whyThisWord: { de: 'Dieses Wort zeigt höflich, aber klar, dass die Lautstärke für dich ein echtes Problem ist.', en: 'This word shows politely but clearly that the noise level is a real problem for you.' } },
    distractors: ['방이 조용해요', '창문이 커요'], placeholderCaption: { de: 'Ein Hotelzimmer liegt neben einer lauten Straße, während an der Rezeption ein Schlüssel bereitliegt.', en: 'A hotel room faces a noisy street while a key waits at reception.' }, songMood: 'a calm request for a better room', visualNotes: 'Hotel reception, key cards, city traffic beyond a window, considerate staff listening.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'aniyo-igeo-hanaman', title: { de: 'Nur dieses eine', en: 'Just this one' },
    situation: { de: 'Im Laden bietet dir eine Verkäuferin noch etwas Zusätzliches an. Du lehnst freundlich ab und nimmst nur den einen Artikel.', en: 'In a shop, a sales assistant offers you something extra. Politely decline and take only the one item.' },
    pedagogicalGoal: 'Mit 아니요, 괜찮아요 einen Zusatzverkauf freundlich ablehnen.',
    targetText: '아니요, 괜찮아요. 이거 하나만 주세요.', baseText: { de: 'Nein, danke. Bitte nur dieses eine.', en: 'No, thank you. Just this one, please.' },
    chunks: [{ targetText: '아니요, 괜찮아요.', baseText: { de: 'Nein, danke.', en: 'No, thank you.' } }, { targetText: '이거 하나만', baseText: { de: 'nur dieses eine', en: 'just this one' } }, { targetText: '주세요.', baseText: { de: 'bitte.', en: 'please.' } }],
    terms: [{ targetText: '아니요', baseText: { de: 'nein', en: 'no' } }, { targetText: '괜찮아요', baseText: { de: 'es ist gut so; nein danke', en: 'it is fine; no thank you' } }, { targetText: '이거', baseText: { de: 'dieses hier', en: 'this one' } }, { targetText: '하나만', baseText: { de: 'nur eins', en: 'only one' } }, { targetText: '주세요', baseText: { de: 'bitte geben Sie mir', en: 'please give me' } }],
    recall: { before: '아니요, ', answer: '괜찮아요', after: '. 이거 하나만 주세요.', fallbackChoices: ['괜찮아요', '비싸요', '작아요', '멀어요'] }, speakRequired: ['아니요', '하나만', '주세요'],
    sceneCaption: { de: 'Die Verkäuferin zeigt auf eine zweite Tasche und fragt: „이것도 필요하세요?“', en: 'The sales assistant points to a second bag and asks: “이것도 필요하세요?”' },
    trophyWord: { word: '하나만', meaning: { de: 'nur eins', en: 'only one' }, example: '빵 하나만 주세요.', whyThisWord: { de: 'Dieses Wort hält deine Antwort kurz und freundlich, wenn du wirklich nichts Zusätzliches brauchst.', en: 'This word keeps your reply short and warm when you truly do not need anything extra.' } },
    distractors: ['이거 두 개', '가방도 주세요'], placeholderCaption: { de: 'Ein einzelner ausgewählter Artikel liegt auf einem Ladentresen, daneben bleibt eine zweite Tasche zurück.', en: 'One chosen item rests on a shop counter while a second bag remains beside it.' }, songMood: 'a polite no with simple confidence', visualNotes: 'Shop counter, one selected item, considerate sales assistant, restrained uncluttered scene.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'gyesan-an-majayo', title: { de: 'Die Rechnung stimmt nicht', en: 'The bill is not right' },
    situation: { de: 'An der Kasse wirkt der Betrag nicht richtig. Du machst freundlich darauf aufmerksam und bittest um eine erneute Prüfung.', en: 'At the checkout, the amount does not seem right. Point it out politely and ask for another check.' },
    pedagogicalGoal: 'Mit 안 맞아요 ein Zahlungsproblem sachlich ansprechen und um Hilfe bitten.',
    targetText: '계산이 안 맞아요. 다시 봐 주세요.', baseText: { de: 'Die Rechnung stimmt nicht. Bitte schauen Sie noch einmal nach.', en: 'The calculation is not right. Please check again.' },
    chunks: [{ targetText: '계산이 안 맞아요.', baseText: { de: 'die Rechnung stimmt nicht.', en: 'the calculation is not right.' } }, { targetText: '다시 봐', baseText: { de: 'noch einmal schauen', en: 'look again' } }, { targetText: '주세요.', baseText: { de: 'bitte.', en: 'please.' } }],
    terms: [{ targetText: '계산이', baseText: { de: 'Rechnung mit Subjektpartikel', en: 'calculation with subject particle' } }, { targetText: '안', baseText: { de: 'nicht', en: 'not' } }, { targetText: '맞아요', baseText: { de: 'es stimmt; es passt', en: 'it is right; it matches' } }, { targetText: '다시', baseText: { de: 'noch einmal', en: 'again' } }, { targetText: '봐 주세요', baseText: { de: 'bitte schauen Sie nach', en: 'please check' } }],
    recall: { before: '계산이 안 ', answer: '맞아요', after: '. 다시 봐 주세요.', fallbackChoices: ['맞아요', '비싸요', '작아요', '커요'] }, speakRequired: ['계산이', '맞아요', '주세요'],
    sceneCaption: { de: 'Die Kassiererin dreht das Display zu dir und fragt: „금액이 맞아요?“', en: 'The cashier turns the display toward you and asks: “금액이 맞아요?”' },
    trophyWord: { word: '계산', meaning: { de: 'Rechnung; Berechnung', en: 'calculation; bill' }, example: '계산이 안 맞아요.', whyThisWord: { de: 'Dieses Wort hilft dir, ein Problem mit einem Betrag klar anzusprechen, ohne unhöflich zu wirken.', en: 'This word lets you raise a problem with an amount clearly without sounding impolite.' } },
    distractors: ['가격이 비싸요', '카드가 있어요'], placeholderCaption: { de: 'Ein Kassendisplay und ein Beleg liegen vor einer Kassiererin, die aufmerksam noch einmal prüft.', en: 'A checkout display and receipt lie before a cashier who checks again attentively.' }, songMood: 'a composed correction at the checkout', visualNotes: 'Checkout screen, receipt, helpful cashier reviewing a small discrepancy with calm attention.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'deo-jageun-geollo', title: { de: 'Eine kleinere Größe', en: 'A smaller size' },
    situation: { de: 'In der Apotheke liegt die angebotene Packung zu groß in der Hand. Du bittest um eine kleinere Variante.', en: 'At the pharmacy, the offered package feels too large. Ask for a smaller option.' },
    pedagogicalGoal: 'Mit 더 und 걸로 eine kleinere Alternative präzise erbitten.',
    targetText: '이것보다 더 작은 걸로 주세요.', baseText: { de: 'Bitte eine kleinere als diese hier.', en: 'Please give me a smaller one than this.' },
    chunks: [{ targetText: '이것보다 더', baseText: { de: 'als dieses hier', en: 'than this one' } }, { targetText: '작은 걸로', baseText: { de: 'eine kleinere Variante', en: 'a smaller one' } }, { targetText: '주세요.', baseText: { de: 'bitte.', en: 'please.' } }],
    terms: [{ targetText: '이것보다', baseText: { de: 'als dieses hier', en: 'than this one' } }, { targetText: '더', baseText: { de: 'mehr; noch', en: 'more; further' } }, { targetText: '작은', baseText: { de: 'kleiner', en: 'smaller' } }, { targetText: '걸로', baseText: { de: 'mit einem; als Variante', en: 'with one; as an option' } }, { targetText: '주세요', baseText: { de: 'bitte geben Sie mir', en: 'please give me' } }],
    recall: { before: '이것보다 ', answer: '더', after: ' 작은 걸로 주세요.', fallbackChoices: ['더', '만', '도', '에'] }, speakRequired: ['더', '작은', '주세요'],
    sceneCaption: { de: 'Die Apothekerin stellt eine große Packung hin und fragt: „이걸로 드릴까요?“', en: 'The pharmacist sets down a large package and asks: “이걸로 드릴까요?”' },
    trophyWord: { word: '더', meaning: { de: 'mehr; noch', en: 'more; further' }, example: '더 작은 거 있어요?', whyThisWord: { de: 'Mit diesem Vergleichswort kannst du höflich nach genau der kleineren Variante fragen, die du brauchst.', en: 'With this comparison word, you can politely ask for the smaller option you need.' } },
    distractors: ['큰 걸로 말고', '이것만 말고'], placeholderCaption: { de: 'Zwei Packungsgrößen liegen nebeneinander auf einem Apothekentresen.', en: 'Two package sizes lie side by side on a pharmacy counter.' }, songMood: 'a careful small choice at the pharmacy', visualNotes: 'Clean pharmacy counter, two package sizes, clear hand comparison and helpful staff.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'sinae-malgo-seoul-yeogeuro', title: { de: 'Zum Bahnhof, nicht in die Innenstadt', en: 'To the station, not downtown' },
    situation: { de: 'Der Taxifahrer fragt nach deinem Ziel. Du korrigierst die Richtung und bittest um die Fahrt zum Bahnhof Seoul.', en: 'The taxi driver asks for your destination. Correct the direction and ask to go to Seoul Station.' },
    pedagogicalGoal: 'Mit N 말고 N und -(으)로 ein Fahrziel höflich korrigieren.',
    targetText: '시내 말고 서울역으로 가 주세요.', baseText: { de: 'Bitte zum Bahnhof Seoul, nicht in die Innenstadt.', en: 'To Seoul Station, not downtown, please.' },
    chunks: [{ targetText: '시내 말고', baseText: { de: 'nicht in die Innenstadt, sondern', en: 'not downtown, but' } }, { targetText: '서울역으로', baseText: { de: 'zum Bahnhof Seoul', en: 'to Seoul Station' } }, { targetText: '가 주세요.', baseText: { de: 'bitte fahren Sie.', en: 'please go.' } }],
    terms: [{ targetText: '시내', baseText: { de: 'Innenstadt', en: 'downtown' } }, { targetText: '말고', baseText: { de: 'statt; nicht ..., sondern', en: 'instead of; not ..., but' } }, { targetText: '서울역으로', baseText: { de: 'zum Bahnhof Seoul', en: 'to Seoul Station' } }, { targetText: '가', baseText: { de: 'fahr; geh', en: 'go' } }, { targetText: '주세요', baseText: { de: 'bitte', en: 'please' } }],
    recall: { before: '시내 말고 ', answer: '서울역으로', after: ' 가 주세요.', fallbackChoices: ['서울역으로', '가방으로', '책으로', '우산으로'] }, speakRequired: ['시내', '서울역으로', '주세요'],
    sceneCaption: { de: 'Der Taxifahrer schaut im Rückspiegel und fragt: „어디로 가세요?“', en: 'The taxi driver looks in the rear-view mirror and asks: “어디로 가세요?”' },
    trophyWord: { word: '시내', meaning: { de: 'Innenstadt', en: 'downtown' }, example: '시내 말고 공원으로 가요.', whyThisWord: { de: 'Dieses Wort macht die falsche Richtung benennbar, damit du dein eigentliches Ziel freundlich dagegenstellen kannst.', en: 'This word lets you name the wrong direction so you can politely set your actual destination against it.' } },
    distractors: ['공원으로 가요', '호텔에 가요'], placeholderCaption: { de: 'Ein Taxi fährt an Stadtlichtern vorbei, auf der Karte ist der Bahnhof Seoul markiert.', en: 'A taxi drives past city lights while Seoul Station is marked on the map.' }, songMood: 'a confident taxi correction through the city', visualNotes: 'Taxi interior, navigation map to Seoul Station, city lights, driver listening through mirror.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'oneureun-eoryeowoyo', title: { de: 'Heute ist es schwierig', en: 'Today is difficult' },
    situation: { de: 'Ein Freund lädt dich ein, heute mitzukommen. Du lehnst sanft ab und schlägst ein anderes Mal vor.', en: 'A friend invites you to come along today. Decline gently and suggest another time.' },
    pedagogicalGoal: 'Eine Einladung mit einer weichen, höflichen Absage beantworten.',
    targetText: '오늘은 좀 어려워요. 다음에 가요.', baseText: { de: 'Heute ist es etwas schwierig. Gehen wir ein anderes Mal.', en: 'Today is a little difficult. Let us go another time.' },
    chunks: [{ targetText: '오늘은 좀', baseText: { de: 'heute ist es etwas', en: 'today is a little' } }, { targetText: '어려워요.', baseText: { de: 'schwierig.', en: 'difficult.' } }, { targetText: '다음에 가요.', baseText: { de: 'gehen wir ein anderes Mal.', en: 'let us go another time.' } }],
    terms: [{ targetText: '오늘은', baseText: { de: 'was heute angeht', en: 'as for today' } }, { targetText: '좀', baseText: { de: 'etwas', en: 'a little' } }, { targetText: '어려워요', baseText: { de: 'es ist schwierig', en: 'it is difficult' } }, { targetText: '다음에', baseText: { de: 'nächstes Mal', en: 'next time' } }, { targetText: '가요', baseText: { de: 'wir gehen', en: 'we go' } }],
    recall: { before: '오늘은 좀 ', answer: '어려워요', after: '. 다음에 가요.', fallbackChoices: ['어려워요', '비싸요', '작아요', '짧아요'] }, speakRequired: ['오늘은', '어려워요', '다음에'],
    sceneCaption: { de: 'Dein Freund steht an der Tür und fragt: „오늘 같이 갈까요?“', en: 'Your friend stands at the door and asks: “오늘 같이 갈까요?”' },
    trophyWord: { word: '어려워요', meaning: { de: 'es ist schwierig', en: 'it is difficult' }, example: '오늘은 좀 어려워요.', whyThisWord: { de: 'Diese sanfte Formulierung lässt dich ablehnen, ohne dass deine Antwort hart oder unfreundlich klingt.', en: 'This gentle expression lets you decline without making your reply sound harsh or unfriendly.' } },
    distractors: ['오늘 같이 가요', '다음에 만나요'], placeholderCaption: { de: 'Eine offene Tür und eine freundliche Nachricht lassen Raum für eine Einladung an einem anderen Tag.', en: 'An open door and a friendly message leave room for an invitation on another day.' }, songMood: 'a warm rain check between friends', visualNotes: 'Apartment doorway, friendly wave, soft evening, no tension and an open future plan.',
  }),
]

export const KOREAN_A2_PRACTICAL_5_LESSONS: GuidedLessonDefinition[] = makeKoreanA2PracticalLessons(
  GUIDED_TODAY_PATH_KOREAN_A2_FIVE_METADATA, koreanA2Practical5Inputs,
  { de: 'Du hast Koreanisch A2 Praxis 5 abgeschlossen und kannst kleine Fehler höflich korrigieren und Alternativen nennen.', en: 'You have completed Korean A2 Practical 5 and can politely correct small mistakes and name alternatives.' },
)

export const GUIDED_TODAY_PATH_KOREAN_A2_SIX_METADATA: GuidedPathMetadata = {
  id: 'korean-a2-practical-6', title: 'Korean A2 Practical 6', shortTitle: 'A2 Practical 6',
  subtitle: { de: 'Alltägliche Dienste nutzen, Zeiten klären und Erledigungen abschließen', en: 'Using everyday services, asking about timing, and finishing errands' },
  level: 'A2', baseLanguage: 'German', targetLanguage: 'Korean', estimatedMinutes: 5,
}

const koreanA2Practical6Inputs: KoreanA2LessonInput[] = [
  makeKoreanA2CompactLesson({
    slug: 'setak-eonje-dwaeyo', title: { de: 'Wäsche abgeben', en: 'Dropping off laundry' },
    situation: { de: 'Du gibst Wäsche in einer Reinigung ab und möchtest wissen, wann sie fertig ist.', en: 'You drop off laundry at a cleaner and want to know when it will be ready.' },
    pedagogicalGoal: 'Eine Dienstleistung freundlich erbitten und mit 언제 돼요? nach dem Zeitpunkt fragen.',
    targetText: '세탁 좀 부탁해요. 언제 돼요?', baseText: { de: 'Bitte waschen Sie das. Wann ist es fertig?', en: 'Please do the laundry. When will it be ready?' },
    chunks: [{ targetText: '세탁 좀', baseText: { de: 'die Wäsche bitte', en: 'the laundry, please' } }, { targetText: '부탁해요.', baseText: { de: 'ich bitte darum.', en: 'I would like to ask.' } }, { targetText: '언제 돼요?', baseText: { de: 'wann ist es fertig?', en: 'when is it ready?' } }],
    terms: [{ targetText: '세탁', baseText: { de: 'Wäsche; Reinigung', en: 'laundry; cleaning' } }, { targetText: '좀', baseText: { de: 'bitte; etwas', en: 'please; a little' } }, { targetText: '부탁해요', baseText: { de: 'ich bitte darum', en: 'I would like to ask' } }, { targetText: '언제', baseText: { de: 'wann', en: 'when' } }, { targetText: '돼요', baseText: { de: 'es wird fertig; es geht', en: 'it becomes ready; it works' } }],
    recall: { before: '세탁 좀 부탁해요. ', answer: '언제', after: ' 돼요?', fallbackChoices: ['언제', '무엇', '누구', '가방'] }, speakRequired: ['세탁', '부탁해요', '언제'],
    sceneCaption: { de: 'Die Mitarbeiterin nimmt deine Tasche entgegen und fragt: „세탁 맡기세요?“', en: 'The attendant takes your bag and asks: “세탁 맡기세요?”' },
    trophyWord: { word: '세탁', meaning: { de: 'Wäsche; Reinigung', en: 'laundry; cleaning' }, example: '세탁은 언제 돼요?', whyThisWord: { de: 'Dieses Wort nennt sofort die gewünschte Dienstleistung und macht klar, warum du die Wäsche abgibst.', en: 'This word immediately names the service you need and makes clear why you are dropping off the clothes.' } },
    distractors: ['옷을 사요', '가방을 찾아요'], placeholderCaption: { de: 'Eine Stofftasche mit Kleidung liegt auf dem Tresen einer kleinen Reinigung.', en: 'A cloth bag of clothes rests on the counter of a small cleaner.' }, songMood: 'a tidy practical errand on a city morning', visualNotes: 'Neighborhood laundry counter, folded clothes, numbered tag, polite attendant receiving a bag.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'hwamyeon-suri-hal-su-issoyo', title: { de: 'Ein kaputtes Display', en: 'A broken screen' },
    situation: { de: 'Das Display deines Handys ist kaputt. Im Reparaturladen fragst du, ob es repariert werden kann.', en: 'Your phone screen is broken. At a repair shop, ask whether it can be repaired.' },
    pedagogicalGoal: 'Ein konkretes Geräteproblem nennen und mit -(으)ㄹ 수 있어요? nach Reparatur fragen.',
    targetText: '화면이 고장 났어요. 수리할 수 있어요?', baseText: { de: 'Der Bildschirm ist kaputtgegangen. Können Sie ihn reparieren?', en: 'The screen broke. Can you repair it?' },
    chunks: [{ targetText: '화면이 고장 났어요.', baseText: { de: 'der Bildschirm ist kaputtgegangen.', en: 'the screen broke.' } }, { targetText: '수리할', baseText: { de: 'reparieren zu können', en: 'to be able to repair' } }, { targetText: '수 있어요?', baseText: { de: 'ist das möglich?', en: 'is that possible?' } }],
    terms: [{ targetText: '화면이', baseText: { de: 'Bildschirm mit Subjektpartikel', en: 'screen with subject particle' } }, { targetText: '고장 났어요', baseText: { de: 'ist kaputtgegangen', en: 'broke down' } }, { targetText: '수리할', baseText: { de: 'reparieren können', en: 'be able to repair' } }, { targetText: '수 있어요', baseText: { de: 'kann man; ist es möglich', en: 'can; is it possible' } }, { targetText: '휴대폰', baseText: { de: 'Handy', en: 'mobile phone' } }],
    recall: { before: '화면이 고장 났어요. ', answer: '수리할', after: ' 수 있어요?', fallbackChoices: ['수리할', '마실', '읽을', '걸을'] }, speakRequired: ['화면이', '고장', '수리할'],
    sceneCaption: { de: 'Ein Reparaturmitarbeiter sieht dein Handy an und fragt: „어떤 문제가 있으세요?“', en: 'A repair-shop worker looks at your phone and asks: “어떤 문제가 있으세요?”' },
    trophyWord: { word: '화면', meaning: { de: 'Bildschirm', en: 'screen' }, example: '화면이 너무 어두워요.', whyThisWord: { de: 'Mit diesem Wort benennst du genau das sichtbare Teil deines Handys, das im Laden geprüft werden muss.', en: 'This word names the visible part of your phone that needs checking in the shop.' } },
    distractors: ['휴대폰이 커요', '충전이 돼요'], placeholderCaption: { de: 'Ein Handy mit dunklem, kaputtem Display liegt auf einer sauberen Werkbank neben Werkzeugen.', en: 'A phone with a dark, broken screen lies on a clean workbench beside tools.' }, songMood: 'a practical repair shop visit with a clear solution', visualNotes: 'Bright phone repair counter, dark unresponsive display, small tools, helpful technician examining the device.',
  }),
  makeKoreanA2CompactLesson({
    slug: 't-money-man-won-chungjeonhae', title: { de: 'Karte aufladen', en: 'Topping up a card' },
    situation: { de: 'An einem Kiosk möchtest du deine T-money-Karte aufladen. Du nennst den Betrag und bittest darum.', en: 'At a kiosk, you want to top up your T-money card. State the amount and ask for it.' },
    pedagogicalGoal: 'Einen Betrag mit 만 원 nennen und mit -아/어 주세요 eine Aufladung erbitten.',
    targetText: '티머니에 만 원 충전해 주세요.', baseText: { de: 'Bitte laden Sie zehntausend Won auf meine T-money-Karte.', en: 'Please top up my T-money card with ten thousand won.' },
    chunks: [{ targetText: '티머니에 만 원', baseText: { de: 'auf die T-money-Karte zehntausend Won', en: 'ten thousand won onto the T-money card' } }, { targetText: '충전해', baseText: { de: 'aufladen', en: 'top up' } }, { targetText: '주세요.', baseText: { de: 'bitte.', en: 'please.' } }],
    terms: [{ targetText: '티머니에', baseText: { de: 'auf die T-money-Karte', en: 'onto the T-money card' } }, { targetText: '만 원', baseText: { de: 'zehntausend Won', en: 'ten thousand won' } }, { targetText: '충전해', baseText: { de: 'lade auf', en: 'top up' } }, { targetText: '주세요', baseText: { de: 'bitte', en: 'please' } }, { targetText: '카드', baseText: { de: 'Karte', en: 'card' } }],
    recall: { before: '티머니에 만 원 ', answer: '충전해', after: ' 주세요.', fallbackChoices: ['충전해', '읽어', '마셔', '걸어'] }, speakRequired: ['티머니에', '충전해', '주세요'],
    sceneCaption: { de: 'Die Person am Kiosk hält das Kartenlesegerät bereit und fragt: „얼마를 충전할까요?“', en: 'The kiosk attendant holds out the card reader and asks: “얼마를 충전할까요?”' },
    trophyWord: { word: '충전', meaning: { de: 'Aufladen', en: 'top-up; charging' }, example: '카드에 충전해 주세요.', whyThisWord: { de: 'Dieses Wort ist der Schlüssel für eine schnelle Fahrtkarte-Aufladung, wenn du gleich weiterfahren willst.', en: 'This word is the key to a quick transit-card top-up when you want to keep moving.' } },
    distractors: ['카드를 사요', '현금이 있어요'], placeholderCaption: { de: 'Eine T-money-Karte liegt neben einem Kioskscanner und einem kleinen Betragsdisplay.', en: 'A T-money card lies beside a kiosk scanner and a small amount display.' }, songMood: 'a quick transit top-up before the next ride', visualNotes: 'Convenience-store kiosk, transit card on reader, modest amount display, fast city rhythm.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'mokyoire-yeyak-hal-su-issoyo', title: { de: 'Für Donnerstag buchen', en: 'Booking for Thursday' },
    situation: { de: 'Du rufst in einem kleinen Salon an und möchtest einen Termin für Donnerstag reservieren.', en: 'You call a small salon and want to reserve an appointment for Thursday.' },
    pedagogicalGoal: 'Mit einem Wochentag und -(으)ㄹ 수 있어요? höflich nach einer Buchungsmöglichkeit fragen.',
    targetText: '이번 주 목요일에 예약할 수 있어요?', baseText: { de: 'Kann ich für diesen Donnerstag reservieren?', en: 'Can I make a reservation for this Thursday?' },
    chunks: [{ targetText: '이번 주 목요일에', baseText: { de: 'diesen Donnerstag', en: 'this Thursday' } }, { targetText: '예약할', baseText: { de: 'reservieren zu können', en: 'to be able to reserve' } }, { targetText: '수 있어요?', baseText: { de: 'ist das möglich?', en: 'is that possible?' } }],
    terms: [{ targetText: '이번 주', baseText: { de: 'diese Woche', en: 'this week' } }, { targetText: '목요일에', baseText: { de: 'am Donnerstag', en: 'on Thursday' } }, { targetText: '예약할', baseText: { de: 'reservieren können', en: 'be able to reserve' } }, { targetText: '수 있어요', baseText: { de: 'kann ich; ist es möglich', en: 'can I; is it possible' } }, { targetText: '시간', baseText: { de: 'Zeit; Termin', en: 'time; appointment' } }],
    recall: { before: '이번 주 목요일에 ', answer: '예약할', after: ' 수 있어요?', fallbackChoices: ['예약할', '마실', '읽을', '걸을'] }, speakRequired: ['목요일에', '예약할', '있어요'],
    sceneCaption: { de: 'Die Rezeption am Telefon fragt: „언제로 예약해 드릴까요?“', en: 'The receptionist asks on the phone: “언제로 예약해 드릴까요?”' },
    trophyWord: { word: '목요일', meaning: { de: 'Donnerstag', en: 'Thursday' }, example: '목요일에 시간이 있어요.', whyThisWord: { de: 'Der Wochentag macht deine Anfrage sofort planbar und gibt dem Salon einen klaren Terminrahmen.', en: 'This weekday makes your request immediately schedulable and gives the salon a clear time frame.' } },
    distractors: ['금요일에 가요', '주말에 만나요'], placeholderCaption: { de: 'Ein Kalender und ein Telefon liegen auf dem Empfangstresen eines kleinen Salons.', en: 'A calendar and phone sit on the reception counter of a small salon.' }, songMood: 'a neat appointment request over the phone', visualNotes: 'Small salon reception, open weekly calendar, phone call, quiet organized daytime scene.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'yeolsoe-boksa-hal-su-issoyo', title: { de: 'Einen Schlüssel kopieren', en: 'Copying a key' },
    situation: { de: 'Du brauchst einen zusätzlichen Schlüssel für deine Wohnung. In einem Schlüsselladen fragst du nach einer Kopie.', en: 'You need an extra key for your apartment. At a key shop, ask for a copy.' },
    pedagogicalGoal: 'Eine konkrete Dienstleistung mit -(으)ㄹ 수 있어요? höflich erfragen.',
    targetText: '이 열쇠를 복사할 수 있어요?', baseText: { de: 'Können Sie diesen Schlüssel kopieren?', en: 'Can you copy this key?' },
    chunks: [{ targetText: '이 열쇠를', baseText: { de: 'diesen Schlüssel', en: 'this key' } }, { targetText: '복사할', baseText: { de: 'kopieren zu können', en: 'to be able to copy' } }, { targetText: '수 있어요?', baseText: { de: 'können Sie das?', en: 'can you do that?' } }],
    terms: [{ targetText: '이', baseText: { de: 'dieser; diese', en: 'this' } }, { targetText: '열쇠를', baseText: { de: 'Schlüssel mit Objektpartikel', en: 'key with object particle' } }, { targetText: '복사할', baseText: { de: 'kopieren können', en: 'be able to copy' } }, { targetText: '수 있어요', baseText: { de: 'können Sie; ist es möglich', en: 'can you; is it possible' } }, { targetText: '하나', baseText: { de: 'eins', en: 'one' } }],
    recall: { before: '이 열쇠를 ', answer: '복사할', after: ' 수 있어요?', fallbackChoices: ['복사할', '마실', '읽을', '걸을'] }, speakRequired: ['열쇠를', '복사할', '있어요'],
    sceneCaption: { de: 'Der Mitarbeiter in der kleinen Werkstatt fragt: „뭐가 필요하세요?“', en: 'The worker in the small workshop asks: “뭐가 필요하세요?”' },
    trophyWord: { word: '복사', meaning: { de: 'Kopie; kopieren', en: 'copy; copying' }, example: '열쇠를 복사할 수 있어요?', whyThisWord: { de: 'Dieses Wort sagt genau, welche kleine Werkstattleistung du brauchst, ohne die Sache umschreiben zu müssen.', en: 'This word says exactly which small workshop service you need without having to describe it around the edges.' } },
    distractors: ['열쇠를 사요', '문을 열어요'], placeholderCaption: { de: 'Ein Metallschlüssel liegt neben einer kleinen Kopiermaschine in einer Werkstatt.', en: 'A metal key lies beside a small copying machine in a workshop.' }, songMood: 'a small useful errand solved quickly', visualNotes: 'Compact key shop, metal key blank and copying machine, practical neighborhood service.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'sopo-chajeureo-wasseoyo', title: { de: 'Ein Paket abholen', en: 'Picking up a parcel' },
    situation: { de: 'Du gehst zum Paketpunkt, um eine Lieferung abzuholen. Du sagst, wofür du gekommen bist.', en: 'You go to a parcel point to collect a delivery. Say what you came for.' },
    pedagogicalGoal: 'Mit -(으)러 왔어요 den Zweck eines Besuchs einfach erklären.',
    targetText: '저는 소포를 찾으러 여기 왔어요.', baseText: { de: 'Ich bin hierher gekommen, um ein Paket abzuholen.', en: 'I came here to pick up a parcel.' },
    chunks: [{ targetText: '저는 소포를', baseText: { de: 'ich ein Paket', en: 'I, a parcel' } }, { targetText: '찾으러', baseText: { de: 'um abzuholen', en: 'to pick up' } }, { targetText: '여기 왔어요.', baseText: { de: 'bin hierher gekommen.', en: 'came here.' } }],
    terms: [{ targetText: '저는', baseText: { de: 'was mich angeht', en: 'as for me' } }, { targetText: '소포를', baseText: { de: 'Paket mit Objektpartikel', en: 'parcel with object particle' } }, { targetText: '찾으러', baseText: { de: 'um abzuholen', en: 'to pick up' } }, { targetText: '여기', baseText: { de: 'hierher; hier', en: 'here' } }, { targetText: '왔어요', baseText: { de: 'bin gekommen', en: 'came' } }],
    recall: { before: '저는 소포를 ', answer: '찾으러', after: ' 여기 왔어요.', fallbackChoices: ['찾으러', '먹으러', '마시러', '자러'] }, speakRequired: ['소포를', '찾으러', '왔어요'],
    sceneCaption: { de: 'Die Mitarbeiterin am Paketpunkt sieht auf das Regal und fragt: „어떻게 오셨어요?“', en: 'The attendant at the parcel point looks toward the shelf and asks: “어떻게 오셨어요?”' },
    trophyWord: { word: '소포', meaning: { de: 'Paket', en: 'parcel' }, example: '소포를 찾으러 왔어요.', whyThisWord: { de: 'Dieses Wort gibt deinem Besuch einen klaren Zweck und hilft dem Personal, dein Paket schnell im richtigen Regal zu finden.', en: 'This word gives your visit a clear purpose and helps the staff quickly find your parcel on the correct shelf.' } },
    distractors: ['소포를 보내요', '가방을 사요'], placeholderCaption: { de: 'Ein Paketregal und ein kleiner Abholschalter zeigen eine wartende Lieferung.', en: 'A parcel shelf and small collection counter show a waiting delivery.' }, songMood: 'a short successful parcel pickup', visualNotes: 'Parcel pickup shelf, labeled boxes, helpful attendant, uncomplicated urban errand.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'jajeongeoreul-iteul-billir-su-issoyo', title: { de: 'Ein Fahrrad für zwei Tage', en: 'A bike for two days' },
    situation: { de: 'Du möchtest die Stadt zwei Tage lang mit dem Fahrrad erkunden. Beim Verleih fragst du nach einer Miete.', en: 'You want to explore the city by bike for two days. At a rental shop, ask about hiring one.' },
    pedagogicalGoal: 'Eine Mietdauer mit 이틀 nennen und mit -(으)ㄹ 수 있어요? eine Möglichkeit erfragen.',
    targetText: '자전거를 이틀 빌릴 수 있어요?', baseText: { de: 'Kann ich ein Fahrrad für zwei Tage mieten?', en: 'Can I rent a bicycle for two days?' },
    chunks: [{ targetText: '자전거를', baseText: { de: 'ein Fahrrad', en: 'a bicycle' } }, { targetText: '이틀 빌릴', baseText: { de: 'für zwei Tage mieten zu können', en: 'to be able to rent for two days' } }, { targetText: '수 있어요?', baseText: { de: 'ist das möglich?', en: 'is that possible?' } }],
    terms: [{ targetText: '자전거를', baseText: { de: 'Fahrrad mit Objektpartikel', en: 'bicycle with object particle' } }, { targetText: '이틀', baseText: { de: 'zwei Tage', en: 'two days' } }, { targetText: '빌릴', baseText: { de: 'mieten können', en: 'be able to rent' } }, { targetText: '수 있어요', baseText: { de: 'kann ich; ist es möglich', en: 'can I; is it possible' } }, { targetText: '하루', baseText: { de: 'ein Tag', en: 'one day' } }],
    recall: { before: '자전거를 이틀 ', answer: '빌릴', after: ' 수 있어요?', fallbackChoices: ['빌릴', '마실', '읽을', '걸을'] }, speakRequired: ['자전거를', '이틀', '빌릴'],
    sceneCaption: { de: 'Der Verleiher zeigt auf eine Fahrradreihe und fragt: „이틀 동안 빌리세요?“', en: 'The rental clerk points to a row of bicycles and asks: “이틀 동안 빌리세요?”' },
    trophyWord: { word: '자전거', meaning: { de: 'Fahrrad', en: 'bicycle' }, example: '자전거를 빌릴 수 있어요?', whyThisWord: { de: 'Dieses Wort macht deine Erledigung sofort konkret: Du fragst nicht allgemein, sondern genau nach dem Verkehrsmittel für deine Tour.', en: 'This word makes your errand immediately concrete: you are asking not generally, but for the exact transport for your outing.' } },
    distractors: ['버스를 타요', '택시를 불러요'], placeholderCaption: { de: 'Eine Reihe Leihfahrräder steht bereit, daneben hängen Helme an einer Wand.', en: 'A row of rental bicycles stands ready with helmets hanging on a wall nearby.' }, songMood: 'a breezy two-day city ride beginning', visualNotes: 'Bike rental storefront, colorful bicycles and helmets, hopeful two-day city exploration.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'gage-neun-myeot-sikkaji-haeyo', title: { de: 'Wie lange ist geöffnet?', en: 'How late is it open?' },
    situation: { de: 'Du willst später noch einmal zu einem Laden zurückkommen. Du fragst nach der Schließzeit.', en: 'You want to return to a shop later. Ask when it closes.' },
    pedagogicalGoal: 'Mit 몇 시까지 해요? die Öffnungszeit eines Geschäfts erfragen.',
    targetText: '이 가게는 몇 시까지 해요?', baseText: { de: 'Bis wie viel Uhr ist dieser Laden geöffnet?', en: 'Until what time is this shop open?' },
    chunks: [{ targetText: '이 가게는', baseText: { de: 'was diesen Laden angeht', en: 'as for this shop' } }, { targetText: '몇 시까지', baseText: { de: 'bis wie viel Uhr', en: 'until what time' } }, { targetText: '해요?', baseText: { de: 'hat er geöffnet?', en: 'is it open?' } }],
    terms: [{ targetText: '이', baseText: { de: 'dieser; diese', en: 'this' } }, { targetText: '가게는', baseText: { de: 'was den Laden angeht', en: 'as for the shop' } }, { targetText: '몇 시까지', baseText: { de: 'bis wie viel Uhr', en: 'until what time' } }, { targetText: '해요', baseText: { de: 'es hat offen; es macht', en: 'it is open; it does' } }, { targetText: '영업시간', baseText: { de: 'Öffnungszeit', en: 'opening hours' } }],
    recall: { before: '이 가게는 몇 ', answer: '시까지', after: ' 해요?', fallbackChoices: ['시까지', '가방을', '책을', '우산을'] }, speakRequired: ['가게는', '시까지', '해요'],
    sceneCaption: { de: 'Die Mitarbeiterin räumt am Eingang auf und fragt: „뭐가 궁금하세요?“', en: 'The staff member tidies near the entrance and asks: “뭐가 궁금하세요?”' },
    trophyWord: { word: '가게', meaning: { de: 'Laden; Geschäft', en: 'shop; store' }, example: '이 가게는 몇 시까지 해요?', whyThisWord: { de: 'Dieses Wort gibt deiner Zeitfrage einen klaren Ort, wenn du deinen nächsten Weg durch die Stadt planst.', en: 'This word gives your time question a clear place when you plan your next errand through the city.' } },
    distractors: ['가게가 작아요', '문이 열려요'], placeholderCaption: { de: 'Ein kleiner Laden mit einer Uhr über der Tür bereitet sich auf den Abend vor.', en: 'A small shop with a clock above the door prepares for the evening.' }, songMood: 'a useful opening-hours question before evening', visualNotes: 'Neighborhood shop entrance, visible clock and open sign, staff tidying in early evening.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'hyudaepon-surineun-da-dwaesseoyo', title: { de: 'Ist das Handy fertig?', en: 'Is the phone ready?' },
    situation: { de: 'Du kommst zum Reparaturladen zurück, um dein Handy abzuholen. Du fragst, ob die Reparatur schon fertig ist.', en: 'You return to the repair shop to collect your phone. Ask whether the repair is already finished.' },
    pedagogicalGoal: 'Mit 다 됐어요? den Abschluss einer Dienstleistung knapp erfragen.',
    targetText: '제 휴대폰 수리는 이제 다 됐어요?', baseText: { de: 'Ist die Reparatur meines Handys jetzt fertig?', en: 'Is my phone repair finished now?' },
    chunks: [{ targetText: '제 휴대폰 수리는', baseText: { de: 'was die Reparatur meines Handys angeht', en: 'as for my phone repair' } }, { targetText: '이제 다', baseText: { de: 'jetzt schon ganz', en: 'all done now' } }, { targetText: '됐어요?', baseText: { de: 'ist sie fertig?', en: 'is it finished?' } }],
    terms: [{ targetText: '제', baseText: { de: 'mein', en: 'my' } }, { targetText: '휴대폰', baseText: { de: 'Handy', en: 'mobile phone' } }, { targetText: '수리는', baseText: { de: 'was die Reparatur angeht', en: 'as for the repair' } }, { targetText: '이제', baseText: { de: 'jetzt; inzwischen', en: 'now; by now' } }, { targetText: '다 됐어요', baseText: { de: 'ist ganz fertig', en: 'is all finished' } }],
    recall: { before: '제 휴대폰 수리는 이제 다 ', answer: '됐어요', after: '?', fallbackChoices: ['됐어요', '있어요', '가요', '와요'] }, speakRequired: ['휴대폰', '수리는', '됐어요'],
    sceneCaption: { de: 'Der Mitarbeiter erkennt dich am Tresen und fragt: „휴대폰 찾으러 오셨어요?“', en: 'The worker recognizes you at the counter and asks: “휴대폰 찾으러 오셨어요?”' },
    trophyWord: { word: '수리', meaning: { de: 'Reparatur', en: 'repair' }, example: '수리는 다 됐어요?', whyThisWord: { de: 'Dieses Wort lässt dich gezielt nach dem Ergebnis der Arbeit fragen, statt nur allgemein nach deinem Handy zu suchen.', en: 'This word lets you ask specifically about the result of the work instead of only asking generally for your phone.' } },
    distractors: ['휴대폰이 커요', '수리가 비싸요'], placeholderCaption: { de: 'Ein repariertes Handy liegt auf einem Abholcounter neben einem kleinen Fertig-Schild.', en: 'A repaired phone rests on a collection counter beside a small ready sign.' }, songMood: 'a satisfying repair pickup at the counter', visualNotes: 'Repair shop pickup counter, polished phone ready, small completion sign, relieved customer.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'geureom-geumyoire-olgeyo', title: { de: 'Dann komme ich Freitag wieder', en: 'Then I will return Friday' },
    situation: { de: 'Die Mitarbeiterin erklärt, wann deine Sache fertig sein wird. Du schließt die Erledigung freundlich ab und sagst, wann du wiederkommst.', en: 'The attendant explains when your item will be ready. Close the errand politely and say when you will return.' },
    pedagogicalGoal: 'Mit -(으)ㄹ게요 eine eigene Entscheidung für den nächsten Schritt ausdrücken und höflich danken.',
    targetText: '그럼 금요일에 다시 올게요. 감사합니다.', baseText: { de: 'Dann komme ich am Freitag wieder. Danke.', en: 'Then I will come back on Friday. Thank you.' },
    chunks: [{ targetText: '그럼 금요일에', baseText: { de: 'dann am Freitag', en: 'then on Friday' } }, { targetText: '다시 올게요.', baseText: { de: 'komme ich wieder.', en: 'I will come back.' } }, { targetText: '감사합니다.', baseText: { de: 'Danke.', en: 'Thank you.' } }],
    terms: [{ targetText: '그럼', baseText: { de: 'dann; in dem Fall', en: 'then; in that case' } }, { targetText: '금요일에', baseText: { de: 'am Freitag', en: 'on Friday' } }, { targetText: '다시', baseText: { de: 'wieder', en: 'again' } }, { targetText: '올게요', baseText: { de: 'ich komme wieder', en: 'I will come back' } }, { targetText: '감사합니다', baseText: { de: 'danke', en: 'thank you' } }],
    recall: { before: '그럼 금요일에 다시 ', answer: '올게요', after: '. 감사합니다.', fallbackChoices: ['올게요', '먹을게요', '마실게요', '읽을게요'] }, speakRequired: ['금요일에', '올게요', '감사합니다'],
    sceneCaption: { de: 'Die Mitarbeiterin gibt dir den Abholschein und sagt: „금요일에 찾으러 오세요.“', en: 'The attendant hands you the collection slip and says: “금요일에 찾으러 오세요.”' },
    trophyWord: { word: '금요일', meaning: { de: 'Freitag', en: 'Friday' }, example: '금요일에 다시 올게요.', whyThisWord: { de: 'Der Wochentag lässt dich einen praktischen nächsten Schritt klar abschließen und zuverlässig ankündigen.', en: 'This weekday lets you close a practical next step clearly and announce it reliably.' } },
    distractors: ['다시 만나요', '오늘 갈게요'], placeholderCaption: { de: 'Ein Abholschein und eine freundliche Verabschiedung schließen eine Reihe kleiner Erledigungen ab.', en: 'A collection slip and a friendly goodbye close a series of small errands.' }, songMood: 'a grateful clean finish to a useful errand', visualNotes: 'Service counter, collection slip, warm goodbye, orderly wrap-up of city errands.',
  }),
]

export const KOREAN_A2_PRACTICAL_6_LESSONS: GuidedLessonDefinition[] = makeKoreanA2PracticalLessons(
  GUIDED_TODAY_PATH_KOREAN_A2_SIX_METADATA, koreanA2Practical6Inputs,
  { de: 'Du hast Koreanisch A2 Praxis 6 abgeschlossen und kannst alltägliche Dienste sicher nutzen und Erledigungen abschließen.', en: 'You have completed Korean A2 Practical 6 and can confidently use everyday services and finish errands.' },
)

export const GUIDED_TODAY_PATH_KOREAN_A2_SEVEN_METADATA: GuidedPathMetadata = {
  id: 'korean-a2-practical-7', title: 'Korean A2 Practical 7', shortTitle: 'A2 Practical 7',
  subtitle: { de: 'Empfehlungen verstehen, Orte beschreiben und eigene Tipps geben', en: 'Understanding recommendations, describing places, and giving your own tips' },
  level: 'A2', baseLanguage: 'German', targetLanguage: 'Korean', estimatedMinutes: 5,
}

const koreanA2Practical7Inputs: KoreanA2LessonInput[] = [
  makeKoreanA2CompactLesson({
    slug: 'chucheonhae-juseyo', title: { de: 'Was empfehlen Sie?', en: 'What do you recommend?' },
    situation: { de: 'In einem kleinen Restaurant fragst du die Bedienung, welches Gericht besonders gut ist.', en: 'At a small restaurant, ask the server which dish is especially good.' },
    pedagogicalGoal: 'Mit 제일 und 추천해 주세요 nach einer klaren Essensempfehlung fragen.',
    targetText: '뭐가 제일 맛있어요? 추천해 주세요.', baseText: { de: 'Was ist hier am leckersten? Bitte empfehlen Sie mir etwas.', en: 'What is the tastiest thing here? Please recommend something.' },
    chunks: [{ targetText: '뭐가 제일 맛있어요?', baseText: { de: 'Was ist am leckersten?', en: 'What is the most delicious?' } }, { targetText: '추천해', baseText: { de: 'empfehlen Sie', en: 'recommend' } }, { targetText: '주세요.', baseText: { de: 'bitte.', en: 'please.' } }],
    terms: [{ targetText: '뭐가', baseText: { de: 'was mit Subjektpartikel', en: 'what with subject particle' } }, { targetText: '제일', baseText: { de: 'am meisten; am besten', en: 'most; best' } }, { targetText: '맛있어요', baseText: { de: 'es ist lecker', en: 'it is delicious' } }, { targetText: '추천해', baseText: { de: 'empfehlen Sie', en: 'recommend' } }, { targetText: '주세요', baseText: { de: 'bitte geben Sie mir', en: 'please give me' } }],
    recall: { before: '뭐가 제일 맛있어요? ', answer: '추천해', after: ' 주세요.', fallbackChoices: ['추천해', '먹어', '마셔', '앉아'] }, speakRequired: ['제일', '맛있어요', '추천해'],
    sceneCaption: { de: 'Die Bedienung hält die Speisekarte auf und fragt: „처음이에요?“', en: 'The server holds open the menu and asks: “처음이에요?”' },
    trophyWord: { word: '추천', meaning: { de: 'Empfehlung', en: 'recommendation' }, example: '친구가 이 식당을 추천해요.', whyThisWord: { de: 'Mit diesem Wort holst du dir schnell einen lokalen Tipp, wenn eine Karte viele unbekannte Gerichte hat.', en: 'This word quickly gets you a local tip when a menu has many unfamiliar dishes.' } },
    distractors: ['메뉴를 봐요', '물을 주세요'], placeholderCaption: { de: 'Eine geöffnete Speisekarte liegt vor dir, während die Bedienung freundlich wartet.', en: 'An open menu lies in front of you while the server waits helpfully.' }, songMood: 'a curious first taste at a welcoming neighborhood restaurant', visualNotes: 'Warm Korean restaurant, open menu, attentive server, and a learner ready to discover a local favorite.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'geugeollo-halkkeyo', title: { de: 'Dann nehme ich das', en: 'Then I will have that' },
    situation: { de: 'Die Bedienung hat ein Gericht empfohlen. Du nimmst den Vorschlag dankbar an.', en: 'The server has recommended a dish. Accept the suggestion gratefully.' },
    pedagogicalGoal: 'Eine Empfehlung mit 그걸로 할게요 freundlich annehmen.',
    targetText: '그럼 그걸로 할게요. 정말 감사합니다.', baseText: { de: 'Dann nehme ich das. Vielen Dank.', en: 'Then I will have that. Thank you very much.' },
    chunks: [{ targetText: '그럼 그걸로', baseText: { de: 'dann das', en: 'then that' } }, { targetText: '할게요.', baseText: { de: 'nehme ich.', en: 'I will have it.' } }, { targetText: '정말 감사합니다.', baseText: { de: 'Vielen Dank.', en: 'Thank you very much.' } }],
    terms: [{ targetText: '그럼', baseText: { de: 'dann; in dem Fall', en: 'then; in that case' } }, { targetText: '그걸로', baseText: { de: 'mit dem da; das nehme ich', en: 'with that one; I will take that' } }, { targetText: '할게요', baseText: { de: 'das nehme ich', en: 'I will have it' } }, { targetText: '정말', baseText: { de: 'wirklich; sehr', en: 'really; very' } }, { targetText: '감사합니다', baseText: { de: 'danke', en: 'thank you' } }],
    recall: { before: '그럼 그걸로 ', answer: '할게요', after: '. 정말 감사합니다.', fallbackChoices: ['할게요', '먹을게요', '마실게요', '쉴게요'] }, speakRequired: ['그걸로', '할게요', '감사합니다'],
    sceneCaption: { de: 'Die Bedienung lächelt und sagt: „이게 제일 잘 나가요.“', en: 'The server smiles and says: “이게 제일 잘 나가요.”' },
    trophyWord: { word: '정말', meaning: { de: 'wirklich; sehr', en: 'really; very' }, example: '정말 맛있어요.', whyThisWord: { de: 'Dieses kleine Wort macht deinen Dank oder dein Urteil wärmer, ohne das Gespräch länger und komplizierter zu machen.', en: 'This small word makes your thanks or opinion warmer without making the conversation longer or more complicated.' } },
    distractors: ['다른 걸로 해요', '메뉴를 더 봐요'], placeholderCaption: { de: 'Die Bedienung zeigt auf ein empfohlenes Gericht auf der Karte und lächelt zustimmend.', en: 'The server points to a recommended dish on the menu and smiles in agreement.' }, songMood: 'a confident choice after a trusted recommendation', visualNotes: 'Restaurant table, menu with one highlighted dish, welcoming server and a clear appreciative decision.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'sanchaekhagi-joheun-dongne', title: { de: 'Ein Viertel zum Spazieren', en: 'A neighborhood for a walk' },
    situation: { de: 'Du möchtest nach dem Essen spazieren gehen und fragst eine Einheimische nach einem passenden Viertel.', en: 'You want to take a walk after eating and ask a local for a suitable neighborhood.' },
    pedagogicalGoal: 'Mit 산책하기 좋은 nach einem Viertel fragen, das sich gut zum Spazieren eignet.',
    targetText: '이 근처에 산책하기 좋은 동네가 어디예요?', baseText: { de: 'Welches Viertel hier in der Nähe eignet sich gut zum Spazieren?', en: 'Which neighborhood around here is good for a walk?' },
    chunks: [{ targetText: '이 근처에', baseText: { de: 'hier in der Nähe', en: 'around here' } }, { targetText: '산책하기 좋은', baseText: { de: 'gut zum Spazierengehen', en: 'good for taking a walk' } }, { targetText: '동네가 어디예요?', baseText: { de: 'welches Viertel ist das?', en: 'which neighborhood is it?' } }],
    terms: [{ targetText: '근처에', baseText: { de: 'in der Nähe', en: 'nearby' } }, { targetText: '산책하기', baseText: { de: 'spazieren zu gehen', en: 'taking a walk' } }, { targetText: '좋은', baseText: { de: 'gutes; geeignetes', en: 'good; suitable' } }, { targetText: '동네가', baseText: { de: 'Viertel mit Subjektpartikel', en: 'neighborhood with subject particle' } }, { targetText: '어디예요', baseText: { de: 'wo ist es?', en: 'where is it?' } }],
    recall: { before: '이 근처에 산책하기 좋은 ', answer: '동네가', after: ' 어디예요?', fallbackChoices: ['동네가', '가게가', '공원이', '음식이'] }, speakRequired: ['근처에', '산책하기', '동네가'],
    sceneCaption: { de: 'Eine Passantin schaut auf die Bäume am Fluss und fragt: „산책하고 싶어요?“', en: 'A passerby looks toward the trees by the river and asks: “산책하고 싶어요?”' },
    trophyWord: { word: '산책', meaning: { de: 'Spaziergang', en: 'walk; stroll' }, example: '저녁에 산책해요.', whyThisWord: { de: 'Dieses Wort öffnet dir einfache Gespräche über ruhige Wege und kleine Pausen in der Stadt.', en: 'This word opens simple conversations about quiet routes and small breaks in the city.' } },
    distractors: ['버스로 가요', '사진을 봐요'], placeholderCaption: { de: 'Ein baumbestandener Weg am Fluss beginnt gleich hinter einer belebten Straße.', en: 'A tree-lined path by the river begins just beyond a busy street.' }, songMood: 'an easy evening walk waiting beyond the busy blocks', visualNotes: 'Seoul side street opening toward a leafy riverside path, local passerby giving a helpful direction.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'gang-yeope-isseoyo', title: { de: 'Neben dem Fluss', en: 'Beside the river' },
    situation: { de: 'Jemand fragt, wie der empfohlene Park ist. Du beschreibst ihn kurz und klar.', en: 'Someone asks what the recommended park is like. Describe it briefly and clearly.' },
    pedagogicalGoal: 'Mit -고 zwei einfache Beschreibungen verbinden und einen Ort mit 옆에 angeben.',
    targetText: '공원이 조용하고 강 옆에 있어요.', baseText: { de: 'Der Park ist ruhig und liegt neben dem Fluss.', en: 'The park is quiet and is beside the river.' },
    chunks: [{ targetText: '공원이 조용하고', baseText: { de: 'der Park ist ruhig und', en: 'the park is quiet and' } }, { targetText: '강 옆에', baseText: { de: 'neben dem Fluss', en: 'beside the river' } }, { targetText: '있어요.', baseText: { de: 'er liegt dort.', en: 'it is there.' } }],
    terms: [{ targetText: '공원이', baseText: { de: 'Park mit Subjektpartikel', en: 'park with subject particle' } }, { targetText: '조용하고', baseText: { de: 'ruhig und', en: 'quiet and' } }, { targetText: '강', baseText: { de: 'Fluss', en: 'river' } }, { targetText: '옆에', baseText: { de: 'neben', en: 'beside' } }, { targetText: '있어요', baseText: { de: 'es ist; es gibt', en: 'it is; there is' } }],
    recall: { before: '공원이 ', answer: '조용하고', after: ' 강 옆에 있어요.', fallbackChoices: ['조용하고', '크고', '작고', '예쁘고'] }, speakRequired: ['공원이', '조용하고', '옆에'],
    sceneCaption: { de: 'Dein Freund sieht auf die Karte und fragt: „그 공원은 어때요?“', en: 'Your friend looks at the map and asks: “그 공원은 어때요?”' },
    trophyWord: { word: '강', meaning: { de: 'Fluss', en: 'river' }, example: '강 옆에 공원이 있어요.', whyThisWord: { de: 'Der Fluss ist ein einprägsamer Orientierungspunkt, mit dem du einen empfohlenen Ort anschaulich beschreiben kannst.', en: 'The river is a memorable landmark that helps you describe a recommended place vividly.' } },
    distractors: ['사람이 많아요', '문 앞에 있어요'], placeholderCaption: { de: 'Eine ruhige Parkbank steht unter Bäumen direkt neben einem breiten Flussweg.', en: 'A quiet park bench sits under trees beside a broad riverside path.' }, songMood: 'a quiet riverside recommendation in the city', visualNotes: 'Leafy Seoul park beside the Han River, simple bench, open water and a calm walking route.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'ingi-inneun-kape', title: { de: 'Ein beliebtes Café', en: 'A popular cafe' },
    situation: { de: 'Nach dem Spaziergang möchtest du ein besonders beliebtes Café in der Nähe finden.', en: 'After the walk, you want to find a particularly popular cafe nearby.' },
    pedagogicalGoal: 'Mit 제일 und 인기 있는 nach einem besonders beliebten Café fragen.',
    targetText: '이 근처에서 제일 인기 있는 카페가 어디예요?', baseText: { de: 'Wo ist hier in der Nähe das beliebteste Café?', en: 'Where is the most popular cafe around here?' },
    chunks: [{ targetText: '이 근처에서', baseText: { de: 'hier in der Nähe', en: 'around here' } }, { targetText: '제일 인기 있는', baseText: { de: 'das beliebteste', en: 'the most popular' } }, { targetText: '카페가 어디예요?', baseText: { de: 'welches Café ist das?', en: 'which cafe is it?' } }],
    terms: [{ targetText: '근처에서', baseText: { de: 'in der Nähe', en: 'nearby' } }, { targetText: '제일', baseText: { de: 'am meisten; am besten', en: 'most; best' } }, { targetText: '인기', baseText: { de: 'Beliebtheit', en: 'popularity' } }, { targetText: '있는', baseText: { de: 'das es hat; mit', en: 'that has; with' } }, { targetText: '카페가', baseText: { de: 'Café mit Subjektpartikel', en: 'cafe with subject particle' } }],
    recall: { before: '이 근처에서 제일 ', answer: '인기', after: ' 있는 카페가 어디예요?', fallbackChoices: ['인기', '시간', '친구', '음식'] }, speakRequired: ['근처에서', '인기', '카페가'],
    sceneCaption: { de: 'Eine Ladenbesitzerin zeigt die Straße hinunter und sagt: „카페가 많아요.“', en: 'A shop owner points down the street and says: “카페가 많아요.”' },
    trophyWord: { word: '인기', meaning: { de: 'Beliebtheit', en: 'popularity' }, example: '이 카페는 인기가 많아요.', whyThisWord: { de: 'Damit kannst du gezielt nach dem Ort fragen, den Einheimische besonders gern besuchen.', en: 'It lets you ask directly for the place that locals especially like to visit.' } },
    distractors: ['커피를 마셔요', '가게가 작아요'], placeholderCaption: { de: 'Mehrere Cafés liegen an einer kleinen Straße, eines davon ist deutlich belebt.', en: 'Several cafes line a small street, and one of them is clearly busy.' }, songMood: 'a lively local cafe hunt after a peaceful walk', visualNotes: 'Compact Seoul cafe street, one popular storefront with warm lights and a small queue of locals.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'chingu-seonmul-mwoga-joayo', title: { de: 'Ein Geschenk für einen Freund', en: 'A gift for a friend' },
    situation: { de: 'Du möchtest deiner neuen Freundin ein kleines Geschenk mitbringen und fragst im Laden nach einer Idee.', en: 'You want to bring your new friend a small gift and ask for an idea in a shop.' },
    pedagogicalGoal: 'Mit 선물로 und 제일 nach einer passenden Geschenkidee fragen.',
    targetText: '친구 선물로 뭐가 제일 좋아요?', baseText: { de: 'Was ist am besten als Geschenk für einen Freund?', en: 'What is best as a gift for a friend?' },
    chunks: [{ targetText: '친구 선물로', baseText: { de: 'als Geschenk für einen Freund', en: 'as a gift for a friend' } }, { targetText: '뭐가 제일', baseText: { de: 'was am besten', en: 'what is best' } }, { targetText: '좋아요?', baseText: { de: 'ist gut?', en: 'is good?' } }],
    terms: [{ targetText: '친구', baseText: { de: 'Freund; Freundin', en: 'friend' } }, { targetText: '선물로', baseText: { de: 'als Geschenk', en: 'as a gift' } }, { targetText: '뭐가', baseText: { de: 'was mit Subjektpartikel', en: 'what with subject particle' } }, { targetText: '제일', baseText: { de: 'am besten', en: 'best' } }, { targetText: '좋아요', baseText: { de: 'es ist gut', en: 'it is good' } }],
    recall: { before: '친구 ', answer: '선물로', after: ' 뭐가 제일 좋아요?', fallbackChoices: ['선물로', '음식으로', '커피로', '사진으로'] }, speakRequired: ['친구', '선물로', '제일'],
    sceneCaption: { de: 'Die Verkäuferin betrachtet die kleinen Mitbringsel und fragt: „누구 선물이에요?“', en: 'The shop clerk looks over the small gifts and asks: “누구 선물이에요?”' },
    trophyWord: { word: '선물', meaning: { de: 'Geschenk', en: 'gift' }, example: '친구에게 선물을 줘요.', whyThisWord: { de: 'Dieses Wort hilft dir, eine persönliche Aufmerksamkeit zu finden und dabei nach einem einfachen Tipp zu fragen.', en: 'This word helps you find a personal present while asking for a simple recommendation.' } },
    distractors: ['가방을 사요', '카드를 써요'], placeholderCaption: { de: 'Kleine Geschenkideen liegen ordentlich auf einem Holztisch in einem freundlichen Laden.', en: 'Small gift ideas are neatly arranged on a wooden table in a friendly shop.' }, songMood: 'a thoughtful small gift chosen with local advice', visualNotes: 'Independent Seoul gift shop, small stationery and wrapped items, kind clerk offering an idea.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'hanguk-eumsikjeom-eodiyeyo', title: { de: 'Ein koreanisches Restaurant', en: 'A Korean restaurant' },
    situation: { de: 'Vor deinem Hotel suchst du ein koreanisches Restaurant, das du zu Fuß erreichen kannst.', en: 'Outside your hotel, you are looking for a Korean restaurant you can reach on foot.' },
    pedagogicalGoal: 'Einen Ort mit 호텔 근처에 konkret eingrenzen und nach einem Restaurant fragen.',
    targetText: '호텔 근처에 한국 음식점이 있어요?', baseText: { de: 'Gibt es in der Nähe des Hotels ein koreanisches Restaurant?', en: 'Is there a Korean restaurant near the hotel?' },
    chunks: [{ targetText: '호텔 근처에', baseText: { de: 'in der Nähe des Hotels', en: 'near the hotel' } }, { targetText: '한국 음식점이', baseText: { de: 'ein koreanisches Restaurant', en: 'a Korean restaurant' } }, { targetText: '있어요?', baseText: { de: 'gibt es?', en: 'is there?' } }],
    terms: [{ targetText: '호텔', baseText: { de: 'Hotel', en: 'hotel' } }, { targetText: '근처에', baseText: { de: 'in der Nähe', en: 'nearby' } }, { targetText: '한국', baseText: { de: 'Korea; koreanisch', en: 'Korea; Korean' } }, { targetText: '음식점이', baseText: { de: 'Restaurant mit Subjektpartikel', en: 'restaurant with subject particle' } }, { targetText: '있어요', baseText: { de: 'es gibt; ist vorhanden', en: 'there is; it exists' } }],
    recall: { before: '호텔 근처에 한국 ', answer: '음식점이', after: ' 있어요?', fallbackChoices: ['음식점이', '공원이', '가게가', '카페가'] }, speakRequired: ['호텔', '음식점이', '있어요'],
    sceneCaption: { de: 'Der Mitarbeiter an der Rezeption zeigt auf die Umgebungskarte und fragt: „한국 음식 좋아하세요?“', en: 'The receptionist points to the neighborhood map and asks: “한국 음식 좋아하세요?”' },
    trophyWord: { word: '음식점', meaning: { de: 'Restaurant', en: 'restaurant' }, example: '이 음식점은 조용해요.', whyThisWord: { de: 'Der Begriff macht aus deiner allgemeinen Suche eine klare Frage nach einem Ort zum Essen.', en: 'This term turns a general search into a clear question about a place to eat.' } },
    distractors: ['호텔이 커요', '지도를 봐요'], placeholderCaption: { de: 'An der Hotelrezeption liegt eine Karte mit mehreren kleinen Restaurants in Laufnähe.', en: 'A map at the hotel reception shows several small restaurants within walking distance.' }, songMood: 'a welcoming local dinner search near the hotel', visualNotes: 'Hotel reception map, highlighted nearby Korean restaurant, friendly staff and an evening city glow.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'bame-gwangjangeul-chucheonhaeyo', title: { de: 'Der Platz bei Nacht', en: 'The square at night' },
    situation: { de: 'Ein Besucher fragt dich nach einem schönen Ort für den Abend. Jetzt gibst du selbst eine Empfehlung.', en: 'A visitor asks you for a beautiful place in the evening. Now you give a recommendation yourself.' },
    pedagogicalGoal: 'Einen Ort mit 밤에 beschreiben und mit 꼭 가 보세요 empfehlen.',
    targetText: '밤에 광장이 정말 예뻐요. 꼭 가 보세요.', baseText: { de: 'Nachts ist der Platz wirklich schön. Gehen Sie unbedingt hin.', en: 'The square is really pretty at night. Be sure to go.' },
    chunks: [{ targetText: '밤에 광장이', baseText: { de: 'nachts der Platz', en: 'at night, the square' } }, { targetText: '정말 예뻐요.', baseText: { de: 'ist wirklich schön.', en: 'is really pretty.' } }, { targetText: '꼭 가 보세요.', baseText: { de: 'gehen Sie unbedingt hin.', en: 'be sure to go.' } }],
    terms: [{ targetText: '밤에', baseText: { de: 'nachts', en: 'at night' } }, { targetText: '광장이', baseText: { de: 'Platz mit Subjektpartikel', en: 'square with subject particle' } }, { targetText: '정말', baseText: { de: 'wirklich', en: 'really' } }, { targetText: '예뻐요', baseText: { de: 'es ist schön', en: 'it is pretty' } }, { targetText: '꼭', baseText: { de: 'unbedingt', en: 'definitely; be sure to' } }],
    recall: { before: '밤에 ', answer: '광장이', after: ' 정말 예뻐요. 꼭 가 보세요.', fallbackChoices: ['광장이', '공원이', '가게가', '거리가'] }, speakRequired: ['광장이', '예뻐요', '꼭'],
    sceneCaption: { de: 'Ein Besucher hält sein Handy mit einer Stadtkarte hoch und fragt: „밤에 어디가 좋아요?“', en: 'A visitor holds up a phone with a city map and asks: “밤에 어디가 좋아요?”' },
    trophyWord: { word: '광장', meaning: { de: 'Platz', en: 'square; plaza' }, example: '광장에 사람이 많아요.', whyThisWord: { de: 'Mit diesem Stadtwort kannst du einen konkreten Abendtipp geben, statt nur allgemein von einer schönen Gegend zu sprechen.', en: 'This city word lets you give a concrete evening tip instead of only speaking generally about a nice area.' } },
    distractors: ['버스를 타요', '호텔에 있어요'], placeholderCaption: { de: 'Ein offener Platz leuchtet am Abend zwischen niedrigen Gebäuden und kleinen Cafés.', en: 'An open square glows in the evening between low buildings and small cafes.' }, songMood: 'a glowing evening recommendation shared with a visitor', visualNotes: 'Seoul plaza at blue hour, soft lights, small cafes around the edge, learner confidently pointing it out.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'eumsikhago-eoullyeoyo', title: { de: 'Was passt dazu?', en: 'What goes with it?' },
    situation: { de: 'Du hast ein Gericht ausgewählt und fragst nach einem Getränk oder einer Beilage, die gut dazu passt.', en: 'You have chosen a dish and ask for a drink or side that goes well with it.' },
    pedagogicalGoal: 'Mit 이 음식하고 und 잘 어울려요? nach einer passenden Kombination fragen.',
    targetText: '이 음식하고 뭐가 제일 잘 어울려요?', baseText: { de: 'Was passt am besten zu diesem Essen?', en: 'What goes best with this food?' },
    chunks: [{ targetText: '이 음식하고', baseText: { de: 'mit diesem Essen', en: 'with this food' } }, { targetText: '뭐가 제일', baseText: { de: 'was am besten', en: 'what best' } }, { targetText: '잘 어울려요?', baseText: { de: 'passt gut dazu?', en: 'goes well with it?' } }],
    terms: [{ targetText: '음식하고', baseText: { de: 'mit dem Essen', en: 'with the food' } }, { targetText: '뭐가', baseText: { de: 'was mit Subjektpartikel', en: 'what with subject particle' } }, { targetText: '제일', baseText: { de: 'am besten', en: 'best' } }, { targetText: '잘', baseText: { de: 'gut', en: 'well' } }, { targetText: '어울려요', baseText: { de: 'es passt dazu', en: 'it goes well with it' } }],
    recall: { before: '이 음식하고 뭐가 제일 잘 ', answer: '어울려요', after: '?', fallbackChoices: ['어울려요', '맛있어요', '가까워요', '조용해요'] }, speakRequired: ['음식하고', '제일', '어울려요'],
    sceneCaption: { de: 'Die Bedienung stellt dein Gericht hin und fragt: „음료도 필요하세요?“', en: 'The server sets down your dish and asks: “음료도 필요하세요?”' },
    trophyWord: { word: '어울려요', meaning: { de: 'es passt gut dazu', en: 'it goes well with it' }, example: '이 옷하고 잘 어울려요.', whyThisWord: { de: 'Mit diesem Verb fragst du natürlich nach einer passenden Kombination, ob bei Essen, Kleidung oder kleinen Geschenken.', en: 'This verb lets you naturally ask about a good match, whether for food, clothes, or small gifts.' } },
    distractors: ['물을 마셔요', '밥을 더 주세요'], placeholderCaption: { de: 'Ein warmes Gericht steht auf dem Tisch, daneben ist Platz für ein empfohlenes Getränk.', en: 'A warm dish sits on the table with room beside it for a recommended drink.' }, songMood: 'a relaxed meal made better by one good pairing', visualNotes: 'Restaurant table with a Korean dish, empty spot for a drink, attentive server ready to suggest a pairing.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'chucheoni-choegoyeyo', title: { de: 'Die beste Empfehlung', en: 'The best recommendation' },
    situation: { de: 'Nach dem Essen bedankst du dich für den Tipp und sagst, dass die Empfehlung genau richtig war.', en: 'After the meal, thank the server for the tip and say the recommendation was exactly right.' },
    pedagogicalGoal: 'Mit 최고예요 eine Empfehlung begeistert bewerten.',
    targetText: '정말 맛있어요. 이 집이 최고예요.', baseText: { de: 'Es ist wirklich lecker. Dieses Lokal ist das Beste.', en: 'It is really delicious. This place is the best.' },
    chunks: [{ targetText: '정말 맛있어요.', baseText: { de: 'Es ist wirklich lecker.', en: 'It is really delicious.' } }, { targetText: '이 집이', baseText: { de: 'dieses Lokal', en: 'this place' } }, { targetText: '최고예요.', baseText: { de: 'ist das Beste.', en: 'is the best.' } }],
    terms: [{ targetText: '정말', baseText: { de: 'wirklich', en: 'really' } }, { targetText: '맛있어요', baseText: { de: 'es ist lecker', en: 'it is delicious' } }, { targetText: '집', baseText: { de: 'Haus; hier: Lokal', en: 'house; here: this place' } }, { targetText: '최고예요', baseText: { de: 'es ist das Beste', en: 'it is the best' } }, { targetText: '음식', baseText: { de: 'Essen; Gericht', en: 'food; dish' } }],
    recall: { before: '정말 맛있어요. 이 집이 ', answer: '최고예요', after: '.', fallbackChoices: ['최고예요', '필요해요', '작아요', '비싸요'] }, speakRequired: ['맛있어요', '집이', '최고예요'],
    sceneCaption: { de: 'Die Bedienung räumt den Tisch ab und fragt: „음식은 어떠세요?“', en: 'The server clears the table and asks: “음식은 어떠세요?”' },
    trophyWord: { word: '최고예요', meaning: { de: 'es ist das Beste', en: 'it is the best' }, example: '이 카페가 최고예요.', whyThisWord: { de: 'Dieser Ausdruck gibt einem gelungenen Tipp einen starken, aber alltäglichen Abschluss.', en: 'This expression gives a successful tip a strong but everyday conclusion.' } },
    distractors: ['음식이 차가워요', '물을 더 주세요'], placeholderCaption: { de: 'Leere Teller und ein freundliches Lächeln der Bedienung zeigen, dass das Essen ein Erfolg war.', en: 'Empty plates and the server’s friendly smile show that the meal was a success.' }, songMood: 'a happy verdict after a trusted local recommendation', visualNotes: 'Cozy restaurant after a satisfying meal, cleared plates, appreciative learner and pleased server.',
  }),
]

export const KOREAN_A2_PRACTICAL_7_LESSONS: GuidedLessonDefinition[] = makeKoreanA2PracticalLessons(
  GUIDED_TODAY_PATH_KOREAN_A2_SEVEN_METADATA, koreanA2Practical7Inputs,
  { de: 'Du hast Koreanisch A2 Praxis 7 abgeschlossen und kannst Empfehlungen erfragen, Orte beschreiben und eigene Tipps geben.', en: 'You have completed Korean A2 Practical 7 and can ask for recommendations, describe places, and give your own tips.' },
)

export const GUIDED_TODAY_PATH_KOREAN_A2_EIGHT_METADATA: GuidedPathMetadata = {
  id: 'korean-a2-practical-8', title: 'Korean A2 Practical 8', shortTitle: 'A2 Practical 8',
  subtitle: { de: 'Über Gefühle, Wetter und den Alltag mit neuen Freunden sprechen', en: 'Talking about feelings, weather, and everyday life with new friends' },
  level: 'A2', baseLanguage: 'German', targetLanguage: 'Korean', estimatedMinutes: 5,
}

const koreanA2Practical8Inputs: KoreanA2LessonInput[] = [
  makeKoreanA2CompactLesson({
    slug: 'jinjjayo-gippeoyo', title: { de: 'Das sind tolle Nachrichten', en: 'That is great news' },
    situation: { de: 'Deine Freundin erzählt dir eine gute Nachricht. Du reagierst überrascht und freust dich mit ihr.', en: 'Your friend tells you good news. React with surprise and share her happiness.' },
    pedagogicalGoal: 'Mit den festen Reaktionen 진짜요? und 잘됐네요! freundlich auf gute Nachrichten reagieren.',
    targetText: '진짜요? 와, 잘됐네요! 저도 기뻐요.', baseText: { de: 'Wirklich? Wow, das ist toll! Ich freue mich auch.', en: 'Really? Wow, that is great! I am happy too.' },
    chunks: [{ targetText: '진짜요?', baseText: { de: 'Wirklich?', en: 'Really?' } }, { targetText: '와, 잘됐네요!', baseText: { de: 'Wow, das ist toll!', en: 'Wow, that is great!' } }, { targetText: '저도 기뻐요.', baseText: { de: 'Ich freue mich auch.', en: 'I am happy too.' } }],
    terms: [{ targetText: '진짜요', baseText: { de: 'wirklich?', en: 'really?' } }, { targetText: '와', baseText: { de: 'wow', en: 'wow' } }, { targetText: '잘됐네요', baseText: { de: 'das ist toll gelaufen', en: 'that worked out well' } }, { targetText: '저도', baseText: { de: 'ich auch', en: 'me too' } }, { targetText: '기뻐요', baseText: { de: 'ich freue mich', en: 'I am happy' } }],
    recall: { before: '진짜요? 와, 잘됐네요! 저도 ', answer: '기뻐요', after: '.', fallbackChoices: ['기뻐요', '바빠요', '추워요', '작아요'] }, speakRequired: ['진짜요', '잘됐네요', '기뻐요'],
    sceneCaption: { de: 'Deine Freundin strahlt und sagt: „새 일을 시작해요!“', en: 'Your friend beams and says: “새 일을 시작해요!”' },
    trophyWord: { word: '기뻐요', meaning: { de: 'ich freue mich', en: 'I am happy' }, example: '친구가 와서 기뻐요.', whyThisWord: { de: 'Mit diesem Wort teilst du die Freude einer anderen Person direkt und freundlich.', en: 'This word lets you share another person’s happiness directly and warmly.' } },
    distractors: ['집에 가요', '커피를 마셔요'], placeholderCaption: { de: 'Zwei Freundinnen stehen mit leuchtenden Gesichtern vor einem kleinen Café.', en: 'Two friends stand with bright faces outside a small cafe.' }, songMood: 'a bright burst of shared good news between friends', visualNotes: 'Two adult friends on a Seoul side street, excited smiles, one sharing a happy update near a cafe.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'yeoreum-gataeyo', title: { de: 'Wie im Sommer', en: 'Like summer' },
    situation: { de: 'Du triffst deine Freundin draußen an einem ungewöhnlich heißen Tag und kommentierst das Wetter.', en: 'You meet your friend outside on an unusually hot day and comment on the weather.' },
    pedagogicalGoal: 'Mit 진짜 und 같아요 das ungewöhnlich heiße Wetter locker beschreiben.',
    targetText: '오늘 진짜 더워요. 여름 같아요.', baseText: { de: 'Heute ist es wirklich heiß. Es ist wie Sommer.', en: 'It is really hot today. It feels like summer.' },
    chunks: [{ targetText: '오늘 진짜', baseText: { de: 'heute wirklich', en: 'today, really' } }, { targetText: '더워요.', baseText: { de: 'ist es heiß.', en: 'it is hot.' } }, { targetText: '여름 같아요.', baseText: { de: 'es ist wie Sommer.', en: 'it feels like summer.' } }],
    terms: [{ targetText: '오늘', baseText: { de: 'heute', en: 'today' } }, { targetText: '진짜', baseText: { de: 'wirklich; echt', en: 'really; truly' } }, { targetText: '더워요', baseText: { de: 'es ist heiß', en: 'it is hot' } }, { targetText: '여름', baseText: { de: 'Sommer', en: 'summer' } }, { targetText: '같아요', baseText: { de: 'es scheint wie', en: 'it seems like' } }],
    recall: { before: '오늘 진짜 더워요. ', answer: '여름', after: ' 같아요.', fallbackChoices: ['여름', '겨울', '가방', '공원'] }, speakRequired: ['진짜', '더워요', '여름'],
    sceneCaption: { de: 'Deine Freundin wischt sich die Stirn und fragt: „오늘 너무 덥죠?“', en: 'Your friend wipes her forehead and asks: “오늘 너무 덥죠?”' },
    trophyWord: { word: '여름', meaning: { de: 'Sommer', en: 'summer' }, example: '여름에 비가 많이 와요.', whyThisWord: { de: 'Die Jahreszeit gibt deinem kleinen Wettergespräch sofort ein klares Bild.', en: 'The season gives your small weather conversation an immediate, clear image.' } },
    distractors: ['비가 와요', '창문을 열어요'], placeholderCaption: { de: 'Helles Sonnenlicht fällt auf eine heiße Straße, während zwei Freunde im Schatten stehen.', en: 'Bright sunlight falls on a hot street while two friends stand in the shade.' }, songMood: 'a sunlit hot-day chat with a friend', visualNotes: 'Summer-bright Seoul street, friends seeking shade, glowing pavement and an easy weather comment.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'neutge-jasseoyo', title: { de: 'Spät ins Bett gegangen', en: 'Went to bed late' },
    situation: { de: 'Deine Freundin bemerkt, dass du müde aussiehst. Du erklärst kurz, dass du gestern spät ins Bett gegangen bist.', en: 'Your friend notices that you look tired. Briefly explain that you went to bed late yesterday.' },
    pedagogicalGoal: 'Ein bereits bekanntes Erlebnis mit 어제 늦게 잤어요 natürlich wieder aufgreifen.',
    targetText: '좀 피곤해요. 어제 늦게 잤어요.', baseText: { de: 'Ich bin etwas müde. Gestern bin ich spät ins Bett gegangen.', en: 'I am a little tired. I went to bed late yesterday.' },
    chunks: [{ targetText: '좀 피곤해요.', baseText: { de: 'Ich bin etwas müde.', en: 'I am a little tired.' } }, { targetText: '어제 늦게', baseText: { de: 'gestern spät', en: 'yesterday, late' } }, { targetText: '잤어요.', baseText: { de: 'bin ich schlafen gegangen.', en: 'I went to sleep.' } }],
    terms: [{ targetText: '좀', baseText: { de: 'ein bisschen', en: 'a little' } }, { targetText: '피곤해요', baseText: { de: 'ich bin müde', en: 'I am tired' } }, { targetText: '어제', baseText: { de: 'gestern', en: 'yesterday' } }, { targetText: '늦게', baseText: { de: 'spät', en: 'late' } }, { targetText: '잤어요', baseText: { de: 'ich habe geschlafen', en: 'I slept' } }],
    recall: { before: '좀 피곤해요. 어제 늦게 ', answer: '잤어요', after: '.', fallbackChoices: ['잤어요', '갔어요', '샀어요', '봤어요'] }, speakRequired: ['피곤해요', '늦게', '잤어요'],
    sceneCaption: { de: 'Deine Freundin sieht dich aufmerksam an und fragt: „오늘 피곤해요?“', en: 'Your friend looks at you attentively and asks: “오늘 피곤해요?”' },
    trophyWord: { word: '늦게', meaning: { de: 'spät', en: 'late' }, example: '어제 늦게 집에 왔어요.', whyThisWord: { de: 'Dieses Zeitwort erklärt eine Müdigkeit knapp und natürlich, ohne viele Einzelheiten erzählen zu müssen.', en: 'This time word explains tiredness briefly and naturally without needing to give many details.' } },
    distractors: ['커피를 마셔요', '집이 멀어요'], placeholderCaption: { de: 'Weiches Morgenlicht fällt auf einen Kaffeebecher und ein leicht müdes Gesicht.', en: 'Soft morning light falls on a coffee cup and a slightly tired face.' }, songMood: 'a soft morning confession after a late night', visualNotes: 'Gentle morning cafe scene, sleepy learner holding coffee while a caring friend checks in.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'ibeon-jue-bappayo', title: { de: 'Eine volle Woche', en: 'A busy week' },
    situation: { de: 'Deine Freundin fragt, warum du in letzter Zeit so wenig Zeit hast. Du beschreibst deine volle Woche.', en: 'Your friend asks why you have had so little time lately. Describe your busy week.' },
    pedagogicalGoal: 'Mit 이번 주에 und 정말 die aktuelle Belastung einfach beschreiben.',
    targetText: '이번 주에 저는 정말 바빠요.', baseText: { de: 'Diese Woche bin ich wirklich beschäftigt.', en: 'I am really busy this week.' },
    chunks: [{ targetText: '이번 주에', baseText: { de: 'diese Woche', en: 'this week' } }, { targetText: '저는 정말', baseText: { de: 'ich wirklich', en: 'I am really' } }, { targetText: '바빠요.', baseText: { de: 'bin beschäftigt.', en: 'busy.' } }],
    terms: [{ targetText: '이번', baseText: { de: 'diese', en: 'this' } }, { targetText: '주에', baseText: { de: 'in der Woche', en: 'in the week' } }, { targetText: '저는', baseText: { de: 'was mich angeht', en: 'as for me' } }, { targetText: '정말', baseText: { de: 'wirklich', en: 'really' } }, { targetText: '바빠요', baseText: { de: 'ich bin beschäftigt', en: 'I am busy' } }],
    recall: { before: '이번 주에 저는 정말 ', answer: '바빠요', after: '.', fallbackChoices: ['바빠요', '추워요', '작아요', '멀어요'] }, speakRequired: ['이번', '정말', '바빠요'],
    sceneCaption: { de: 'Deine Freundin schaut in ihren Kalender und fragt: „요즘 시간이 없어요?“', en: 'Your friend looks at her calendar and asks: “요즘 시간이 없어요?”' },
    trophyWord: { word: '바빠요', meaning: { de: 'ich bin beschäftigt', en: 'I am busy' }, example: '오늘은 조금 바빠요.', whyThisWord: { de: 'Damit kannst du deine knappe Zeit direkt erklären und trotzdem freundlich im Gespräch bleiben.', en: 'It lets you explain your limited time directly while staying friendly in the conversation.' } },
    distractors: ['지금 만나요', '집에 있어요'], placeholderCaption: { de: 'Ein voller Wochenkalender liegt neben einer Tasche auf einem kleinen Tisch.', en: 'A full weekly calendar lies beside a bag on a small table.' }, songMood: 'a brisk weekday chat between friends with full schedules', visualNotes: 'Cafe table with a busy paper calendar, friend listening kindly, everyday Seoul workweek energy.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'usan-eopsseoyo', title: { de: 'Schon wieder Regen', en: 'Rain again' },
    situation: { de: 'Als ihr euch treffen wollt, beginnt es wieder zu regnen. Du hast keinen Schirm dabei.', en: 'Just as you plan to meet, it starts raining again. You do not have an umbrella with you.' },
    pedagogicalGoal: 'Mit 또 und 없어요 eine kleine Wetterpanne einfach ausdrücken.',
    targetText: '또 비가 와요. 우산이 없어요.', baseText: { de: 'Es regnet schon wieder. Ich habe keinen Regenschirm.', en: 'It is raining again. I do not have an umbrella.' },
    chunks: [{ targetText: '또 비가 와요.', baseText: { de: 'Es regnet schon wieder.', en: 'It is raining again.' } }, { targetText: '우산이', baseText: { de: 'ein Regenschirm mit Subjektpartikel', en: 'umbrella with subject particle' } }, { targetText: '없어요.', baseText: { de: 'habe ich nicht.', en: 'I do not have one.' } }],
    terms: [{ targetText: '또', baseText: { de: 'wieder', en: 'again' } }, { targetText: '비가', baseText: { de: 'Regen mit Subjektpartikel', en: 'rain with subject particle' } }, { targetText: '와요', baseText: { de: 'er kommt; es regnet', en: 'it comes; it rains' } }, { targetText: '우산이', baseText: { de: 'Regenschirm mit Subjektpartikel', en: 'umbrella with subject particle' } }, { targetText: '없어요', baseText: { de: 'es gibt nicht; ich habe nicht', en: 'there is not; I do not have' } }],
    recall: { before: '또 비가 와요. ', answer: '우산이', after: ' 없어요.', fallbackChoices: ['우산이', '가방이', '사진이', '음식이'] }, speakRequired: ['비가', '우산이', '없어요'],
    sceneCaption: { de: 'Deine Freundin schaut in den Regen und fragt: „우산 있어요?“', en: 'Your friend looks into the rain and asks: “우산 있어요?”' },
    trophyWord: { word: '우산', meaning: { de: 'Regenschirm', en: 'umbrella' }, example: '우산을 가져가요.', whyThisWord: { de: 'Das Wort für Regenschirm ist im Seouler Alltag mit seinen plötzlichen Schauern besonders nützlich.', en: 'The word for umbrella is especially useful in everyday Seoul life with its sudden showers.' } },
    distractors: ['택시를 타요', '문을 닫아요'], placeholderCaption: { de: 'Regen fällt auf einen Gehweg, während zwei Freunde unter einem Vordach stehen.', en: 'Rain falls on a sidewalk while two friends stand under an awning.' }, songMood: 'a rainy little setback met with friendly calm', visualNotes: 'Rainy Seoul pavement, two friends beneath a shop awning, one empty hand and no umbrella.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'aigo-andoennaeyo', title: { de: 'Das tut mir leid', en: 'That is too bad' },
    situation: { de: 'Deine Freundin erzählt dir, dass ihr Plan nicht geklappt hat. Du reagierst mit Mitgefühl.', en: 'Your friend tells you that her plan did not work out. Respond with sympathy.' },
    pedagogicalGoal: 'Mit dem festen Ausdruck 아이고, 안됐네요 mitfühlend reagieren.',
    targetText: '아이고, 안됐네요. 저도 정말 아쉬워요.', baseText: { de: 'Ach, das ist schade. Ich finde es auch wirklich enttäuschend.', en: 'Oh, that is too bad. I find it really disappointing too.' },
    chunks: [{ targetText: '아이고, 안됐네요.', baseText: { de: 'Ach, das ist schade.', en: 'Oh, that is too bad.' } }, { targetText: '저도 정말', baseText: { de: 'ich auch wirklich', en: 'I also really' } }, { targetText: '아쉬워요.', baseText: { de: 'finde es schade.', en: 'find it disappointing.' } }],
    terms: [{ targetText: '아이고', baseText: { de: 'ach je', en: 'oh dear' } }, { targetText: '안됐네요', baseText: { de: 'das ist schade', en: 'that is too bad' } }, { targetText: '저도', baseText: { de: 'ich auch', en: 'me too' } }, { targetText: '정말', baseText: { de: 'wirklich', en: 'really' } }, { targetText: '아쉬워요', baseText: { de: 'es ist bedauerlich', en: 'it is disappointing' } }],
    recall: { before: '아이고, 안됐네요. 저도 정말 ', answer: '아쉬워요', after: '.', fallbackChoices: ['아쉬워요', '바빠요', '추워요', '작아요'] }, speakRequired: ['아이고', '안됐네요', '아쉬워요'],
    sceneCaption: { de: 'Deine Freundin seufzt und sagt: „약속이 취소됐어요.“', en: 'Your friend sighs and says: “약속이 취소됐어요.”' },
    trophyWord: { word: '아쉬워요', meaning: { de: 'es ist schade', en: 'it is disappointing' }, example: '못 가서 아쉬워요.', whyThisWord: { de: 'Dieses Wort ist eine freundliche, alltägliche Art, auf eine kleine Enttäuschung zu reagieren.', en: 'This word is a friendly, everyday way to respond to a small disappointment.' } },
    distractors: ['커피가 있어요', '영화를 봐요'], placeholderCaption: { de: 'Zwei Freunde sitzen an einem Fensterplatz, einer davon schaut etwas enttäuscht auf das Handy.', en: 'Two friends sit by a window, one looking slightly disappointed at a phone.' }, songMood: 'a gentle sympathetic response on a quiet afternoon', visualNotes: 'Soft cafe window scene, friend sharing disappointing news, listener offering warm empathy.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'yojeum-jal-jinaeyo', title: { de: 'In letzter Zeit geht es gut', en: 'Doing well lately' },
    situation: { de: 'Ihr trefft euch nach einigen Tagen wieder. Deine Freundin fragt, wie es dir insgesamt geht.', en: 'You meet again after several days. Your friend asks how things are going overall.' },
    pedagogicalGoal: 'Mit 요즘 und 아주 über das eigene Befinden im Alltag sprechen.',
    targetText: '네, 요즘 아주 잘 지내요.', baseText: { de: 'Ja, mir geht es in letzter Zeit sehr gut.', en: 'Yes, I am doing very well these days.' },
    chunks: [{ targetText: '네, 요즘', baseText: { de: 'Ja, in letzter Zeit', en: 'Yes, lately' } }, { targetText: '아주 잘', baseText: { de: 'sehr gut', en: 'very well' } }, { targetText: '지내요.', baseText: { de: 'geht es mir.', en: 'I am doing.' } }],
    terms: [{ targetText: '요즘', baseText: { de: 'in letzter Zeit', en: 'lately' } }, { targetText: '아주', baseText: { de: 'sehr', en: 'very' } }, { targetText: '잘', baseText: { de: 'gut', en: 'well' } }, { targetText: '지내요', baseText: { de: 'ich verbringe die Zeit; mir geht es', en: 'I spend my time; I am doing' } }, { targetText: '네', baseText: { de: 'ja', en: 'yes' } }],
    recall: { before: '네, 요즘 아주 잘 ', answer: '지내요', after: '.', fallbackChoices: ['지내요', '먹어요', '가요', '마셔요'] }, speakRequired: ['요즘', '아주', '지내요'],
    sceneCaption: { de: 'Deine Freundin setzt sich zu dir und fragt: „요즘 어떻게 지내요?“', en: 'Your friend sits down with you and asks: “요즘 어떻게 지내요?”' },
    trophyWord: { word: '요즘', meaning: { de: 'in letzter Zeit', en: 'lately; these days' }, example: '요즘 한국어를 공부해요.', whyThisWord: { de: 'Dieses Zeitwort hilft dir, locker von deinem aktuellen Alltag zu erzählen.', en: 'This time word helps you talk casually about your current everyday life.' } },
    distractors: ['집이 멀어요', '음식을 먹어요'], placeholderCaption: { de: 'Zwei Freunde sitzen entspannt mit Getränken an einem kleinen Fenstertisch.', en: 'Two friends sit comfortably with drinks at a small window table.' }, songMood: 'an easy catch-up between friends after a few busy days', visualNotes: 'Warm neighborhood cafe, two friends reconnecting over drinks, relaxed body language and afternoon light.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'wa-jaldoenneyo', title: { de: 'Was für gute Neuigkeiten', en: 'What good news' },
    situation: { de: 'Deine Freundin erzählt dir noch eine gute Nachricht. Du reagierst begeistert und benennst sie als schöne Nachricht.', en: 'Your friend shares another piece of good news. React enthusiastically and call it lovely news.' },
    pedagogicalGoal: 'Mit dem festen Ausdruck 와, 잘됐네요! und 소식 auf gute Neuigkeiten reagieren.',
    targetText: '와, 잘됐네요! 정말 좋은 소식이에요.', baseText: { de: 'Wow, das ist toll! Das sind wirklich gute Nachrichten.', en: 'Wow, that is great! That is really good news.' },
    chunks: [{ targetText: '와, 잘됐네요!', baseText: { de: 'Wow, das ist toll!', en: 'Wow, that is great!' } }, { targetText: '정말 좋은', baseText: { de: 'wirklich gute', en: 'really good' } }, { targetText: '소식이에요.', baseText: { de: 'Nachrichten.', en: 'news.' } }],
    terms: [{ targetText: '와', baseText: { de: 'wow', en: 'wow' } }, { targetText: '잘됐네요', baseText: { de: 'das ist toll gelaufen', en: 'that worked out well' } }, { targetText: '정말', baseText: { de: 'wirklich', en: 'really' } }, { targetText: '좋은', baseText: { de: 'gute', en: 'good' } }, { targetText: '소식이에요', baseText: { de: 'es sind Nachrichten', en: 'it is news' } }],
    recall: { before: '와, 잘됐네요! 정말 좋은 ', answer: '소식이에요', after: '.', fallbackChoices: ['소식이에요', '음식이에요', '가방이에요', '사진이에요'] }, speakRequired: ['잘됐네요', '좋은', '소식이에요'],
    sceneCaption: { de: 'Deine Freundin hält ihr Handy hoch und sagt: „다음 주에 가족이 서울에 와요!“', en: 'Your friend holds up her phone and says: “다음 주에 가족이 서울에 와요!”' },
    trophyWord: { word: '소식', meaning: { de: 'Nachricht', en: 'news' }, example: '좋은 소식이 있어요.', whyThisWord: { de: 'Mit diesem Wort kannst du eine Information als etwas Persönliches und Positives aufnehmen.', en: 'This word lets you receive information as something personal and positive.' } },
    distractors: ['영화를 봐요', '지하철을 타요'], placeholderCaption: { de: 'Ein Handy mit einer glücklichen Nachricht liegt zwischen zwei lächelnden Freunden auf dem Tisch.', en: 'A phone with a happy message lies between two smiling friends on the table.' }, songMood: 'a sparkling reaction to happy personal news', visualNotes: 'Cafe table with phone showing a happy family message, two friends smiling with genuine excitement.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'achim-e-chuwoyo', title: { de: 'Ein kalter Morgen', en: 'A cold morning' },
    situation: { de: 'An einem kühlen Morgen wartest du draußen auf deine Freundin und wünschst dir einen heißen Kaffee.', en: 'On a chilly morning, you wait outside for your friend and wish for hot coffee.' },
    pedagogicalGoal: 'Mit 너무 und 필요해요 ein starkes Wettergefühl und einen einfachen Wunsch ausdrücken.',
    targetText: '아침에 너무 추워요. 따뜻한 커피가 필요해요.', baseText: { de: 'Morgens ist es so kalt. Ich brauche einen warmen Kaffee.', en: 'It is so cold in the morning. I need a warm coffee.' },
    chunks: [{ targetText: '아침에 너무', baseText: { de: 'morgens so', en: 'in the morning, so' } }, { targetText: '추워요.', baseText: { de: 'ist es kalt.', en: 'it is cold.' } }, { targetText: '따뜻한 커피가 필요해요.', baseText: { de: 'ich brauche einen warmen Kaffee.', en: 'I need a warm coffee.' } }],
    terms: [{ targetText: '아침에', baseText: { de: 'am Morgen', en: 'in the morning' } }, { targetText: '너무', baseText: { de: 'zu; sehr', en: 'so; very' } }, { targetText: '추워요', baseText: { de: 'es ist kalt', en: 'it is cold' } }, { targetText: '따뜻한', baseText: { de: 'warmer', en: 'warm' } }, { targetText: '필요해요', baseText: { de: 'ich brauche', en: 'I need' } }],
    recall: { before: '아침에 너무 ', answer: '추워요', after: '. 따뜻한 커피가 필요해요.', fallbackChoices: ['추워요', '바빠요', '작아요', '멀어요'] }, speakRequired: ['아침에', '추워요', '필요해요'],
    sceneCaption: { de: 'Deine Freundin kommt mit kalten Händen an und sagt: „오늘 아침에 추워요.“', en: 'Your friend arrives with cold hands and says: “오늘 아침에 추워요.”' },
    trophyWord: { word: '추워요', meaning: { de: 'es ist kalt', en: 'it is cold' }, example: '밖이 추워요.', whyThisWord: { de: 'Dieser Ausdruck verbindet das Wetter sofort mit einer praktischen Idee wie einem warmen Getränk.', en: 'This expression immediately connects the weather with a practical idea such as a warm drink.' } },
    distractors: ['창문을 닫아요', '버스를 타요'], placeholderCaption: { de: 'Dampf steigt aus zwei warmen Kaffeebechern an einer kühlen Bushaltestelle auf.', en: 'Steam rises from two warm coffee cups at a chilly bus stop.' }, songMood: 'a crisp cold morning softened by warm coffee', visualNotes: 'Cool Seoul morning at a bus stop, steaming coffee cups, friends meeting with scarves and relaxed smiles.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'joheun-haruyeoyo', title: { de: 'Ein guter Tag', en: 'A good day' },
    situation: { de: 'Am Ende eines schönen Tages schaut ihr auf euren kleinen Ausflug zurück und stimmt euch zu.', en: 'At the end of a lovely day, look back on your small outing together and agree.' },
    pedagogicalGoal: 'Mit 정말 und 그렇죠? einen gelungenen Tag freundlich abrunden.',
    targetText: '오늘 정말 좋은 하루예요. 그렇죠?', baseText: { de: 'Heute ist wirklich ein guter Tag. Oder?', en: 'Today is really a good day. Right?' },
    chunks: [{ targetText: '오늘 정말', baseText: { de: 'heute wirklich', en: 'today, really' } }, { targetText: '좋은 하루예요.', baseText: { de: 'ist ein guter Tag.', en: 'is a good day.' } }, { targetText: '그렇죠?', baseText: { de: 'nicht wahr?', en: 'right?' } }],
    terms: [{ targetText: '오늘', baseText: { de: 'heute', en: 'today' } }, { targetText: '정말', baseText: { de: 'wirklich', en: 'really' } }, { targetText: '좋은', baseText: { de: 'guter', en: 'good' } }, { targetText: '하루예요', baseText: { de: 'es ist ein Tag', en: 'it is a day' } }, { targetText: '그렇죠', baseText: { de: 'nicht wahr?', en: 'right?' } }],
    recall: { before: '오늘 정말 좋은 ', answer: '하루예요', after: '. 그렇죠?', fallbackChoices: ['하루예요', '음식이에요', '가방이에요', '사진이에요'] }, speakRequired: ['정말', '하루예요', '그렇죠'],
    sceneCaption: { de: 'Deine Freundin blickt auf die Abendlichter und sagt: „오늘 재미있어요.“', en: 'Your friend looks at the evening lights and says: “오늘 재미있어요.”' },
    trophyWord: { word: '하루', meaning: { de: 'Tag', en: 'day' }, example: '오늘은 좋은 하루예요.', whyThisWord: { de: 'Mit diesem Wort kannst du viele kleine Erlebnisse zu einem warmen Tagesabschluss zusammenfassen.', en: 'This word lets you gather many small experiences into a warm end-of-day thought.' } },
    distractors: ['집에 가요', '비가 와요'], placeholderCaption: { de: 'Abendliche Lichter spiegeln sich in einem ruhigen Fluss, während zwei Freunde nebeneinander stehen.', en: 'Evening lights reflect in a quiet river while two friends stand side by side.' }, songMood: 'a warm contented close to a day with a friend', visualNotes: 'Seoul riverside at dusk, city lights, two adult friends reflecting on a pleasant day together.',
  }),
]

export const KOREAN_A2_PRACTICAL_8_LESSONS: GuidedLessonDefinition[] = makeKoreanA2PracticalLessons(
  GUIDED_TODAY_PATH_KOREAN_A2_EIGHT_METADATA, koreanA2Practical8Inputs,
  { de: 'Du hast Koreanisch A2 Praxis 8 abgeschlossen und kannst freundlich über Wetter, Gefühle und deinen Alltag sprechen.', en: 'You have completed Korean A2 Practical 8 and can talk warmly about weather, feelings, and everyday life.' },
)

export const GUIDED_TODAY_PATH_KOREAN_A2_NINE_METADATA: GuidedPathMetadata = {
  id: 'korean-a2-practical-9', title: 'Korean A2 Practical 9', shortTitle: 'A2 Practical 9',
  subtitle: { de: 'Kleine Probleme ruhig erklären und höflich lösen', en: 'Explaining small problems calmly and resolving them politely' },
  level: 'A2', baseLanguage: 'German', targetLanguage: 'Korean', estimatedMinutes: 5,
}

const koreanA2Practical9Inputs: KoreanA2LessonInput[] = [
  makeKoreanA2CompactLesson({
    slug: 'syawogi-gojang-nasseoyo', title: { de: 'Die Dusche ist kaputt', en: 'The shower is broken' },
    situation: { de: 'An der Hotelrezeption erklärst du ruhig, dass die Dusche nicht funktioniert, und bittest um Hilfe.', en: 'At hotel reception, calmly explain that the shower does not work and ask for help.' },
    pedagogicalGoal: 'Mit 고장 났어요 ein Problem in der Vergangenheit nennen und mit 안 돼요 eine aktuelle Störung erklären.',
    targetText: '샤워기가 고장 났어요. 지금 안 돼요. 도와주세요.', baseText: { de: 'Die Dusche ist kaputtgegangen. Jetzt funktioniert sie nicht. Bitte helfen Sie mir.', en: 'The shower broke. It does not work now. Please help me.' },
    chunks: [{ targetText: '샤워기가', baseText: { de: 'die Dusche', en: 'the shower' } }, { targetText: '고장 났어요.', baseText: { de: 'ist kaputtgegangen.', en: 'broke down.' } }, { targetText: '지금 안 돼요.', baseText: { de: 'jetzt funktioniert sie nicht.', en: 'it does not work now.' } }, { targetText: '도와주세요.', baseText: { de: 'Bitte helfen Sie mir.', en: 'Please help me.' } }],
    terms: [{ targetText: '샤워기가', baseText: { de: 'Dusche mit Subjektpartikel', en: 'shower with subject particle' } }, { targetText: '고장', baseText: { de: 'Defekt', en: 'breakdown; fault' } }, { targetText: '났어요', baseText: { de: 'ist kaputtgegangen', en: 'broke down' } }, { targetText: '지금', baseText: { de: 'jetzt', en: 'now' } }, { targetText: '안 돼요', baseText: { de: 'es funktioniert nicht', en: 'it does not work' } }, { targetText: '도와주세요', baseText: { de: 'helfen Sie mir bitte', en: 'please help me' } }],
    recall: { before: '샤워기가 고장 ', answer: '났어요', after: '. 지금 안 돼요. 도와주세요.', fallbackChoices: ['났어요', '갔어요', '샀어요', '봤어요'] }, speakRequired: ['샤워기가', '났어요', '도와주세요'],
    sceneCaption: { de: 'Die Rezeptionistin blickt auf und fragt: „무엇을 도와드릴까요?“', en: 'The receptionist looks up and asks: “무엇을 도와드릴까요?”' },
    trophyWord: { word: '샤워기', meaning: { de: 'Dusche', en: 'shower' }, example: '샤워기가 안 돼요.', whyThisWord: { de: 'Dieses Wort macht ein Hotelproblem sofort konkret, damit die Rezeption schnell die richtige Hilfe schicken kann.', en: 'This word makes a hotel problem immediately specific so reception can send the right help quickly.' } },
    distractors: ['방이 커요', '물을 마셔요'], placeholderCaption: { de: 'Eine Hotelrezeptionistin greift zum Telefon, während ein Zimmerschlüssel auf dem Tresen liegt.', en: 'A hotel receptionist reaches for the phone while a room key lies on the counter.' }, songMood: 'a calm hotel repair request that is quickly handled', visualNotes: 'Hotel front desk, receptionist calling maintenance, room key card and learner calmly explaining a problem.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'samsip-bun-jumun', title: { de: 'Die Bestellung kommt nicht', en: 'The order has not arrived' },
    situation: { de: 'Im Restaurant wartest du schon eine Weile auf dein Essen. Du nennst die Bestellung und bittest um eine Prüfung.', en: 'At a restaurant, you have been waiting for your food for a while. Mention the order and ask for it to be checked.' },
    pedagogicalGoal: 'Eine vergangene Bestellung mit 주문했어요 nennen und das aktuelle Problem höflich prüfen lassen.',
    targetText: '삼십 분 전에 주문했어요. 음식이 아직 안 와요. 확인해 주세요.', baseText: { de: 'Ich habe vor dreißig Minuten bestellt. Das Essen kommt noch nicht. Bitte prüfen Sie das.', en: 'I ordered thirty minutes ago. The food has not come yet. Please check it.' },
    chunks: [{ targetText: '삼십 분 전에', baseText: { de: 'vor dreißig Minuten', en: 'thirty minutes ago' } }, { targetText: '주문했어요.', baseText: { de: 'habe ich bestellt.', en: 'I ordered.' } }, { targetText: '음식이 아직 안 와요.', baseText: { de: 'das Essen kommt noch nicht.', en: 'the food has not come yet.' } }, { targetText: '확인해 주세요.', baseText: { de: 'Bitte prüfen Sie das.', en: 'Please check it.' } }],
    terms: [{ targetText: '삼십', baseText: { de: 'dreißig', en: 'thirty' } }, { targetText: '분 전에', baseText: { de: 'vor Minuten', en: 'minutes ago' } }, { targetText: '주문했어요', baseText: { de: 'ich habe bestellt', en: 'I ordered' } }, { targetText: '음식이', baseText: { de: 'Essen mit Subjektpartikel', en: 'food with subject particle' } }, { targetText: '아직', baseText: { de: 'noch', en: 'yet' } }, { targetText: '확인해', baseText: { de: 'prüfen Sie', en: 'check' } }],
    recall: { before: '삼십 분 전에 ', answer: '주문했어요', after: '. 음식이 아직 안 와요. 확인해 주세요.', fallbackChoices: ['주문했어요', '갔어요', '샀어요', '봤어요'] }, speakRequired: ['주문했어요', '음식이', '확인해'],
    sceneCaption: { de: 'Die Bedienung kommt an deinen Tisch und fragt: „더 필요한 거 있으세요?“', en: 'The server comes to your table and asks: “더 필요한 거 있으세요?”' },
    trophyWord: { word: '삼십', meaning: { de: 'dreißig', en: 'thirty' }, example: '삼십 분 기다려요.', whyThisWord: { de: 'Mit dieser Zahl kannst du eine Wartezeit ruhig und konkret benennen, ohne dich zu beschweren.', en: 'This number lets you state a wait time calmly and specifically without complaining.' } },
    distractors: ['물을 더 주세요', '메뉴를 봐요'], placeholderCaption: { de: 'Ein Bestellzettel liegt auf einem Restauranttisch neben einem noch leeren Platz für das Essen.', en: 'An order slip lies on a restaurant table beside an empty space where the food should be.' }, songMood: 'a patient restaurant check handled with quiet confidence', visualNotes: 'Restaurant table, order slip, attentive server checking details, learner asking politely without frustration.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'waipai-an-dwaeyo', title: { de: 'Kein WLAN im Zimmer', en: 'No Wi-Fi in the room' },
    situation: { de: 'Du bist gestern im Hotel angekommen. Im Zimmer funktioniert das WLAN nicht, also bittest du an der Rezeption um Hilfe.', en: 'You arrived at the hotel yesterday. The Wi-Fi does not work in your room, so you ask reception for help.' },
    pedagogicalGoal: 'Eine Ankunft in der Vergangenheit mit einem aktuellen technischen Problem verbinden.',
    targetText: '어제 호텔에 왔어요. 방에서 와이파이가 안 돼요. 도와주세요.', baseText: { de: 'Gestern bin ich im Hotel angekommen. Im Zimmer funktioniert das WLAN nicht. Bitte helfen Sie mir.', en: 'I arrived at the hotel yesterday. The Wi-Fi does not work in the room. Please help me.' },
    chunks: [{ targetText: '어제 호텔에 왔어요.', baseText: { de: 'Gestern bin ich im Hotel angekommen.', en: 'I arrived at the hotel yesterday.' } }, { targetText: '방에서 와이파이가', baseText: { de: 'im Zimmer das WLAN', en: 'in the room, the Wi-Fi' } }, { targetText: '안 돼요.', baseText: { de: 'funktioniert nicht.', en: 'does not work.' } }, { targetText: '도와주세요.', baseText: { de: 'Bitte helfen Sie mir.', en: 'Please help me.' } }],
    terms: [{ targetText: '어제', baseText: { de: 'gestern', en: 'yesterday' } }, { targetText: '호텔에', baseText: { de: 'zum Hotel', en: 'to the hotel' } }, { targetText: '왔어요', baseText: { de: 'ich bin gekommen', en: 'I came' } }, { targetText: '방에서', baseText: { de: 'im Zimmer', en: 'in the room' } }, { targetText: '와이파이가', baseText: { de: 'WLAN mit Subjektpartikel', en: 'Wi-Fi with subject particle' } }, { targetText: '안 돼요', baseText: { de: 'es funktioniert nicht', en: 'it does not work' } }],
    recall: { before: '어제 호텔에 ', answer: '왔어요', after: '. 방에서 와이파이가 안 돼요. 도와주세요.', fallbackChoices: ['왔어요', '갔어요', '샀어요', '봤어요'] }, speakRequired: ['호텔에', '와이파이가', '도와주세요'],
    sceneCaption: { de: 'Die Rezeptionistin öffnet die Netzwerkliste und fragt: „방은 괜찮으세요?“', en: 'The receptionist opens the network list and asks: “방은 괜찮으세요?”' },
    trophyWord: { word: '와이파이', meaning: { de: 'WLAN', en: 'Wi-Fi' }, example: '와이파이가 있어요?', whyThisWord: { de: 'Dieses geläufige Lehnwort hilft dir, einen wichtigen Hotelservice direkt und verständlich anzusprechen.', en: 'This familiar loanword helps you address an important hotel service directly and clearly.' } },
    distractors: ['휴대폰을 봐요', '문을 닫아요'], placeholderCaption: { de: 'Eine Rezeptionistin prüft die WLAN-Einstellungen auf einem Bildschirm neben einem Hotelschlüssel.', en: 'A receptionist checks Wi-Fi settings on a screen beside a hotel key.' }, songMood: 'a small tech problem resolved at a helpful hotel desk', visualNotes: 'Hotel desk with network screen and key card, calm receptionist helping a traveler reconnect.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'jigabeul-ireobeoryeosseoyo', title: { de: 'Die Geldbörse verloren', en: 'Lost wallet' },
    situation: { de: 'Du bemerkst, dass deine Geldbörse fehlt, und bittest eine Mitarbeiterin, mit dir zu suchen.', en: 'You notice that your wallet is missing and ask an attendant to look for it with you.' },
    pedagogicalGoal: 'Mit 잃어버렸어요 einen Verlust nennen und mit 같이 찾아 주세요 höflich um Hilfe bitten.',
    targetText: '지갑을 잃어버렸어요. 같이 찾아 주세요.', baseText: { de: 'Ich habe meine Geldbörse verloren. Bitte suchen Sie mit mir.', en: 'I lost my wallet. Please help me look for it.' },
    chunks: [{ targetText: '지갑을', baseText: { de: 'Geldbörse mit Objektpartikel', en: 'wallet with object particle' } }, { targetText: '잃어버렸어요.', baseText: { de: 'habe ich verloren.', en: 'I lost.' } }, { targetText: '같이 찾아 주세요.', baseText: { de: 'bitte suchen Sie mit mir.', en: 'please look together with me.' } }],
    terms: [{ targetText: '지갑을', baseText: { de: 'Geldbörse mit Objektpartikel', en: 'wallet with object particle' } }, { targetText: '잃어버렸어요', baseText: { de: 'ich habe verloren', en: 'I lost' } }, { targetText: '지금', baseText: { de: 'jetzt', en: 'now' } }, { targetText: '같이', baseText: { de: 'zusammen', en: 'together' } }, { targetText: '찾아 주세요', baseText: { de: 'bitte suchen Sie', en: 'please look for it' } }],
    recall: { before: '지갑을 ', answer: '잃어버렸어요', after: '. 같이 찾아 주세요.', fallbackChoices: ['잃어버렸어요', '갔어요', '샀어요', '봤어요'] }, speakRequired: ['지갑을', '잃어버렸어요', '같이'],
    sceneCaption: { de: 'Die Mitarbeiterin bemerkt deine Unruhe und fragt: „무슨 일 있어요?“', en: 'The attendant notices your worry and asks: “무슨 일 있어요?”' },
    trophyWord: { word: '지갑', meaning: { de: 'Geldbörse', en: 'wallet' }, example: '지갑이 여기 있어요.', whyThisWord: { de: 'Dieses Wort ist bei einem kleinen Verlust besonders wichtig und macht es leicht, sofort um passende Hilfe zu bitten.', en: 'This word is especially important during a small loss and makes it easy to get the right help quickly.' } },
    distractors: ['가방을 사요', '커피를 마셔요'], placeholderCaption: { de: 'Eine freundliche Mitarbeiterin hilft dir, unter einem Tisch und neben einer Bank nachzusehen.', en: 'A friendly attendant helps you look under a table and beside a bench.' }, songMood: 'a reassuring search solved together with calm support', visualNotes: 'Cafe or lobby search scene, helpful attendant and learner checking a table area without panic.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'ajik-an-wayo', title: { de: 'Das Taxi ist noch nicht da', en: 'The taxi is not here yet' },
    situation: { de: 'Du hast beim Taxiunternehmen angerufen, aber das Taxi ist noch nicht angekommen. Der Mitarbeiter bietet ein anderes Taxi an.', en: 'You called the taxi company, but the taxi has not arrived yet. The attendant offers another taxi.' },
    pedagogicalGoal: 'Eine vergangene Kontaktaufnahme mit 전화했어요 und ein aktuelles Problem mit 아직 안 와요 verbinden.',
    targetText: '택시 회사에 전화했어요. 아직 안 와요. 다른 택시 불러 주세요.', baseText: { de: 'Ich habe beim Taxiunternehmen angerufen. Es ist noch nicht da. Bitte rufen Sie ein anderes Taxi.', en: 'I called the taxi company. It has not come yet. Please call another taxi.' },
    chunks: [{ targetText: '택시 회사에', baseText: { de: 'beim Taxiunternehmen', en: 'to the taxi company' } }, { targetText: '전화했어요.', baseText: { de: 'habe ich angerufen.', en: 'I called.' } }, { targetText: '아직 안 와요.', baseText: { de: 'es kommt noch nicht.', en: 'it has not come yet.' } }, { targetText: '다른 택시 불러 주세요.', baseText: { de: 'Bitte rufen Sie ein anderes Taxi.', en: 'Please call another taxi.' } }],
    terms: [{ targetText: '택시', baseText: { de: 'Taxi', en: 'taxi' } }, { targetText: '회사에', baseText: { de: 'bei der Firma', en: 'to the company' } }, { targetText: '전화했어요', baseText: { de: 'ich habe angerufen', en: 'I called' } }, { targetText: '아직', baseText: { de: 'noch', en: 'yet' } }, { targetText: '다른', baseText: { de: 'anderer; andere', en: 'another; different' } }, { targetText: '불러', baseText: { de: 'rufen Sie', en: 'call' } }],
    recall: { before: '택시 회사에 전화했어요. ', answer: '아직', after: ' 안 와요. 다른 택시 불러 주세요.', fallbackChoices: ['아직', '정말', '아주', '조금'] }, speakRequired: ['전화했어요', '아직', '택시'],
    sceneCaption: { de: 'Der Mitarbeiter am Hoteleingang fragt: „택시가 아직 안 왔어요?“', en: 'The attendant at the hotel entrance asks: “택시가 아직 안 왔어요?”' },
    trophyWord: { word: '아직', meaning: { de: 'noch', en: 'yet; still' }, example: '아직 버스가 안 와요.', whyThisWord: { de: 'Dieses Wort erklärt eine laufende Verzögerung ruhig und ist bei Verkehr und Bestellungen besonders nützlich.', en: 'This word explains an ongoing delay calmly and is especially useful for transport and orders.' } },
    distractors: ['지하철로 가요', '가방을 들어요'], placeholderCaption: { de: 'Vor einem Hotel wartet ein Reisender mit Tasche, während ein Mitarbeiter nach einem Taxi telefoniert.', en: 'Outside a hotel, a traveler waits with a bag while an attendant calls for a taxi.' }, songMood: 'a delayed ride smoothly solved with a helpful alternative', visualNotes: 'Hotel entrance, waiting traveler with luggage, attendant making a taxi call and a calm city street.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'cheon-woni-mojarayo', title: { de: 'Tausend Won fehlen', en: 'A thousand won is missing' },
    situation: { de: 'Nach dem Bezahlen bemerkst du, dass beim Wechselgeld ein kleiner Betrag fehlt. Du bittest die Kasse höflich um eine Prüfung.', en: 'After paying, you notice a small amount is missing from the change. Politely ask the cashier to check.' },
    pedagogicalGoal: 'Eine abgeschlossene Zahlung mit 계산했어요 und einen aktuellen Fehlbetrag höflich verbinden.',
    targetText: '계산했어요. 그런데 거스름돈이 천 원 모자라요. 확인해 주세요.', baseText: { de: 'Ich habe bezahlt. Aber beim Wechselgeld fehlen tausend Won. Bitte prüfen Sie das.', en: 'I paid. But the change is short a thousand won. Please check it.' },
    chunks: [{ targetText: '계산했어요.', baseText: { de: 'Ich habe bezahlt.', en: 'I paid.' } }, { targetText: '그런데 거스름돈이', baseText: { de: 'aber das Wechselgeld', en: 'but the change' } }, { targetText: '천 원 모자라요.', baseText: { de: 'ist tausend Won zu wenig.', en: 'is short a thousand won.' } }, { targetText: '확인해 주세요.', baseText: { de: 'Bitte prüfen Sie das.', en: 'Please check it.' } }],
    terms: [{ targetText: '계산했어요', baseText: { de: 'ich habe bezahlt', en: 'I paid' } }, { targetText: '그런데', baseText: { de: 'aber; allerdings', en: 'but; however' } }, { targetText: '거스름돈이', baseText: { de: 'Wechselgeld mit Subjektpartikel', en: 'change with subject particle' } }, { targetText: '천 원', baseText: { de: 'tausend Won', en: 'a thousand won' } }, { targetText: '모자라요', baseText: { de: 'es fehlt', en: 'it is short' } }, { targetText: '확인해', baseText: { de: 'prüfen Sie', en: 'check' } }],
    recall: { before: '계산했어요. 그런데 거스름돈이 천 원 ', answer: '모자라요', after: '. 확인해 주세요.', fallbackChoices: ['모자라요', '필요해요', '추워요', '바빠요'] }, speakRequired: ['계산했어요', '천', '모자라요'],
    sceneCaption: { de: 'Die Kassiererin reicht dir das Wechselgeld und sagt: „여기 거스름돈이에요.“', en: 'The cashier hands you the change and says: “여기 거스름돈이에요.”' },
    trophyWord: { word: '모자라요', meaning: { de: 'es fehlt; es reicht nicht', en: 'it is short; not enough' }, example: '돈이 조금 모자라요.', whyThisWord: { de: 'Damit kannst du einen kleinen Fehlbetrag sachlich nennen und gleichzeitig höflich um Hilfe bitten.', en: 'It lets you state a small shortage matter-of-factly while asking politely for help.' } },
    distractors: ['카드를 써요', '가방을 사요'], placeholderCaption: { de: 'Ein Kassenbon und einige Münzen liegen vor einer aufmerksamen Kassiererin auf dem Tresen.', en: 'A receipt and some coins lie on the counter in front of an attentive cashier.' }, songMood: 'a small payment mismatch resolved politely at the counter', visualNotes: 'Shop counter with receipt and change, calm cashier rechecking the amount, learner speaking respectfully.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'beolsseo-an-dwaeyo', title: { de: 'Schon kaputt', en: 'Already not working' },
    situation: { de: 'Du hast einen kleinen Gegenstand heute gekauft, aber er funktioniert schon nicht mehr. Im Laden bittest du um einen Austausch.', en: 'You bought a small item today, but it already does not work. Ask the shop for an exchange.' },
    pedagogicalGoal: 'Mit 샀어요 eine heutige Erfahrung nennen und mit 안 돼요 sowie 바꿔 주세요 höflich eine Lösung verlangen.',
    targetText: '오늘 샀어요. 그런데 벌써 안 돼요. 바꿔 주세요.', baseText: { de: 'Ich habe es heute gekauft. Aber es funktioniert schon nicht. Bitte tauschen Sie es um.', en: 'I bought it today. But it already does not work. Please exchange it.' },
    chunks: [{ targetText: '오늘 샀어요.', baseText: { de: 'Ich habe es heute gekauft.', en: 'I bought it today.' } }, { targetText: '그런데 벌써 안 돼요.', baseText: { de: 'Aber es funktioniert schon nicht.', en: 'But it already does not work.' } }, { targetText: '바꿔 주세요.', baseText: { de: 'Bitte tauschen Sie es um.', en: 'Please exchange it.' } }],
    terms: [{ targetText: '오늘', baseText: { de: 'heute', en: 'today' } }, { targetText: '샀어요', baseText: { de: 'ich habe gekauft', en: 'I bought' } }, { targetText: '그런데', baseText: { de: 'aber; allerdings', en: 'but; however' } }, { targetText: '벌써', baseText: { de: 'schon', en: 'already' } }, { targetText: '안 돼요', baseText: { de: 'es funktioniert nicht', en: 'it does not work' } }, { targetText: '바꿔', baseText: { de: 'tauschen Sie um', en: 'exchange' } }],
    recall: { before: '오늘 샀어요. 그런데 벌써 안 돼요. ', answer: '바꿔', after: ' 주세요.', fallbackChoices: ['바꿔', '먹어', '마셔', '읽어'] }, speakRequired: ['샀어요', '벌써', '바꿔'],
    sceneCaption: { de: 'Der Verkäufer nimmt den Gegenstand an und fragt: „무슨 문제가 있으세요?“', en: 'The shop clerk takes the item and asks: “무슨 문제가 있으세요?”' },
    trophyWord: { word: '바꿔', meaning: { de: 'tauschen Sie um', en: 'exchange' }, example: '이걸 바꿔 주세요.', whyThisWord: { de: 'Dieses Verb gibt dir eine kurze, höfliche Lösung, wenn ein gerade gekaufter Gegenstand nicht funktioniert.', en: 'This verb gives you a short, polite solution when something you just bought does not work.' } },
    distractors: ['가게가 커요', '돈이 있어요'], placeholderCaption: { de: 'Ein kleiner Gegenstand und ein Bon liegen auf dem Tresen eines freundlichen Ladens.', en: 'A small item and a receipt lie on the counter of a friendly shop.' }, songMood: 'a quick exchange request handled with calm certainty', visualNotes: 'Small retail counter, receipt and faulty item, attentive clerk ready to exchange it without conflict.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'gugi-chagawoyo', title: { de: 'Die Suppe ist kalt', en: 'The soup is cold' },
    situation: { de: 'Du hast eine Suppe bestellt, aber jetzt ist sie etwas kalt. Du bittest die Bedienung höflich, sie warm zu machen.', en: 'You ordered soup, but it is a little cold now. Politely ask the server to make it warm.' },
    pedagogicalGoal: 'Eine vergangene Bestellung mit einem aktuellen Problem und -아/어 줄 수 있어요? verbinden.',
    targetText: '국을 주문했어요. 지금 좀 차가워요. 따뜻하게 해 줄 수 있어요?', baseText: { de: 'Ich habe Suppe bestellt. Sie ist jetzt etwas kalt. Können Sie sie warm machen?', en: 'I ordered soup. It is a little cold now. Can you warm it up?' },
    chunks: [{ targetText: '국을 주문했어요.', baseText: { de: 'Ich habe Suppe bestellt.', en: 'I ordered soup.' } }, { targetText: '지금 좀 차가워요.', baseText: { de: 'Sie ist jetzt etwas kalt.', en: 'It is a little cold now.' } }, { targetText: '따뜻하게 해 줄 수 있어요?', baseText: { de: 'Können Sie sie warm machen?', en: 'Can you warm it up?' } }],
    terms: [{ targetText: '국을', baseText: { de: 'Suppe mit Objektpartikel', en: 'soup with object particle' } }, { targetText: '주문했어요', baseText: { de: 'ich habe bestellt', en: 'I ordered' } }, { targetText: '지금', baseText: { de: 'jetzt', en: 'now' } }, { targetText: '차가워요', baseText: { de: 'es ist kalt', en: 'it is cold' } }, { targetText: '따뜻하게', baseText: { de: 'warm', en: 'warmly; warm' } }, { targetText: '해 줄 수 있어요', baseText: { de: 'können Sie es machen?', en: 'can you do it?' } }],
    recall: { before: '국을 주문했어요. 지금 좀 ', answer: '차가워요', after: '. 따뜻하게 해 줄 수 있어요?', fallbackChoices: ['차가워요', '바빠요', '멀어요', '작아요'] }, speakRequired: ['주문했어요', '차가워요', '따뜻하게'],
    sceneCaption: { de: 'Die Bedienung berührt die Schüssel und sagt: „국이 차가워요?“', en: 'The server touches the bowl and says: “국이 차가워요?”' },
    trophyWord: { word: '차가워요', meaning: { de: 'es ist kalt', en: 'it is cold' }, example: '물이 차가워요.', whyThisWord: { de: 'Mit diesem Wort kannst du ein kleines Essensproblem sachlich erklären und direkt um eine freundliche Lösung bitten.', en: 'This word lets you explain a small food problem matter-of-factly and directly ask for a kind solution.' } },
    distractors: ['물을 마셔요', '밥을 먹어요'], placeholderCaption: { de: 'Eine Schüssel Suppe steht auf einem Tisch, während die Bedienung sie aufmerksam prüft.', en: 'A bowl of soup sits on a table while the server checks it attentively.' }, songMood: 'a gentle restaurant repair request met with quick care', visualNotes: 'Restaurant table with soup bowl, considerate server, warm kitchen light and a calm helpful exchange.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'yeopbang-i-sikkeureowoyo', title: { de: 'Das Zimmer nebenan ist laut', en: 'The next room is loud' },
    situation: { de: 'Du hast wegen des lauten Nachbarzimmers schlecht geschlafen. An der Rezeption wird dir ein anderes Zimmer angeboten.', en: 'You slept badly because the next room was loud. Reception offers you another room.' },
    pedagogicalGoal: 'Ein gegenwärtiges Lärmproblem mit 못 잤어요 verbinden und höflich um einen Zimmerwechsel bitten.',
    targetText: '옆방이 너무 시끄러워요. 잘 못 잤어요. 방을 바꿔 주세요.', baseText: { de: 'Das Zimmer nebenan ist zu laut. Ich habe nicht gut geschlafen. Bitte wechseln Sie mein Zimmer.', en: 'The next room is too loud. I did not sleep well. Please change my room.' },
    chunks: [{ targetText: '옆방이 너무 시끄러워요.', baseText: { de: 'Das Zimmer nebenan ist zu laut.', en: 'The next room is too loud.' } }, { targetText: '잘 못 잤어요.', baseText: { de: 'Ich habe nicht gut geschlafen.', en: 'I did not sleep well.' } }, { targetText: '방을 바꿔 주세요.', baseText: { de: 'Bitte wechseln Sie mein Zimmer.', en: 'Please change my room.' } }],
    terms: [{ targetText: '옆방이', baseText: { de: 'Nachbarzimmer mit Subjektpartikel', en: 'next room with subject particle' } }, { targetText: '너무', baseText: { de: 'zu; sehr', en: 'too; very' } }, { targetText: '시끄러워요', baseText: { de: 'es ist laut', en: 'it is noisy' } }, { targetText: '못 잤어요', baseText: { de: 'ich habe nicht schlafen können', en: 'I could not sleep' } }, { targetText: '방을', baseText: { de: 'Zimmer mit Objektpartikel', en: 'room with object particle' } }, { targetText: '바꿔', baseText: { de: 'wechseln Sie', en: 'change' } }],
    recall: { before: '옆방이 너무 시끄러워요. 잘 못 ', answer: '잤어요', after: '. 방을 바꿔 주세요.', fallbackChoices: ['잤어요', '갔어요', '샀어요', '봤어요'] }, speakRequired: ['옆방이', '시끄러워요', '잤어요'],
    sceneCaption: { de: 'Die Rezeptionistin begrüßt dich am Morgen und fragt: „어젯밤에 잘 주무셨어요?“', en: 'The receptionist greets you in the morning and asks: “어젯밤에 잘 주무셨어요?”' },
    trophyWord: { word: '옆방', meaning: { de: 'Nachbarzimmer', en: 'next room' }, example: '옆방이 조용해요.', whyThisWord: { de: 'Dieses zusammengesetzte Wort benennt das Problem genau, ohne dass du eine lange Beschwerde formulieren musst.', en: 'This compound word names the problem exactly without requiring a long complaint.' } },
    distractors: ['문을 열어요', '호텔이 커요'], placeholderCaption: { de: 'Eine Rezeptionistin hält eine neue Schlüsselkarte bereit, während ein ruhiger Flur im Hintergrund liegt.', en: 'A receptionist holds out a new key card with a quiet hallway in the background.' }, songMood: 'a noisy-room problem gently solved with a new key', visualNotes: 'Hotel front desk, new key card, relieved traveler and a quiet corridor suggesting a better room ahead.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'ije-da-gwaenchanayo', title: { de: 'Jetzt ist alles in Ordnung', en: 'Everything is okay now' },
    situation: { de: 'Nach der Hilfe des Personals meldest du zurück, dass jetzt wieder alles funktioniert, und bedankst dich.', en: 'After the staff helped, report that everything is working again now and thank them.' },
    pedagogicalGoal: 'Mit einem vergangenen Anruf und 이제 다 괜찮아요 eine Reparatur freundlich abschließen.',
    targetText: '어제 전화했어요. 이제 다 괜찮아요. 정말 감사합니다.', baseText: { de: 'Gestern habe ich angerufen. Jetzt ist alles in Ordnung. Vielen Dank.', en: 'I called yesterday. Everything is okay now. Thank you very much.' },
    chunks: [{ targetText: '어제 전화했어요.', baseText: { de: 'Gestern habe ich angerufen.', en: 'I called yesterday.' } }, { targetText: '이제 다 괜찮아요.', baseText: { de: 'Jetzt ist alles in Ordnung.', en: 'Everything is okay now.' } }, { targetText: '정말 감사합니다.', baseText: { de: 'Vielen Dank.', en: 'Thank you very much.' } }],
    terms: [{ targetText: '어제', baseText: { de: 'gestern', en: 'yesterday' } }, { targetText: '전화했어요', baseText: { de: 'ich habe angerufen', en: 'I called' } }, { targetText: '이제', baseText: { de: 'jetzt; inzwischen', en: 'now; by now' } }, { targetText: '다', baseText: { de: 'alles; ganz', en: 'all; completely' } }, { targetText: '괜찮아요', baseText: { de: 'es ist in Ordnung', en: 'it is okay' } }, { targetText: '감사합니다', baseText: { de: 'danke', en: 'thank you' } }],
    recall: { before: '어제 전화했어요. ', answer: '이제', after: ' 다 괜찮아요. 정말 감사합니다.', fallbackChoices: ['이제', '어제', '정말', '아주'] }, speakRequired: ['전화했어요', '이제', '감사합니다'],
    sceneCaption: { de: 'Die Mitarbeiterin lächelt und fragt: „이제 괜찮으세요?“', en: 'The staff member smiles and asks: “이제 괜찮으세요?”' },
    trophyWord: { word: '이제', meaning: { de: 'jetzt; inzwischen', en: 'now; by now' }, example: '이제 집에 가요.', whyThisWord: { de: 'Dieses Wort markiert den beruhigenden Moment, in dem ein kleines Problem wirklich abgeschlossen ist.', en: 'This word marks the reassuring moment when a small problem is genuinely resolved.' } },
    distractors: ['문을 닫아요', '카드를 써요'], placeholderCaption: { de: 'Eine Mitarbeiterin verabschiedet dich an einem Serviceschalter mit erleichtertem Lächeln.', en: 'A staff member says goodbye at a service counter with a relieved smile.' }, songMood: 'a grateful calm finish after a small problem is fixed', visualNotes: 'Helpful service desk, smiling staff member, learner relieved and thanking them after a successful repair.',
  }),
]

export const KOREAN_A2_PRACTICAL_9_LESSONS: GuidedLessonDefinition[] = makeKoreanA2PracticalLessons(
  GUIDED_TODAY_PATH_KOREAN_A2_NINE_METADATA, koreanA2Practical9Inputs,
  { de: 'Du hast Koreanisch A2 Praxis 9 abgeschlossen und kannst kleine Probleme ruhig erklären und höflich lösen.', en: 'You have completed Korean A2 Practical 9 and can calmly explain and politely resolve small problems.' },
)

export const GUIDED_TODAY_PATH_KOREAN_A2_TEN_METADATA: GuidedPathMetadata = {
  id: 'korean-a2-practical-10', title: 'Korean A2 Practical 10', shortTitle: 'A2 Practical 10',
  subtitle: { de: 'Deine Geschichte erzählen, auf Fortschritte zurückblicken und warm Abschied nehmen', en: 'Telling your story, reflecting on progress, and saying a warm goodbye' },
  level: 'A2', baseLanguage: 'German', targetLanguage: 'Korean', estimatedMinutes: 5,
}

const koreanA2Practical10Inputs: KoreanA2LessonInput[] = [
  makeKoreanA2CompactLesson({
    slug: 'dogileseo-wasseoyo', title: { de: 'Aus Deutschland', en: 'From Germany' },
    situation: { de: 'Deine Freundin möchte mehr über dich wissen und fragt nach deiner Heimat. Du erzählst kurz, woher du gekommen bist und wo du jetzt lebst.', en: 'Your friend wants to know more about you and asks about your home. Briefly say where you came from and where you live now.' },
    pedagogicalGoal: 'Mit 독일에서 왔어요 auf deine Herkunft zurückblicken und mit 지금은 ... 살아요 die Gegenwart ergänzen.',
    targetText: '독일에서 왔어요. 지금은 여기에 살아요.', baseText: { de: 'Ich bin aus Deutschland nach Korea gekommen. Jetzt lebe ich hier.', en: 'I came from Germany. I live here now.' },
    chunks: [{ targetText: '독일에서 왔어요.', baseText: { de: 'Ich bin aus Deutschland hergekommen.', en: 'I came from Germany.' } }, { targetText: '지금은 여기에', baseText: { de: 'jetzt hier', en: 'here now' } }, { targetText: '살아요.', baseText: { de: 'lebe ich.', en: 'I live.' } }],
    terms: [{ targetText: '독일에서', baseText: { de: 'aus Deutschland', en: 'from Germany' } }, { targetText: '왔어요', baseText: { de: 'ich bin gekommen', en: 'I came' } }, { targetText: '지금은', baseText: { de: 'jetzt', en: 'now' } }, { targetText: '여기에', baseText: { de: 'hier', en: 'here' } }, { targetText: '살아요', baseText: { de: 'ich lebe', en: 'I live' } }],
    recall: { before: '', answer: '독일에서', after: ' 왔어요. 지금은 여기에 살아요.', fallbackChoices: ['독일에서', '서울에서', '학교에서', '회사에서'] }, speakRequired: ['독일에서', '왔어요', '살아요'],
    sceneCaption: { de: 'Deine Freundin möchte mehr über dich wissen und fragt: „고향은 어디예요?“', en: 'Your friend wants to know more about you and asks: “고향은 어디예요?”' },
    trophyWord: { word: '독일', meaning: { de: 'Deutschland', en: 'Germany' }, example: '독일은 겨울에 추워요.', whyThisWord: { de: 'Mit diesem Ländernamen kannst du deine Herkunft gleich am Anfang deiner Geschichte klar nennen.', en: 'This country name lets you state your origin clearly at the start of your story.' } },
    distractors: ['내일 독일에서', '가족은 여기에'], placeholderCaption: { de: 'Zwei Freunde sitzen in einem ruhigen Café, während du von deiner Heimat erzählst.', en: 'Two friends sit in a quiet cafe while you talk about your home.' }, songMood: 'a reflective beginning to a personal story shared with a close friend', visualNotes: 'Quiet neighborhood cafe, two friends facing each other, a subtle Germany postcard beside a warm drink.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'sinae-samusil-eseo-ilhaeyo', title: { de: 'Arbeit in der Innenstadt', en: 'Work downtown' },
    situation: { de: 'Deine Freundin fragt, wo du tagsüber arbeitest. Du beschreibst dein Büro mitten in der Stadt.', en: 'Your friend asks where you work during the day. Describe your office in the middle of the city.' },
    pedagogicalGoal: 'Den eigenen Arbeitsort mit 시내 사무실에서 und der Handlungsort-Partikel -에서 beschreiben.',
    targetText: '저는 지금 시내 사무실에서 일해요.', baseText: { de: 'Ich arbeite jetzt in einem Büro in der Innenstadt.', en: 'I work in an office downtown now.' },
    chunks: [{ targetText: '저는 지금', baseText: { de: 'ich jetzt', en: 'I now' } }, { targetText: '시내 사무실에서', baseText: { de: 'in einem Büro in der Innenstadt', en: 'in an office downtown' } }, { targetText: '일해요.', baseText: { de: 'arbeite.', en: 'work.' } }],
    terms: [{ targetText: '저는', baseText: { de: 'ich mit Themapartikel', en: 'I with topic particle' } }, { targetText: '지금', baseText: { de: 'jetzt', en: 'now' } }, { targetText: '시내', baseText: { de: 'Innenstadt', en: 'downtown' } }, { targetText: '사무실에서', baseText: { de: 'im Büro mit Handlungsort-Partikel', en: 'at the office with action-location particle' } }, { targetText: '일해요', baseText: { de: 'ich arbeite', en: 'I work' } }],
    recall: { before: '저는 지금 시내 ', answer: '사무실에서', after: ' 일해요.', fallbackChoices: ['사무실에서', '학교에서', '가게에서', '집에서'] }, speakRequired: ['시내', '사무실에서', '일해요'],
    sceneCaption: { de: 'Deine Freundin fragt neugierig: „요즘 어디에서 일해요?“', en: 'Your friend asks curiously: “요즘 어디에서 일해요?”' },
    trophyWord: { word: '사무실', meaning: { de: 'Büro', en: 'office' }, example: '사무실에서 매일 일해요.', whyThisWord: { de: 'Dieses Wort gibt deiner Geschichte einen konkreten Alltagsort und macht deine Antwort persönlicher.', en: 'This word gives your story a concrete everyday place and makes your answer more personal.' } },
    distractors: ['주말에 친구와', '시내 공원에서'], placeholderCaption: { de: 'Große Fenster zeigen die Innenstadt hinter einem ruhigen Schreibtisch mit einer Tasse Tee.', en: 'Large windows show downtown behind a calm desk with a cup of tea.' }, songMood: 'a steady city-work rhythm and a small pause between busy hours', visualNotes: 'Bright downtown office, city skyline through large windows, tidy desk and a warm tea cup.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'eumageul-joahaeseo-baeweoyo', title: { de: 'Koreanische Musik', en: 'Korean music' },
    situation: { de: 'Deine Freundin möchte wissen, warum du Koreanisch lernst. Du nennst die Musik als deinen persönlichen Grund.', en: 'Your friend wants to know why you are learning Korean. Name music as your personal reason.' },
    pedagogicalGoal: 'Einen vertrauten Grund mit -아서/어서 in einer persönlichen Geschichte nennen.',
    targetText: '저는 한국 음악을 좋아해서 한국어를 배워요.', baseText: { de: 'Weil ich koreanische Musik mag, lerne ich Koreanisch.', en: 'Because I like Korean music, I am learning Korean.' },
    chunks: [{ targetText: '저는', baseText: { de: 'ich', en: 'I' } }, { targetText: '한국 음악을 좋아해서', baseText: { de: 'weil ich koreanische Musik mag', en: 'because I like Korean music' } }, { targetText: '한국어를 배워요.', baseText: { de: 'lerne ich Koreanisch.', en: 'I am learning Korean.' } }],
    terms: [{ targetText: '저는', baseText: { de: 'ich mit Themapartikel', en: 'I with topic particle' } }, { targetText: '한국', baseText: { de: 'Korea; koreanisch', en: 'Korea; Korean' } }, { targetText: '음악을', baseText: { de: 'Musik mit Objektpartikel', en: 'music with object particle' } }, { targetText: '좋아해서', baseText: { de: 'weil ich mag', en: 'because I like' } }, { targetText: '한국어를', baseText: { de: 'Koreanisch mit Objektpartikel', en: 'Korean with object particle' } }, { targetText: '배워요', baseText: { de: 'ich lerne', en: 'I am learning' } }],
    recall: { before: '저는 한국 음악을 ', answer: '좋아해서', after: ' 한국어를 배워요.', fallbackChoices: ['좋아해서', '바빠서', '추워서', '더워서'] }, speakRequired: ['음악을', '좋아해서', '배워요'],
    sceneCaption: { de: 'Deine Freundin lächelt und fragt: „한국어는 왜 배워요?“', en: 'Your friend smiles and asks: “한국어는 왜 배워요?”' },
    trophyWord: { word: '음악', meaning: { de: 'Musik', en: 'music' }, example: '음악을 매일 들어요.', whyThisWord: { de: 'Musik liefert hier deinen echten Grund und verbindet die Sprache mit etwas, das dir Freude macht.', en: 'Music gives your real reason here and connects the language with something you enjoy.' } },
    distractors: ['한국 영화를', '친구와 음악을'], placeholderCaption: { de: 'Kopfhörer liegen neben einem Koreanischheft, während zwei Freunde über Lieblingslieder sprechen.', en: 'Headphones lie beside a Korean workbook while two friends talk about favorite songs.' }, songMood: 'bright Korean indie pop as a personal reason to keep learning', visualNotes: 'Cozy cafe table with headphones, Korean notebook, music player, and two friends sharing favorite songs.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'on-ji-du-ju-dwaesseoyo', title: { de: 'Seit zwei Wochen hier', en: 'Here for two weeks' },
    situation: { de: 'Deine Freundin fragt, wie lange du schon in Korea bist. Du sagst, dass es zwei Wochen sind.', en: 'Your friend asks how long you have been in Korea. Say that it has been two weeks.' },
    pedagogicalGoal: 'Mit -(으)ㄴ 지 ... 됐어요 ausdrücken, wie lange du schon in Korea bist.',
    targetText: '한국에 온 지 두 주 됐어요.', baseText: { de: 'Ich bin seit zwei Wochen in Korea.', en: 'I have been in Korea for two weeks.' },
    chunks: [{ targetText: '한국에 온 지', baseText: { de: 'seit ich nach Korea gekommen bin', en: 'since I came to Korea' } }, { targetText: '두 주', baseText: { de: 'zwei Wochen', en: 'two weeks' } }, { targetText: '됐어요.', baseText: { de: 'sind es.', en: 'it has been.' } }],
    terms: [{ targetText: '한국에', baseText: { de: 'in Korea', en: 'in Korea' } }, { targetText: '온', baseText: { de: 'gekommen', en: 'having come' } }, { targetText: '지', baseText: { de: 'seit', en: 'since' } }, { targetText: '두 주', baseText: { de: 'zwei Wochen', en: 'two weeks' } }, { targetText: '됐어요', baseText: { de: 'es sind geworden', en: 'it has become' } }],
    recall: { before: '한국에 온 지 두 주 ', answer: '됐어요', after: '.', fallbackChoices: ['됐어요', '있어요', '많아요', '작아요'] }, speakRequired: ['한국에', '지', '됐어요'],
    sceneCaption: { de: 'Deine Freundin fragt überrascht: „한국에 온 지 얼마나 됐어요?“', en: 'Your friend asks with interest: “한국에 온 지 얼마나 됐어요?”' },
    trophyWord: { word: '지', meaning: { de: 'seit', en: 'since' }, example: '여기에 온 지 한 달 됐어요.', whyThisWord: { de: 'Dieses kleine Grammatikwort verbindet den Ankunftsmoment mit der Zeit, die seitdem vergangen ist.', en: 'This small grammar word connects the arrival moment with the time that has passed since then.' } },
    distractors: ['서울에서 일한', '친구와 매일'], placeholderCaption: { de: 'Zwei Freunde schauen auf einen Kalender mit zwei sanft markierten Wochen in Seoul.', en: 'Two friends look at a calendar with two gently marked weeks in Seoul.' }, songMood: 'a gentle milestone in a new city, marked with growing confidence', visualNotes: 'Warm cafe table, simple calendar with two Korean weeks marked, friends sharing a small proud smile.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'gajogeun-dogile-isseoyo', title: { de: 'Meine Familie', en: 'My family' },
    situation: { de: 'Deine Freundin fragt nach deiner Familie in Deutschland. Du erzählst, wo sie ist und wie ihr in Kontakt bleibt.', en: 'Your friend asks about your family in Germany. Say where they are and how you stay in touch.' },
    pedagogicalGoal: 'Mit 주말마다 eine regelmäßige Verbindung zur Familie beschreiben.',
    targetText: '제 가족은 독일에 있어요. 주말마다 전화해요.', baseText: { de: 'Meine Familie ist in Deutschland. Ich telefoniere jedes Wochenende.', en: 'My family is in Germany. I call every weekend.' },
    chunks: [{ targetText: '제 가족은', baseText: { de: 'meine Familie', en: 'my family' } }, { targetText: '독일에 있어요.', baseText: { de: 'ist in Deutschland.', en: 'is in Germany.' } }, { targetText: '주말마다 전화해요.', baseText: { de: 'ich telefoniere jedes Wochenende.', en: 'I call every weekend.' } }],
    terms: [{ targetText: '제', baseText: { de: 'mein; meine', en: 'my' } }, { targetText: '가족은', baseText: { de: 'Familie mit Themapartikel', en: 'family with topic particle' } }, { targetText: '독일에', baseText: { de: 'in Deutschland', en: 'in Germany' } }, { targetText: '주말마다', baseText: { de: 'jedes Wochenende', en: 'every weekend' } }, { targetText: '전화해요', baseText: { de: 'ich telefoniere', en: 'I call' } }],
    recall: { before: '제 가족은 독일에 있어요. ', answer: '주말마다', after: ' 전화해요.', fallbackChoices: ['주말마다', '매일', '아침마다', '저녁마다'] }, speakRequired: ['가족은', '독일에', '전화해요'],
    sceneCaption: { de: 'Deine Freundin fragt behutsam: „가족은 독일에 있어요?“', en: 'Your friend asks gently: “가족은 독일에 있어요?”' },
    trophyWord: { word: '가족', meaning: { de: 'Familie', en: 'family' }, example: '가족에게 자주 전화해요.', whyThisWord: { de: 'Mit diesem Wort holst du die Menschen zu Hause in deine Geschichte und kannst von eurem Kontakt erzählen.', en: 'This word brings the people at home into your story and lets you talk about staying in touch.' } },
    distractors: ['친구와 자주', '매주 독일에'], placeholderCaption: { de: 'Ein Handy zeigt einen warmen Familienanruf, während du mit deiner Freundin am Tisch sitzt.', en: 'A phone shows a warm family call while you sit at a table with your friend.' }, songMood: 'a warm weekend call that keeps distant family close', visualNotes: 'Cozy cafe table, phone screen with a gentle family video call, friend listening with care.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'yorihago-sanchaegeul-haeyo', title: { de: 'Was ich gern mache', en: 'What I enjoy doing' },
    situation: { de: 'Deine Freundin fragt, was du in deiner freien Zeit gern machst. Du nennst zwei ruhige Hobbys.', en: 'Your friend asks what you enjoy doing in your free time. Name two calm hobbies.' },
    pedagogicalGoal: 'Mit -고 zwei vertraute Hobbys in einem Satz verbinden.',
    targetText: '저는 요리하고 산책을 자주 해요.', baseText: { de: 'Ich koche oft und gehe spazieren.', en: 'I often cook and go for walks.' },
    chunks: [{ targetText: '저는', baseText: { de: 'ich', en: 'I' } }, { targetText: '요리하고 산책을', baseText: { de: 'koche und gehe spazieren', en: 'cook and go for walks' } }, { targetText: '자주 해요.', baseText: { de: 'oft.', en: 'often.' } }],
    terms: [{ targetText: '저는', baseText: { de: 'ich mit Themapartikel', en: 'I with topic particle' } }, { targetText: '요리하고', baseText: { de: 'ich koche und', en: 'I cook and' } }, { targetText: '산책을', baseText: { de: 'Spaziergang mit Objektpartikel', en: 'a walk with object particle' } }, { targetText: '자주', baseText: { de: 'oft', en: 'often' } }, { targetText: '해요', baseText: { de: 'ich mache', en: 'I do' } }],
    recall: { before: '저는 요리하고 ', answer: '산책을', after: ' 자주 해요.', fallbackChoices: ['산책을', '운동을', '청소를', '쇼핑을'] }, speakRequired: ['요리하고', '산책을', '자주'],
    sceneCaption: { de: 'Deine Freundin fragt lächelnd: „요즘 취미가 뭐예요?“', en: 'Your friend asks with a smile: “요즘 취미가 뭐예요?”' },
    trophyWord: { word: '요리', meaning: { de: 'Kochen', en: 'cooking' }, example: '집에서 요리해요.', whyThisWord: { de: 'Kochen gibt deiner Geschichte ein persönliches Hobby und lässt sich leicht mit einer zweiten Aktivität verbinden.', en: 'Cooking gives your story a personal hobby and links easily with a second activity.' } },
    distractors: ['친구와 영화를', '주말에 공원에서'], placeholderCaption: { de: 'Ein kleiner Korb mit Gemüse steht neben bequemen Schuhen am Eingang eines Parks.', en: 'A small basket of vegetables sits beside comfortable shoes at the entrance to a park.' }, songMood: 'a light weekend rhythm of cooking, fresh air, and easy friendship', visualNotes: 'Sunlit kitchen counter with vegetables, park path beyond an open door, relaxed everyday warmth.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'achim-e-ilhago-gongbuhaeyo', title: { de: 'Mein Tagesrhythmus', en: 'My daily routine' },
    situation: { de: 'Deine Freundin fragt, wie dein Tag normalerweise aussieht. Du erzählst von Arbeit am Morgen und Koreanisch am Abend.', en: 'Your friend asks what your day usually looks like. Tell her about work in the morning and Korean in the evening.' },
    pedagogicalGoal: 'Mit -고 zwei Teile des Tagesablaufs klar und freundlich verbinden.',
    targetText: '저는 아침에 일하고 저녁에 한국어를 공부해요.', baseText: { de: 'Ich arbeite morgens und lerne abends Koreanisch.', en: 'I work in the morning and study Korean in the evening.' },
    chunks: [{ targetText: '저는 아침에', baseText: { de: 'ich morgens', en: 'I in the morning' } }, { targetText: '일하고 저녁에', baseText: { de: 'arbeite und abends', en: 'work and in the evening' } }, { targetText: '한국어를 공부해요.', baseText: { de: 'lerne Koreanisch.', en: 'study Korean.' } }],
    terms: [{ targetText: '저는', baseText: { de: 'ich mit Themapartikel', en: 'I with topic particle' } }, { targetText: '아침에', baseText: { de: 'am Morgen', en: 'in the morning' } }, { targetText: '일하고', baseText: { de: 'ich arbeite und', en: 'I work and' } }, { targetText: '저녁에', baseText: { de: 'am Abend', en: 'in the evening' } }, { targetText: '한국어를', baseText: { de: 'Koreanisch mit Objektpartikel', en: 'Korean with object particle' } }, { targetText: '공부해요', baseText: { de: 'ich lerne', en: 'I study' } }],
    recall: { before: '저는 아침에 일하고 저녁에 한국어를 ', answer: '공부해요', after: '.', fallbackChoices: ['공부해요', '일해요', '쉬어요', '만들어요'] }, speakRequired: ['아침에', '일하고', '공부해요'],
    sceneCaption: { de: 'Deine Freundin fragt interessiert: „하루는 어떻게 보내요?“', en: 'Your friend asks with interest: “하루는 어떻게 보내요?”' },
    trophyWord: { word: '공부', meaning: { de: 'Lernen; Studium', en: 'studying' }, example: '한국어를 공부해요.', whyThisWord: { de: 'Dieses Wort zeigt, wie die Sprache einen festen Platz in deinem Alltag bekommen hat.', en: 'This word shows how the language has found a regular place in your daily life.' } },
    distractors: ['친구와 저녁을', '주말에 공원에서'], placeholderCaption: { de: 'Ein Morgen-Schreibtisch geht sanft in einen Abend mit Koreanischheft und Lampe über.', en: 'A morning work desk gently shifts into an evening with a Korean workbook and lamp.' }, songMood: 'a calm daily rhythm from focused work to evening language study', visualNotes: 'Split-day scene: bright office desk in the morning, warm lamp and Korean notebook at night.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'cheoncheonhi-malhaeyo', title: { de: 'Immer sicherer', en: 'Growing more confident' },
    situation: { de: 'Deine Freundin fragt, wie gut du Koreanisch jetzt verstehst. Du erzählst ehrlich von deinem Fortschritt und deinem Tempo beim Sprechen.', en: 'Your friend asks how well you understand Korean now. Honestly describe your progress and your speaking pace.' },
    pedagogicalGoal: 'Mit 거의 다 und 아직 eine ehrliche, ermutigende Zwischenbilanz ziehen.',
    targetText: '이제 거의 다 알아들어요. 그런데 아직 천천히 말해요.', baseText: { de: 'Jetzt verstehe ich fast alles. Aber ich spreche noch langsam.', en: 'Now I understand almost everything. But I still speak slowly.' },
    chunks: [{ targetText: '이제 거의 다 알아들어요.', baseText: { de: 'Jetzt verstehe ich fast alles.', en: 'Now I understand almost everything.' } }, { targetText: '그런데 아직', baseText: { de: 'aber noch', en: 'but still' } }, { targetText: '천천히 말해요.', baseText: { de: 'spreche ich langsam.', en: 'I speak slowly.' } }],
    terms: [{ targetText: '이제', baseText: { de: 'jetzt; inzwischen', en: 'now; by now' } }, { targetText: '거의', baseText: { de: 'fast', en: 'almost' } }, { targetText: '다', baseText: { de: 'alles; ganz', en: 'all; completely' } }, { targetText: '알아들어요', baseText: { de: 'ich verstehe', en: 'I understand' } }, { targetText: '아직', baseText: { de: 'noch', en: 'still; yet' } }, { targetText: '천천히', baseText: { de: 'langsam', en: 'slowly' } }, { targetText: '말해요', baseText: { de: 'ich spreche', en: 'I speak' } }],
    recall: { before: '이제 거의 다 알아들어요. 그런데 아직 ', answer: '천천히', after: ' 말해요.', fallbackChoices: ['천천히', '크게', '조용히', '빨리'] }, speakRequired: ['알아들어요', '천천히', '말해요'],
    sceneCaption: { de: 'Deine Freundin fragt ermutigend: „한국어를 지금은 잘 알아들어요?“', en: 'Your friend asks encouragingly: “한국어를 지금은 잘 알아들어요?”' },
    trophyWord: { word: '천천히', meaning: { de: 'langsam', en: 'slowly' }, example: '천천히 말해 주세요.', whyThisWord: { de: 'Dieses Wort lässt dich deinen Fortschritt ehrlich beschreiben und zugleich freundlich um ein passendes Tempo bitten.', en: 'This word lets you describe your progress honestly while kindly asking for a comfortable pace.' } },
    distractors: ['한국어를 아주', '문장을 읽고'], placeholderCaption: { de: 'Zwei Freunde sprechen entspannt, während ein offenes Koreanischheft kleine Fortschritte sichtbar macht.', en: 'Two friends talk at ease while an open Korean workbook makes small progress visible.' }, songMood: 'a patient, hopeful conversation that celebrates progress without rushing', visualNotes: 'Warm conversation between friends, open Korean notebook, gentle gestures and a quietly confident smile.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'naenyeone-tto-ol-geoyeyo', title: { de: 'Nächstes Jahr wieder', en: 'Back next year' },
    situation: { de: 'Deine Freundin fragt nach deinen Plänen für das nächste Jahr. Du sagst, dass du wiederkommen wirst.', en: 'Your friend asks about your plans for next year. Say that you will come back.' },
    pedagogicalGoal: 'Mit -(으)ㄹ 거예요 einen warmen, konkreten Plan für die Rückkehr nennen.',
    targetText: '저는 내년에 또 올 거예요.', baseText: { de: 'Ich werde nächstes Jahr wiederkommen.', en: 'I will come back next year.' },
    chunks: [{ targetText: '저는', baseText: { de: 'ich', en: 'I' } }, { targetText: '내년에 또', baseText: { de: 'nächstes Jahr wieder', en: 'again next year' } }, { targetText: '올 거예요.', baseText: { de: 'werde kommen.', en: 'will come.' } }],
    terms: [{ targetText: '저는', baseText: { de: 'ich mit Themapartikel', en: 'I with topic particle' } }, { targetText: '내년에', baseText: { de: 'nächstes Jahr', en: 'next year' } }, { targetText: '또', baseText: { de: 'wieder', en: 'again' } }, { targetText: '올', baseText: { de: 'kommen werdend', en: 'will come' } }, { targetText: '거예요', baseText: { de: 'werde', en: 'will' } }],
    recall: { before: '저는 ', answer: '내년에', after: ' 또 올 거예요.', fallbackChoices: ['내년에', '이번에', '오늘', '어제'] }, speakRequired: ['내년에', '올', '거예요'],
    sceneCaption: { de: 'Deine Freundin fragt hoffnungsvoll: „내년 계획이 있어요?“', en: 'Your friend asks hopefully: “내년 계획이 있어요?”' },
    trophyWord: { word: '내년', meaning: { de: 'nächstes Jahr', en: 'next year' }, example: '내년에 한국에 올 거예요.', whyThisWord: { de: 'Mit diesem Zeitwort machst du aus dem Abschied eine klare und hoffnungsvolle Rückkehrzusage.', en: 'This time word turns the goodbye into a clear, hopeful promise to return.' } },
    distractors: ['서울에서 일할', '한국어를 배우고'], placeholderCaption: { de: 'Zwei Freunde schauen auf einen Kalender des nächsten Jahres und lächeln über den Wiedersehensplan.', en: 'Two friends look at next year’s calendar and smile about their plan to meet again.' }, songMood: 'a hopeful promise to return, carried by a bright city memory', visualNotes: 'Cafe table with next year’s calendar, two friends smiling, Seoul skyline glowing softly beyond the window.',
  }),
  makeKoreanA2CompactLesson({
    slug: 'jeongmal-gamsahamnida-tto-mannayo', title: { de: 'Bis bald', en: 'See you again' },
    situation: { de: 'Es ist Zeit, dich von deiner Freundin zu verabschieden. Du bedankst dich herzlich und sagst, dass ihr euch wiederseht.', en: 'It is time to say goodbye to your friend. Thank her warmly and say that you will see each other again.' },
    pedagogicalGoal: 'Die eigene Geschichte mit einem herzlichen Dank und einem freundlichen Wiedersehen abschließen.',
    targetText: '그동안 정말 감사합니다. 또 만나요!', baseText: { de: 'Vielen Dank für alles. Wir sehen uns wieder!', en: 'Thank you so much for everything. See you again!' },
    chunks: [{ targetText: '그동안', baseText: { de: 'für all diese Zeit', en: 'for all this time' } }, { targetText: '정말 감사합니다.', baseText: { de: 'vielen Dank.', en: 'thank you so much.' } }, { targetText: '또 만나요!', baseText: { de: 'Wir sehen uns wieder!', en: 'See you again!' } }],
    terms: [{ targetText: '그동안', baseText: { de: 'in der ganzen Zeit', en: 'all this time' } }, { targetText: '정말', baseText: { de: 'wirklich; sehr', en: 'really; very much' } }, { targetText: '감사합니다', baseText: { de: 'danke', en: 'thank you' } }, { targetText: '또', baseText: { de: 'wieder', en: 'again' } }, { targetText: '만나요', baseText: { de: 'wir sehen uns', en: 'we meet; see each other' } }],
    recall: { before: '그동안 정말 ', answer: '감사합니다', after: '. 또 만나요!', fallbackChoices: ['감사합니다', '죄송합니다', '알겠습니다', '안녕하세요'] }, speakRequired: ['감사합니다', '또', '만나요'],
    sceneCaption: { de: 'Deine Freundin wird still und sagt: „오늘이 마지막이에요.“', en: 'Your friend grows quiet and says: “오늘이 마지막이에요.”' },
    trophyWord: { word: '또', meaning: { de: 'wieder', en: 'again' }, example: '또 만나요.', whyThisWord: { de: 'Dieses kleine Wort macht aus dem Abschied ein Wiedersehen und lässt deine Geschichte warm enden.', en: 'This small word turns a goodbye into a reunion and lets your story end warmly.' } },
    distractors: ['오늘이 마지막', '친구가 기다려요.'], placeholderCaption: { de: 'Zwei Freunde stehen am Abend vor einem Café und verabschieden sich mit einem warmen Lächeln.', en: 'Two friends stand outside a cafe in the evening and say goodbye with warm smiles.' }, songMood: 'a warm grateful farewell that feels like the beginning of the next reunion', visualNotes: 'Evening outside a neighborhood cafe, two friends smiling warmly, soft city lights and a hopeful goodbye gesture.',
  }),
]

export const KOREAN_A2_PRACTICAL_10_LESSONS: GuidedLessonDefinition[] = makeKoreanA2PracticalLessons(
  GUIDED_TODAY_PATH_KOREAN_A2_TEN_METADATA, koreanA2Practical10Inputs,
  { de: 'Du hast Koreanisch A2 abgeschlossen und kannst deine Geschichte erzählen, über deinen Fortschritt sprechen und dich herzlich verabschieden.', en: 'You have completed Korean A2 and can tell your story, talk about your progress, and say a warm goodbye.' },
)
