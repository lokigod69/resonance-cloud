/**
 * Japanese A1 guided tier — 10 paths × 10 lessons, bright-only, contentStatus
 * 'draft' until reviewed. Authoring contract (tmp\JAPANESE_A1_P1_P10_SPEC.md):
 * one-turn A1 phrases in です/ます register, standard beginner orthography
 * (survival kanji + kana, katakana loanwords, NEVER romaji in target fields),
 * and WAKACHIGAKI — every target sentence field carries single ASCII spaces at
 * word boundaries (particles attached to their host word) so the chunk/build/
 * recall machinery behaves exactly like the spaced languages. Chunks join with
 * single spaces to the corePhrase. Slugs are Hepburn romaji. The speech check
 * scores CJK targets space-insensitively (lib/guidedSpeechCheck.ts), so spaced
 * targets match unspaced ja-JP ASR transcripts.
 * No TTS voices exist yet — ids are NOT frozen until a batch runs.
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

const JAPANESE_GUIDED_TODAY_STEPS: GuidedLessonStep[] = ['scene', 'matchPairs', 'build', 'type', 'speak', 'complete']

// Learners may type the all-kana rendering of an answer that is written with
// kanji — pass that rendering as kanaVariant so it is accepted. Answers without
// kanji need no variant.
export function japaneseAccepted(answer: string, kanaVariant?: string): string[] {
  return kanaVariant && kanaVariant !== answer ? [answer, kanaVariant] : [answer]
}

type JapaneseVariantInput = {
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

type JapaneseLessonInput = {
  slug: string
  title: GuidedBaseContentText
  situation: GuidedLessonDefinition['situation']
  pedagogicalGoal: string
  variant: GuidedLessonVibeVariant
}

export function makeBrightJapaneseVariant(input: JapaneseVariantInput): GuidedLessonVibeVariant {
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
      language: 'ja-JP',
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
      genre: 'bright Japanese acoustic',
      mood: input.songMood,
    },
    visualNotes: input.visualNotes,
  }
}

export function makeJapanesePracticalLessons(
  metadata: GuidedPathMetadata,
  inputs: JapaneseLessonInput[],
  completionSituation: { de: string; en: string },
): GuidedLessonDefinition[] {
  return inputs.map((lessonInput, index) => {
    const lessonNumber = index + 1
    const pathNumber = metadata.id.replace('japanese-a1-practical-', '')
    const id = `japanese-a1-practical-${pathNumber}-lesson-${lessonNumber}-${lessonInput.slug}`
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
      steps: JAPANESE_GUIDED_TODAY_STEPS,
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

export type { JapaneseLessonInput, JapaneseVariantInput }

export const GUIDED_TODAY_PATH_JAPANESE_ONE_METADATA: GuidedPathMetadata = {
  id: 'japanese-a1-practical-1',
  title: 'Japanese A1 Practical 1',
  shortTitle: 'A1 Practical 1',
  subtitle: { de: 'Erster Kontakt auf Japanisch', en: 'First contact in Japanese' },
  level: 'A1',
  baseLanguage: 'German',
  targetLanguage: 'Japanese',
  estimatedMinutes: 5,
}

const japaneseA1Practical1Inputs: JapaneseLessonInput[] = [
  {
    slug: 'konnichiwa-eigo-dekimasu',
    title: { de: 'Hallo – geht Englisch?', en: 'Hello – is English okay?' },
    situation: {
      de: 'In der Lobby eines Hotels in Tokio begrüßt du die Person am Empfang und suchst vorsichtig nach einer gemeinsamen Sprache.',
      en: 'In a Tokyo hotel lobby, you greet the receptionist and gently look for a shared language.',
    },
    pedagogicalGoal: 'Mit こんにちは eröffnen und mit 英語は できますか höflich nach Englisch fragen, ohne eine Potentialform zu bilden.',
    variant: makeBrightJapaneseVariant({
      corePhrase: {
        targetText: 'こんにちは。 英語は できますか。',
        baseText: { de: 'Guten Tag. Geht Englisch?', en: 'Hello. Can you speak English?' },
      },
      meaning: {
        de: 'Eine freundliche Begrüßung mit einer einfachen, zurückhaltenden Frage nach Englisch.',
        en: 'A friendly greeting followed by a simple, restrained question about English.',
      },
      chunks: [
        { id: 'konnichiwa-eigo-dekimasu-greeting', targetText: 'こんにちは。', baseText: { de: 'Guten Tag.', en: 'Hello.' } },
        { id: 'konnichiwa-eigo-dekimasu-english', targetText: '英語は', baseText: { de: 'Englisch', en: 'English' } },
        { id: 'konnichiwa-eigo-dekimasu-possible', targetText: 'できますか。', baseText: { de: 'geht es?', en: 'is it possible?' } },
      ],
      lessonItems: [
        { id: 'konnichiwa-eigo-dekimasu-item-konnichiwa', targetText: 'こんにちは', baseText: { de: 'guten Tag (konnichiwa)', en: 'hello (konnichiwa)' }, acceptedAnswers: ['こんにちは'] },
        { id: 'konnichiwa-eigo-dekimasu-item-eigo', targetText: '英語', baseText: { de: 'Englisch (eigo)', en: 'English (eigo)' }, acceptedAnswers: ['英語', 'えいご'] },
        { id: 'konnichiwa-eigo-dekimasu-item-eigowa', targetText: '英語は', baseText: { de: 'Englisch (eigo wa; mit Themenpartikel)', en: 'English (eigo wa; with topic particle)' }, acceptedAnswers: ['英語は', 'えいごは'] },
        { id: 'konnichiwa-eigo-dekimasu-item-dekimasu', targetText: 'できます', baseText: { de: 'es geht / ist möglich (dekimasu)', en: 'it is possible / can do (dekimasu)' }, acceptedAnswers: ['できます'] },
      ],
      buildChips: ['こんにちは。', '英語は', 'できますか。', '日本語は', 'わかりません。'],
      typeRecall: {
        before: 'こんにちは。 ',
        answer: '英語は',
        after: ' できますか。',
        acceptedAnswers: japaneseAccepted('英語は', 'えいごは'),
        fallbackChoices: ['英語は', '日本語は', 'ドイツ語は', '中国語は'],
      },
      speakTarget: {
        baseCue: { de: 'Guten Tag. Geht Englisch?', en: 'Hello. Can you speak English?' },
        targetPhrase: 'こんにちは。 英語は できますか。',
        acceptedAnswers: ['こんにちは。 英語は できますか。', 'こんにちは。 えいごは できますか。'],
        requiredTokens: ['こんにちは。', '英語は', 'できますか。'],
        optionalTokens: [],
      },
      sceneCaption: {
        de: 'Am Hoteltresen wartet die Empfangsperson neben einem mehrsprachigen Stadtplan auf deinen ersten Satz.',
        en: 'At the hotel desk, the receptionist waits beside a multilingual city map for your first words.',
      },
      trophyWord: {
        word: '英語',
        meaning: { de: 'Englisch', en: 'English' },
        example: '英語は できますか。',
        whyThisWord: { de: '英語 benennt die häufigste gemeinsame Sprache für eine erste Reisehilfe; は macht sie zum Thema der Frage.', en: '英語 names the most common shared language for first-contact travel help; は makes it the topic of the question.' },
      },
      placeholderCaption: { de: 'Helle Hotellobby mit Stadtplan, kleinem Empfangstresen und einem offenen ersten Moment.', en: 'Bright hotel lobby with a city map, a small reception desk, and an open first-contact moment.' },
      songMood: 'bright tentative first greeting',
      visualNotes: 'Morning Tokyo hotel lobby, multilingual map in view, respectful eye contact before a first question.',
    }),
  },
  {
    slug: 'nihongo-amari-wakarimasen',
    title: { de: 'Japanisch noch nicht gut verstehen', en: 'Not understanding Japanese well yet' },
    situation: {
      de: 'Am Fahrkartenautomaten erklärt ein Bahnhofsmitarbeiter mehrere Tasten; du musst ehrlich sagen, dass dein Japanisch noch nicht reicht.',
      en: 'At a ticket machine, a station attendant explains several buttons; you need to say honestly that your Japanese is not strong yet.',
    },
    pedagogicalGoal: '日本語は mit あまり わかりません verbinden, um begrenztes Verstehen höflich und ohne Übertreibung auszudrücken.',
    variant: makeBrightJapaneseVariant({
      corePhrase: {
        targetText: '日本語は あまり わかりません。',
        baseText: { de: 'Ich verstehe Japanisch nicht besonders gut.', en: 'I do not understand Japanese very well.' },
      },
      meaning: {
        de: 'Eine ehrliche A1-Aussage, die fehlendes Sprachverständnis freundlich begrenzt.',
        en: 'An honest A1 statement that gently limits how much Japanese you understand.',
      },
      chunks: [
        { id: 'nihongo-amari-wakarimasen-language', targetText: '日本語は', baseText: { de: 'Japanisch', en: 'Japanese' } },
        { id: 'nihongo-amari-wakarimasen-degree', targetText: 'あまり', baseText: { de: 'nicht besonders', en: 'not very much' } },
        { id: 'nihongo-amari-wakarimasen-understand', targetText: 'わかりません。', baseText: { de: 'verstehe ich nicht.', en: 'I do not understand.' } },
      ],
      lessonItems: [
        { id: 'nihongo-amari-wakarimasen-item-nihongo', targetText: '日本語', baseText: { de: 'Japanisch (nihongo)', en: 'Japanese (nihongo)' }, acceptedAnswers: ['日本語', 'にほんご'] },
        { id: 'nihongo-amari-wakarimasen-item-nihongowa', targetText: '日本語は', baseText: { de: 'Japanisch (nihongo wa; mit Themenpartikel)', en: 'Japanese (nihongo wa; with topic particle)' }, acceptedAnswers: ['日本語は', 'にほんごは'] },
        { id: 'nihongo-amari-wakarimasen-item-amari', targetText: 'あまり', baseText: { de: 'nicht besonders (amari)', en: 'not very much (amari)' }, acceptedAnswers: ['あまり'] },
        { id: 'nihongo-amari-wakarimasen-item-wakarimasen', targetText: 'わかりません', baseText: { de: 'ich verstehe nicht (wakarimasen)', en: 'I do not understand (wakarimasen)' }, acceptedAnswers: ['わかりません'] },
      ],
      buildChips: ['日本語は', 'あまり', 'わかりません。', '今日は', '英語 です。'],
      typeRecall: {
        before: '',
        answer: '日本語は',
        after: ' あまり わかりません。',
        acceptedAnswers: japaneseAccepted('日本語は', 'にほんごは'),
        fallbackChoices: ['日本語は', '英語は', '漢字は', 'メニューは'],
      },
      speakTarget: {
        baseCue: { de: 'Ich verstehe Japanisch nicht besonders gut.', en: 'I do not understand Japanese very well.' },
        targetPhrase: '日本語は あまり わかりません。',
        acceptedAnswers: ['日本語は あまり わかりません。', 'にほんごは あまり わかりません。'],
        requiredTokens: ['日本語は', 'あまり', 'わかりません。'],
        optionalTokens: [],
      },
      sceneCaption: {
        de: 'Der Bildschirm des Fahrkartenautomaten zeigt viele Optionen, während die schnelle Erklärung noch in der Luft liegt.',
        en: 'The ticket-machine screen shows many options while the rapid explanation still hangs in the air.',
      },
      trophyWord: {
        word: '日本語',
        meaning: { de: 'Japanisch', en: 'Japanese' },
        example: '日本語は わかりません。',
        whyThisWord: { de: '日本語 ist der klare Sprachanker, wenn du dein eigenes Verstehen einordnen oder um sprachliche Hilfe bitten musst.', en: '日本語 is the clear language anchor when you need to frame your own understanding or ask for language help.' },
      },
      placeholderCaption: { de: 'Fahrkartenautomat mit dichtem Tastenfeld und einem geduldig wartenden Stationsmitarbeiter.', en: 'Ticket machine with a dense button panel and a station attendant waiting patiently.' },
      songMood: 'honest gentle language repair',
      visualNotes: 'Japan Rail ticket machine, route buttons glowing, learner composed but visibly unsure about the explanation.',
    }),
  },
  {
    slug: 'sumimasen-yukkuri-onegaishimasu',
    title: { de: 'Bitte langsamer', en: 'Slowly, please' },
    situation: {
      de: 'Am Bahnhofsschalter spricht die Person hinter dem Glas zu schnell; du bittest um ein ruhigeres Tempo.',
      en: 'At a station counter, the person behind the glass speaks too quickly; you ask for a calmer pace.',
    },
    pedagogicalGoal: 'Die feste Reparaturphrase すみません、 ゆっくり お願いします als höfliche Bitte um langsameres Sprechen einsetzen.',
    variant: makeBrightJapaneseVariant({
      corePhrase: {
        targetText: 'すみません、 ゆっくり お願いします。',
        baseText: { de: 'Entschuldigung, bitte langsam.', en: 'Excuse me, slowly please.' },
      },
      meaning: {
        de: 'Eine kurze Bitte, die das Sprechtempo senkt, ohne eine neue Grammatikform zu verlangen.',
        en: 'A short request that slows the pace without requiring a new grammar form.',
      },
      chunks: [
        { id: 'sumimasen-yukkuri-onegaishimasu-apology', targetText: 'すみません、', baseText: { de: 'Entschuldigung,', en: 'Excuse me,' } },
        { id: 'sumimasen-yukkuri-onegaishimasu-slowly', targetText: 'ゆっくり', baseText: { de: 'langsam', en: 'slowly' } },
        { id: 'sumimasen-yukkuri-onegaishimasu-request', targetText: 'お願いします。', baseText: { de: 'bitte.', en: 'please.' } },
      ],
      lessonItems: [
        { id: 'sumimasen-yukkuri-onegaishimasu-item-sumimasen', targetText: 'すみません', baseText: { de: 'Entschuldigung (sumimasen)', en: 'excuse me / sorry (sumimasen)' }, acceptedAnswers: ['すみません'] },
        { id: 'sumimasen-yukkuri-onegaishimasu-item-yukkuri', targetText: 'ゆっくり', baseText: { de: 'langsam (yukkuri)', en: 'slowly (yukkuri)' }, acceptedAnswers: ['ゆっくり'] },
        { id: 'sumimasen-yukkuri-onegaishimasu-item-onegai', targetText: 'お願い', baseText: { de: 'Bitte / Wunsch (onegai)', en: 'request / favor (onegai)' }, acceptedAnswers: ['お願い', 'おねがい'] },
        { id: 'sumimasen-yukkuri-onegaishimasu-item-onegaishimasu', targetText: 'お願いします', baseText: { de: 'bitte (onegaishimasu)', en: 'please (onegaishimasu)' }, acceptedAnswers: ['お願いします', 'おねがいします'] },
      ],
      buildChips: ['すみません、', 'ゆっくり', 'お願いします。', '今 です。', '大丈夫 です。'],
      typeRecall: {
        before: 'すみません、 ',
        answer: 'ゆっくり',
        after: ' お願いします。',
        acceptedAnswers: japaneseAccepted('ゆっくり'),
        fallbackChoices: ['ゆっくり', '明日', 'ここで', 'もう'],
      },
      speakTarget: {
        baseCue: { de: 'Entschuldigung, bitte langsam.', en: 'Excuse me, slowly please.' },
        targetPhrase: 'すみません、 ゆっくり お願いします。',
        acceptedAnswers: ['すみません、 ゆっくり お願いします。', 'すみません、 ゆっくり おねがいします。'],
        requiredTokens: ['すみません、', 'ゆっくり', 'お願いします。'],
        optionalTokens: [],
      },
      sceneCaption: {
        de: 'Hinter dem Bahnhofsschalter endet eine schnelle Erklärung, und die Person wartet auf dein Zeichen.',
        en: 'Behind the station counter, a rapid explanation ends and the staff member waits for your signal.',
      },
      trophyWord: {
        word: 'ゆっくり',
        meaning: { de: 'langsam / in Ruhe', en: 'slowly / at ease' },
        example: 'ゆっくり お願いします。',
        whyThisWord: { de: 'ゆっくり schafft sofort mehr Verarbeitungszeit und funktioniert mit お願いします als kompakte Reisebitte.', en: 'ゆっくり immediately creates more processing time and works with お願いします as a compact travel request.' },
      },
      placeholderCaption: { de: 'Ruhiger Bahnhofsschalter mit Gegensprechanlage und einer offenen Handbewegung für mehr Zeit.', en: 'Quiet station counter with an intercom and an open hand gesture asking for more time.' },
      songMood: 'patient slower station rhythm',
      visualNotes: 'Clean station service window, calm eye contact, the visual rhythm visibly easing after fast speech.',
    }),
  },
  {
    slug: 'sumimasen-mada-wakarimasen',
    title: { de: 'Noch nicht verstanden', en: 'Still not understood' },
    situation: {
      de: 'An der Kasse im Konbini zeigt die Person auf eine Auswahl am Display; auch nach der Erklärung ist sie dir noch unklar.',
      en: 'At a convenience-store register, the clerk points to an option on the display; even after the explanation, it is still unclear.',
    },
    pedagogicalGoal: 'Mit まだ わかりません knapp ausdrücken, dass das Verstehen noch nicht da ist.',
    variant: makeBrightJapaneseVariant({
      corePhrase: {
        targetText: 'すみません、 まだ わかりません。',
        baseText: { de: 'Entschuldigung, ich verstehe es noch nicht.', en: 'Sorry, I still do not understand.' },
      },
      meaning: {
        de: 'Eine ruhige zweite Reparaturphrase, wenn die erste Erklärung noch nicht geholfen hat.',
        en: 'A calm second repair phrase when the first explanation has not resolved the confusion.',
      },
      chunks: [
        { id: 'sumimasen-mada-wakarimasen-apology', targetText: 'すみません、', baseText: { de: 'Entschuldigung,', en: 'Sorry,' } },
        { id: 'sumimasen-mada-wakarimasen-still', targetText: 'まだ', baseText: { de: 'noch', en: 'still / yet' } },
        { id: 'sumimasen-mada-wakarimasen-understand', targetText: 'わかりません。', baseText: { de: 'ich verstehe nicht.', en: 'I do not understand.' } },
      ],
      lessonItems: [
        { id: 'sumimasen-mada-wakarimasen-item-sumimasen', targetText: 'すみません', baseText: { de: 'Entschuldigung (sumimasen)', en: 'sorry / excuse me (sumimasen)' }, acceptedAnswers: ['すみません'] },
        { id: 'sumimasen-mada-wakarimasen-item-mada', targetText: 'まだ', baseText: { de: 'noch / noch nicht (mada)', en: 'still / not yet (mada)' }, acceptedAnswers: ['まだ'] },
        { id: 'sumimasen-mada-wakarimasen-item-wakarimasen', targetText: 'わかりません', baseText: { de: 'ich verstehe nicht (wakarimasen)', en: 'I do not understand (wakarimasen)' }, acceptedAnswers: ['わかりません'] },
        { id: 'sumimasen-mada-wakarimasen-item-nihongo', targetText: '日本語', baseText: { de: 'Japanisch (nihongo)', en: 'Japanese (nihongo)' }, acceptedAnswers: ['日本語', 'にほんご'] },
      ],
      buildChips: ['すみません、', 'まだ', 'わかりません。', 'もう', '日本語 です。'],
      typeRecall: {
        before: 'すみません、 ',
        answer: 'まだ',
        after: ' わかりません。',
        acceptedAnswers: japaneseAccepted('まだ'),
        fallbackChoices: ['まだ', 'もう', 'たぶん', 'すぐ'],
      },
      speakTarget: {
        baseCue: { de: 'Entschuldigung, ich verstehe es noch nicht.', en: 'Sorry, I still do not understand.' },
        targetPhrase: 'すみません、 まだ わかりません。',
        acceptedAnswers: ['すみません、 まだ わかりません。'],
        requiredTokens: ['すみません、', 'まだ', 'わかりません。'],
        optionalTokens: [],
      },
      sceneCaption: {
        de: 'Das Kassendisplay bleibt auf einer unbekannten Auswahl stehen, während der Finger der Bedienung daneben ruht.',
        en: 'The checkout display remains on an unfamiliar option while the clerk’s finger rests beside it.',
      },
      trophyWord: {
        word: 'まだ',
        meaning: { de: 'noch / noch nicht', en: 'still / not yet' },
        example: 'まだ わかりません。',
        whyThisWord: { de: 'まだ macht deutlich, dass das Problem nur im gegenwärtigen Moment besteht und lässt Raum für eine weitere Erklärung.', en: 'まだ shows that the difficulty belongs to the present moment and leaves room for another explanation.' },
      },
      placeholderCaption: { de: 'Konbini-Kasse mit Touchscreen, unbekannter Auswahl und einem geduldigen kurzen Stillstand.', en: 'Convenience-store register with a touchscreen, an unfamiliar option, and a patient pause.' },
      songMood: 'steady second clarification',
      visualNotes: 'Japanese convenience-store checkout, option screen prominent, patient clerk and no embarrassment in the mood.',
    }),
  },
  {
    slug: 'korewa-nan-desuka',
    title: { de: 'Was ist das?', en: 'What is this?' },
    situation: {
      de: 'Im Ryokan liegt ein unbekannter Gegenstand neben dem Teeset; du zeigst darauf und fragst nach seiner Bedeutung.',
      en: 'At a ryokan, an unfamiliar object sits beside the tea set; you point to it and ask what it is.',
    },
    pedagogicalGoal: 'Mit これは ein sichtbares Ding zum Thema machen und mit 何 ですか nach seiner Identität fragen.',
    variant: makeBrightJapaneseVariant({
      corePhrase: {
        targetText: 'これは 何 ですか。',
        baseText: { de: 'Was ist das?', en: 'What is this?' },
      },
      meaning: {
        de: 'Die grundlegende Frage für einen sichtbaren, noch unbekannten Gegenstand.',
        en: 'The foundational question for a visible object you do not yet know.',
      },
      chunks: [
        { id: 'korewa-nan-desuka-topic', targetText: 'これは', baseText: { de: 'dieses hier', en: 'this' } },
        { id: 'korewa-nan-desuka-question', targetText: '何 ですか。', baseText: { de: 'was ist es?', en: 'what is it?' } },
      ],
      lessonItems: [
        { id: 'korewa-nan-desuka-item-kore', targetText: 'これ', baseText: { de: 'dieses hier (kore)', en: 'this one (kore)' }, acceptedAnswers: ['これ'] },
        { id: 'korewa-nan-desuka-item-korewa', targetText: 'これは', baseText: { de: 'dieses hier (kore wa; mit Themenpartikel)', en: 'this one (kore wa; with topic particle)' }, acceptedAnswers: ['これは'] },
        { id: 'korewa-nan-desuka-item-nan', targetText: '何', baseText: { de: 'was (nan)', en: 'what (nan)' }, acceptedAnswers: ['何', 'なん'] },
        { id: 'korewa-nan-desuka-item-desuka', targetText: 'ですか', baseText: { de: 'ist es? (desu ka)', en: 'is it? (desu ka)' }, acceptedAnswers: ['ですか'] },
      ],
      buildChips: ['これは', '何 ですか。', 'だれ ですか。', 'どこ ですか。'],
      typeRecall: {
        before: '',
        answer: 'これは',
        after: ' 何 ですか。',
        acceptedAnswers: japaneseAccepted('これは'),
        fallbackChoices: ['これは', 'それは', 'あれは', 'ここは'],
      },
      speakTarget: {
        baseCue: { de: 'Was ist das?', en: 'What is this?' },
        targetPhrase: 'これは 何 ですか。',
        acceptedAnswers: ['これは 何 ですか。', 'これは なん ですか。'],
        requiredTokens: ['これは', '何', 'ですか。'],
        optionalTokens: [],
      },
      sceneCaption: {
        de: 'Neben dem Ryokan-Teeset liegt ein kleines unbekanntes Utensil, und die Gastgeberin wartet auf deine Reaktion.',
        en: 'A small unfamiliar utensil lies beside the ryokan tea set, and the host waits for your reaction.',
      },
      trophyWord: {
        word: '何',
        meaning: { de: 'was', en: 'what' },
        example: 'これは 何 ですか。',
        whyThisWord: { de: '何 öffnet die einfachste Sachfrage und hilft bei Geräten, Speisen, Schildern und jedem unbekannten Gegenstand.', en: '何 opens the simplest object question and helps with devices, foods, signs, and any unfamiliar item.' },
      },
      placeholderCaption: { de: 'Tatami-Zimmer mit Teeset und einem kleinen rätselhaften Utensil im Vordergrund.', en: 'Tatami room with a tea set and one small mysterious utensil in the foreground.' },
      songMood: 'curious ryokan discovery',
      visualNotes: 'Quiet tatami room, tea implements carefully arranged, one unfamiliar object isolated for a genuine question.',
    }),
  },
  {
    slug: 'hontoni-domo-arigato',
    title: { de: 'Wirklich vielen Dank', en: 'Thank you very much indeed' },
    situation: {
      de: 'Ein Stationsmitarbeiter bringt dir die Geldbörse zurück, die am Automaten liegen geblieben ist; der erleichterte Moment braucht einen warmen Dank.',
      en: 'A station attendant returns the wallet you left at the machine; the relieved moment calls for warm thanks.',
    },
    pedagogicalGoal: 'ありがとうございます mit 本当に und どうも zu einem starken, aber weiterhin natürlichen Dank verstärken.',
    variant: makeBrightJapaneseVariant({
      corePhrase: {
        targetText: '本当に どうも ありがとうございます。',
        baseText: { de: 'Wirklich, vielen herzlichen Dank.', en: 'Thank you very much indeed.' },
      },
      meaning: {
        de: 'Ein besonders herzlicher Dank für konkrete, unerwartete Hilfe.',
        en: 'Especially warm thanks for concrete, unexpected help.',
      },
      chunks: [
        { id: 'hontoni-domo-arigato-sincere', targetText: '本当に', baseText: { de: 'wirklich', en: 'truly' } },
        { id: 'hontoni-domo-arigato-emphasis', targetText: 'どうも', baseText: { de: 'sehr / vielmals', en: 'very much' } },
        { id: 'hontoni-domo-arigato-thanks', targetText: 'ありがとうございます。', baseText: { de: 'vielen Dank.', en: 'thank you very much.' } },
      ],
      lessonItems: [
        { id: 'hontoni-domo-arigato-item-honto', targetText: '本当', baseText: { de: 'Wahrheit / wirklich (hontō)', en: 'truth / really (hontō)' }, acceptedAnswers: ['本当', 'ほんとう'] },
        { id: 'hontoni-domo-arigato-item-hontoni', targetText: '本当に', baseText: { de: 'wirklich (hontō ni)', en: 'truly (hontō ni)' }, acceptedAnswers: ['本当に', 'ほんとうに'] },
        { id: 'hontoni-domo-arigato-item-domo', targetText: 'どうも', baseText: { de: 'sehr / vielen Dank (dōmo)', en: 'very much / thanks (dōmo)' }, acceptedAnswers: ['どうも'] },
        { id: 'hontoni-domo-arigato-item-arigato', targetText: 'ありがとうございます', baseText: { de: 'vielen Dank (arigatō gozaimasu)', en: 'thank you very much (arigatō gozaimasu)' }, acceptedAnswers: ['ありがとうございます'] },
      ],
      buildChips: ['本当に', 'どうも', 'ありがとうございます。', 'すみません。', '本当 です。'],
      typeRecall: {
        before: '',
        answer: '本当に',
        after: ' どうも ありがとうございます。',
        acceptedAnswers: japaneseAccepted('本当に', 'ほんとうに'),
        fallbackChoices: ['本当に', '今日は', 'ここで', 'まだ'],
      },
      speakTarget: {
        baseCue: { de: 'Wirklich, vielen herzlichen Dank.', en: 'Thank you very much indeed.' },
        targetPhrase: '本当に どうも ありがとうございます。',
        acceptedAnswers: ['本当に どうも ありがとうございます。', 'ほんとうに どうも ありがとうございます。'],
        requiredTokens: ['本当に', 'どうも', 'ありがとうございます。'],
        optionalTokens: [],
      },
      sceneCaption: {
        de: 'Die wiedergefundene Geldbörse liegt auf dem Serviceschalter, und die Anspannung fällt sichtbar ab.',
        en: 'The recovered wallet rests on the service counter, and the tension visibly eases.',
      },
      trophyWord: {
        word: '本当',
        meaning: { de: 'Wahrheit / wirklich', en: 'truth / truly' },
        example: '本当に ありがとうございます。',
        whyThisWord: { de: '本当 trägt als 本当に ehrliche Verstärkung, wenn ein schlichtes Danke für die erhaltene Hilfe zu klein wirkt.', en: '本当 becomes the sincere intensifier 本当に when a simple thank-you feels too small for the help received.' },
      },
      placeholderCaption: { de: 'Serviceschalter im Bahnhof mit zurückgegebener Geldbörse und spürbarer Erleichterung.', en: 'Station service counter with a returned wallet and a clear sense of relief.' },
      songMood: 'relieved heartfelt gratitude',
      visualNotes: 'Lost-and-found counter, wallet centered between traveler and attendant, warm relief without melodrama.',
    }),
  },
  {
    slug: 'sumimasen-shitsumonga-arimasu',
    title: { de: 'Eine Frage ankündigen', en: 'Signaling a question' },
    situation: {
      de: 'Am vollen Bahnhofsservice steht ein Mitarbeiter zwischen zwei Aufgaben; du brauchst einen höflichen Einstieg für eine kurze Frage.',
      en: 'At a busy station service area, an attendant is between two tasks; you need a polite opening for a brief question.',
    },
    pedagogicalGoal: 'Mit すみません Aufmerksamkeit gewinnen und mit 質問が あります eine kurze Frage höflich ankündigen.',
    variant: makeBrightJapaneseVariant({
      corePhrase: {
        targetText: 'すみません、 質問が あります。',
        baseText: { de: 'Entschuldigung, ich habe eine Frage.', en: 'Excuse me, I have a question.' },
      },
      meaning: {
        de: 'Ein klarer Gesprächsöffner, der den Grund deiner Unterbrechung sofort nennt.',
        en: 'A clear conversation opener that immediately states why you are interrupting.',
      },
      chunks: [
        { id: 'sumimasen-shitsumonga-arimasu-attention', targetText: 'すみません、', baseText: { de: 'Entschuldigung,', en: 'Excuse me,' } },
        { id: 'sumimasen-shitsumonga-arimasu-question', targetText: '質問が', baseText: { de: 'eine Frage', en: 'a question' } },
        { id: 'sumimasen-shitsumonga-arimasu-have', targetText: 'あります。', baseText: { de: 'habe ich.', en: 'I have.' } },
      ],
      lessonItems: [
        { id: 'sumimasen-shitsumonga-arimasu-item-sumimasen', targetText: 'すみません', baseText: { de: 'Entschuldigung (sumimasen)', en: 'excuse me (sumimasen)' }, acceptedAnswers: ['すみません'] },
        { id: 'sumimasen-shitsumonga-arimasu-item-shitsumon', targetText: '質問', baseText: { de: 'Frage (shitsumon)', en: 'question (shitsumon)' }, acceptedAnswers: ['質問', 'しつもん'] },
        { id: 'sumimasen-shitsumonga-arimasu-item-shitsumonga', targetText: '質問が', baseText: { de: 'Frage (shitsumon ga; mit Subjektpartikel)', en: 'question (shitsumon ga; with subject particle)' }, acceptedAnswers: ['質問が', 'しつもんが'] },
        { id: 'sumimasen-shitsumonga-arimasu-item-arimasu', targetText: 'あります', baseText: { de: 'es gibt / ich habe (arimasu)', en: 'there is / I have (arimasu)' }, acceptedAnswers: ['あります'] },
      ],
      buildChips: ['すみません、', '質問が', 'あります。', '予約が', '荷物が'],
      typeRecall: {
        before: 'すみません、 ',
        answer: '質問が',
        after: ' あります。',
        acceptedAnswers: japaneseAccepted('質問が', 'しつもんが'),
        fallbackChoices: ['質問が', '予約が', '時間が', '地図が'],
      },
      speakTarget: {
        baseCue: { de: 'Entschuldigung, ich habe eine Frage.', en: 'Excuse me, I have a question.' },
        targetPhrase: 'すみません、 質問が あります。',
        acceptedAnswers: ['すみません、 質問が あります。', 'すみません、 しつもんが あります。'],
        requiredTokens: ['すみません、', '質問が', 'あります。'],
        optionalTokens: [],
      },
      sceneCaption: {
        de: 'Am Serviceschalter legt der Mitarbeiter gerade ein Formular ab, während hinter dir der Bahnhof weiterströmt.',
        en: 'At the service desk, the attendant sets down a form while the station continues flowing behind you.',
      },
      trophyWord: {
        word: '質問',
        meaning: { de: 'Frage', en: 'question' },
        example: '質問が あります。',
        whyThisWord: { de: '質問 benennt dein Anliegen direkt und macht eine Unterbrechung am Servicepunkt nachvollziehbar.', en: '質問 names your purpose directly and makes an interruption at a service point easy to understand.' },
      },
      placeholderCaption: { de: 'Belebter Bahnhofsschalter in einer kurzen Lücke zwischen zwei Aufgaben.', en: 'Busy station service desk caught in a brief gap between two tasks.' },
      songMood: 'clear respectful question opening',
      visualNotes: 'Active station concourse, attendant just becoming available, traveler poised to state a concise question.',
    }),
  },
  {
    slug: 'kono-kado-de-ii',
    title: { de: 'Ist diese Karte richtig?', en: 'Is this card okay?' },
    situation: {
      de: 'Vor dem Bahnhofs-Sperrtor hältst du deine Verkehrskarte über das Lesefeld und prüfst sie, bevor du sie auflegst.',
      en: 'At the station ticket gate, you hold your transit card above the reader and check it before tapping.',
    },
    pedagogicalGoal: 'Mit この カードで いい ですか eine konkrete Karte als passende Option bestätigen lassen.',
    variant: makeBrightJapaneseVariant({
      corePhrase: {
        targetText: 'この カードで いい ですか。',
        baseText: { de: 'Ist diese Karte in Ordnung?', en: 'Is this card okay?' },
      },
      meaning: {
        de: 'Eine kurze Bestätigungsfrage, bevor du eine Verkehrskarte am Sperrtor benutzt.',
        en: 'A short confirmation question before using a transit card at the gate.',
      },
      chunks: [
        { id: 'kono-kado-de-ii-method', targetText: 'この カードで', baseText: { de: 'mit dieser Karte', en: 'with this card' } },
        { id: 'kono-kado-de-ii-okay', targetText: 'いい', baseText: { de: 'in Ordnung', en: 'okay' } },
        { id: 'kono-kado-de-ii-question', targetText: 'ですか。', baseText: { de: 'ist es?', en: 'is it?' } },
      ],
      lessonItems: [
        { id: 'kono-kado-de-ii-item-kono', targetText: 'この', baseText: { de: 'dieser / diese / dieses (kono)', en: 'this (kono)' }, acceptedAnswers: ['この'] },
        { id: 'kono-kado-de-ii-item-kado', targetText: 'カード', baseText: { de: 'Karte (kādo)', en: 'card (kādo)' }, acceptedAnswers: ['カード'] },
        { id: 'kono-kado-de-ii-item-kadode', targetText: 'カードで', baseText: { de: 'mit der Karte (kādo de; mit Mittelpartikel)', en: 'by card (kādo de; with means particle)' }, acceptedAnswers: ['カードで'] },
        { id: 'kono-kado-de-ii-item-ii', targetText: 'いい', baseText: { de: 'gut / in Ordnung (ii)', en: 'good / okay (ii)' }, acceptedAnswers: ['いい'] },
      ],
      buildChips: ['この カードで', 'いい', 'ですか。', '現金で', 'だめ ですか。'],
      typeRecall: {
        before: 'この ',
        answer: 'カードで',
        after: ' いい ですか。',
        acceptedAnswers: japaneseAccepted('カードで'),
        fallbackChoices: ['カードで', '現金で', '切符で', 'アプリで'],
      },
      speakTarget: {
        baseCue: { de: 'Ist diese Karte in Ordnung?', en: 'Is this card okay?' },
        targetPhrase: 'この カードで いい ですか。',
        acceptedAnswers: ['この カードで いい ですか。'],
        requiredTokens: ['カードで', 'いい', 'ですか。'],
        optionalTokens: ['この'],
      },
      sceneCaption: {
        de: 'Die Karte schwebt noch über dem leuchtenden Lesefeld, während ein Stationsmitarbeiter neben dem Sperrtor steht.',
        en: 'The card still hovers above the glowing reader while a station attendant stands beside the gate.',
      },
      trophyWord: {
        word: 'カード',
        meaning: { de: 'Karte', en: 'card' },
        example: 'この カードで いい ですか。',
        whyThisWord: { de: 'カード deckt Verkehrskarten und Zahlungskarten ab; mit で fragst du, ob sie als Mittel passt.', en: 'カード covers transit and payment cards; with で, you ask whether it works as the means.',
        },
      },
      placeholderCaption: { de: 'Japanisches Sperrtor mit leuchtendem Kartenleser und einer Karte direkt darüber.', en: 'Japanese ticket gate with a glowing card reader and a card poised directly above it.' },
      songMood: 'clean ticket-gate confirmation',
      visualNotes: 'Modern rail gate, transit card in the foreground, attendant nearby, action paused just before the tap.',
    }),
  },
  {
    slug: 'sumimasen-toire-doko',
    title: { de: 'Wo ist die Toilette?', en: 'Where is the restroom?' },
    situation: {
      de: 'In einer großen Bahnhofshalle führen mehrere Schilder in verschiedene Richtungen; du fragst einen Mitarbeiter nach der Toilette.',
      en: 'In a large station concourse, several signs point in different directions; you ask a staff member for the restroom.',
    },
    pedagogicalGoal: 'トイレは als Ortsthema setzen und mit どこ ですか eine direkte höfliche Ortsfrage bilden.',
    variant: makeBrightJapaneseVariant({
      corePhrase: {
        targetText: 'すみません、 トイレは どこ ですか。',
        baseText: { de: 'Entschuldigung, wo ist die Toilette?', en: 'Excuse me, where is the restroom?' },
      },
      meaning: {
        de: 'Eine sofort einsetzbare Wegfrage für Bahnhöfe, Läden und Restaurants.',
        en: 'An immediately useful location question for stations, shops, and restaurants.',
      },
      chunks: [
        { id: 'sumimasen-toire-doko-attention', targetText: 'すみません、', baseText: { de: 'Entschuldigung,', en: 'Excuse me,' } },
        { id: 'sumimasen-toire-doko-place', targetText: 'トイレは', baseText: { de: 'die Toilette', en: 'the restroom' } },
        { id: 'sumimasen-toire-doko-question', targetText: 'どこ ですか。', baseText: { de: 'wo ist sie?', en: 'where is it?' } },
      ],
      lessonItems: [
        { id: 'sumimasen-toire-doko-item-sumimasen', targetText: 'すみません', baseText: { de: 'Entschuldigung (sumimasen)', en: 'excuse me (sumimasen)' }, acceptedAnswers: ['すみません'] },
        { id: 'sumimasen-toire-doko-item-toire', targetText: 'トイレ', baseText: { de: 'Toilette (toire)', en: 'restroom / toilet (toire)' }, acceptedAnswers: ['トイレ'] },
        { id: 'sumimasen-toire-doko-item-toirewa', targetText: 'トイレは', baseText: { de: 'Toilette (toire wa; mit Themenpartikel)', en: 'restroom (toire wa; with topic particle)' }, acceptedAnswers: ['トイレは'] },
        { id: 'sumimasen-toire-doko-item-doko', targetText: 'どこ', baseText: { de: 'wo (doko)', en: 'where (doko)' }, acceptedAnswers: ['どこ'] },
      ],
      buildChips: ['すみません、', 'トイレは', 'どこ ですか。', '駅は', 'いつ ですか。'],
      typeRecall: {
        before: 'すみません、 ',
        answer: 'トイレは',
        after: ' どこ ですか。',
        acceptedAnswers: japaneseAccepted('トイレは'),
        fallbackChoices: ['トイレは', '改札は', '出口は', 'ホテルは'],
      },
      speakTarget: {
        baseCue: { de: 'Entschuldigung, wo ist die Toilette?', en: 'Excuse me, where is the restroom?' },
        targetPhrase: 'すみません、 トイレは どこ ですか。',
        acceptedAnswers: ['すみません、 トイレは どこ ですか。'],
        requiredTokens: ['トイレは', 'どこ', 'ですか。'],
        optionalTokens: ['すみません、'],
      },
      sceneCaption: {
        de: 'Unter den hohen Bahnhofsschildern zweigen mehrere Korridore ab, und ein uniformierter Mitarbeiter ist in Reichweite.',
        en: 'Beneath the high station signs, several corridors branch away and a uniformed attendant is within reach.',
      },
      trophyWord: {
        word: 'トイレ',
        meaning: { de: 'Toilette', en: 'restroom / toilet' },
        example: 'トイレは どこ ですか。',
        whyThisWord: { de: 'トイレ ist das übliche alltagssprachliche Wort auf Wegweisern und in kurzen Ortsfragen.', en: 'トイレ is the everyday word used on signs and in short location questions.' },
      },
      placeholderCaption: { de: 'Weite Bahnhofshalle mit verzweigenden Gängen und mehreren Piktogramm-Schildern.', en: 'Wide station concourse with branching corridors and several pictogram signs.' },
      songMood: 'clear station wayfinding',
      visualNotes: 'Large Japanese rail concourse, overhead symbols, multiple possible corridors and one approachable attendant.',
    }),
  },
  {
    slug: 'soredewa-mata-aimasho',
    title: { de: 'Bis zum nächsten Mal', en: 'Until next time' },
    situation: {
      de: 'Beim Auschecken aus dem Ryokan verabschiedet sich ein Gast, mit dem du dich angefreundet hast, am Eingang von dir.',
      en: 'As you check out of the ryokan, a fellow guest you have befriended says goodbye to you at the entrance.',
    },
    pedagogicalGoal: 'Mit それでは den Abschied einleiten und mit また お会いしましょう ein freundliches Wiedersehen wünschen.',
    variant: makeBrightJapaneseVariant({
      corePhrase: {
        targetText: 'それでは、 また お会いしましょう。',
        baseText: { de: 'Dann bis zum nächsten Mal.', en: 'Then, let us meet again.' },
      },
      meaning: {
        de: 'Ein höflicher Abschied, der den Kontakt freundlich offenlässt.',
        en: 'A polite farewell that leaves the connection warmly open.',
      },
      chunks: [
        { id: 'soredewa-mata-aimasho-transition', targetText: 'それでは、', baseText: { de: 'nun dann,', en: 'well then,' } },
        { id: 'soredewa-mata-aimasho-again', targetText: 'また', baseText: { de: 'wieder', en: 'again' } },
        { id: 'soredewa-mata-aimasho-meet', targetText: 'お会いしましょう。', baseText: { de: 'sehen wir uns wieder.', en: 'let us meet again.' } },
      ],
      lessonItems: [
        { id: 'soredewa-mata-aimasho-item-soredewa', targetText: 'それでは', baseText: { de: 'nun dann (sore de wa)', en: 'well then (sore de wa)' }, acceptedAnswers: ['それでは'] },
        { id: 'soredewa-mata-aimasho-item-mata', targetText: 'また', baseText: { de: 'wieder / bis dann (mata)', en: 'again / see you (mata)' }, acceptedAnswers: ['また'] },
        { id: 'soredewa-mata-aimasho-item-oai', targetText: 'お会い', baseText: { de: 'Treffen, höflich (o-ai)', en: 'meeting, politely (o-ai)' }, acceptedAnswers: ['お会い', 'おあい'] },
        { id: 'soredewa-mata-aimasho-item-oaimasho', targetText: 'お会いしましょう', baseText: { de: 'sehen wir uns wieder (o-ai shimashō)', en: 'let us meet again (o-ai shimashō)' }, acceptedAnswers: ['お会いしましょう', 'おあいしましょう'] },
      ],
      buildChips: ['それでは、', 'また', 'お会いしましょう。', 'さようなら。', '明日 です。'],
      typeRecall: {
        before: 'それでは、 ',
        answer: 'また',
        after: ' お会いしましょう。',
        acceptedAnswers: japaneseAccepted('また'),
        fallbackChoices: ['また', '今日', 'ここで', 'ゆっくり'],
      },
      speakTarget: {
        baseCue: { de: 'Dann bis zum nächsten Mal.', en: 'Then, let us meet again.' },
        targetPhrase: 'それでは、 また お会いしましょう。',
        acceptedAnswers: ['それでは、 また お会いしましょう。', 'それでは、 また おあいしましょう。'],
        requiredTokens: ['それでは、', 'また', 'お会いしましょう。'],
        optionalTokens: [],
      },
      sceneCaption: {
        de: 'Die Schuhe sind angezogen, das Gepäck steht an der Tür, und die Gastgeberin bleibt unter dem Eingangsvorhang zurück.',
        en: 'Shoes are on, luggage is by the door, and the host remains beneath the entrance curtain.',
      },
      trophyWord: {
        word: 'また',
        meaning: { de: 'wieder / bis dann', en: 'again / see you' },
        example: 'また お会いしましょう。',
        whyThisWord: { de: 'また ist der kleine Abschiedsanker, der ein nächstes Treffen andeutet, ohne einen festen Termin zu brauchen.', en: 'また is the small farewell anchor that points toward another meeting without requiring a fixed plan.' },
      },
      placeholderCaption: { de: 'Ryokan-Eingang mit Reisetasche, Noren-Vorhang und einem respektvollen Abschiedsmoment.', en: 'Ryokan entrance with a travel bag, noren curtain, and a respectful farewell moment.' },
      songMood: 'warm open-ended farewell',
      visualNotes: 'Traditional inn threshold, traveler leaving with luggage, host staying beneath the noren, gentle daytime light.',
    }),
  },
]

export const JAPANESE_A1_PRACTICAL_1_LESSONS: GuidedLessonDefinition[] = makeJapanesePracticalLessons(
  GUIDED_TODAY_PATH_JAPANESE_ONE_METADATA,
  japaneseA1Practical1Inputs,
  { de: 'Du hast Japanisch A1 Praxis 1 abgeschlossen.', en: 'You have completed Japanese A1 Practical 1.' },
)

export const GUIDED_TODAY_PATH_JAPANESE_TWO_METADATA: GuidedPathMetadata = {
  id: 'japanese-a1-practical-2',
  title: 'Japanese A1 Practical 2',
  shortTitle: 'A1 Practical 2',
  subtitle: { de: 'Kleine Hilfen und einfache Entscheidungen', en: 'Small help and simple choices' },
  level: 'A1',
  baseLanguage: 'German',
  targetLanguage: 'Japanese',
  estimatedMinutes: 5,
}

const japaneseA1Practical2Inputs: JapaneseLessonInput[] = [
  {
    slug: 'sumimasen-chotto-ii-desuka',
    title: { de: 'Darf ich kurz?', en: 'May I have a moment?' },
    situation: {
      de: 'Am Fahrkartenautomaten kommst du mit dem Streckenmenü nicht weiter; ein Stationsmitarbeiter ist in der Nähe.',
      en: 'At a ticket machine, you cannot move forward through the route menu; a station attendant is nearby.',
    },
    pedagogicalGoal: 'Mit すみません、 ちょっと いい ですか vorsichtig einen kurzen Hilfsmoment eröffnen.',
    variant: makeBrightJapaneseVariant({
      corePhrase: {
        targetText: 'すみません、 ちょっと いい ですか。',
        baseText: { de: 'Entschuldigung, hätten Sie einen Moment?', en: 'Excuse me, may I have a moment?' },
      },
      meaning: {
        de: 'Ein vorsichtiger Einstieg, bevor du auf das Problem am Automaten zeigst.',
        en: 'A cautious opening before you point out the problem at the machine.',
      },
      chunks: [
        { id: 'sumimasen-chotto-ii-desuka-attention', targetText: 'すみません、', baseText: { de: 'Entschuldigung,', en: 'Excuse me,' } },
        { id: 'sumimasen-chotto-ii-desuka-moment', targetText: 'ちょっと', baseText: { de: 'einen Moment', en: 'a moment' } },
        { id: 'sumimasen-chotto-ii-desuka-question', targetText: 'いい ですか。', baseText: { de: 'ist das in Ordnung?', en: 'is that okay?' } },
      ],
      lessonItems: [
        { id: 'sumimasen-chotto-ii-desuka-item-sumimasen', targetText: 'すみません', baseText: { de: 'Entschuldigung (sumimasen)', en: 'excuse me (sumimasen)' }, acceptedAnswers: ['すみません'] },
        { id: 'sumimasen-chotto-ii-desuka-item-chotto', targetText: 'ちょっと', baseText: { de: 'ein wenig / kurz (chotto)', en: 'a little / briefly (chotto)' }, acceptedAnswers: ['ちょっと'] },
        { id: 'sumimasen-chotto-ii-desuka-item-ii', targetText: 'いい', baseText: { de: 'gut / in Ordnung (ii)', en: 'good / okay (ii)' }, acceptedAnswers: ['いい'] },
        { id: 'sumimasen-chotto-ii-desuka-item-desuka', targetText: 'ですか', baseText: { de: 'ist es? (desu ka)', en: 'is it? (desu ka)' }, acceptedAnswers: ['ですか'] },
      ],
      buildChips: ['すみません、', 'ちょっと', 'いい ですか。', '明日', '駅は どこ ですか。'],
      typeRecall: {
        before: 'すみません、 ',
        answer: 'ちょっと',
        after: ' いい ですか。',
        acceptedAnswers: japaneseAccepted('ちょっと'),
        fallbackChoices: ['ちょっと', '今夜', '地図を', '駅は'],
      },
      speakTarget: {
        baseCue: { de: 'Entschuldigung, hätten Sie einen Moment?', en: 'Excuse me, may I have a moment?' },
        targetPhrase: 'すみません、 ちょっと いい ですか。',
        acceptedAnswers: ['すみません、 ちょっと いい ですか。'],
        requiredTokens: ['すみません、', 'ちょっと', 'いい'],
        optionalTokens: ['ですか。'],
      },
      sceneCaption: {
        de: 'Der Fahrkartenautomat zeigt ein verschachteltes Streckenmenü, während ein uniformierter Mitarbeiter am Rand des Bereichs steht.',
        en: 'The ticket machine shows a layered route menu while a uniformed attendant stands at the edge of the area.',
      },
      trophyWord: {
        word: 'ちょっと',
        meaning: { de: 'ein wenig / kurz', en: 'a little / briefly' },
        example: 'ちょっと いい ですか。',
        whyThisWord: { de: 'ちょっと macht die Unterbrechung klein und höflich, bevor du auf das eigentliche Problem zeigst.', en: 'ちょっと makes the interruption small and polite before you point to the actual problem.' },
      },
      placeholderCaption: { de: 'Fahrkartenautomat mit komplexem Streckenmenü und einem erreichbaren Stationsmitarbeiter.', en: 'Ticket machine with a complex route menu and an approachable station attendant.' },
      songMood: 'gentle opening for help',
      visualNotes: 'Rail ticket machine at eye level, route-selection screen unresolved, attendant just becoming available for a brief interruption.',
    }),
  },
  {
    slug: 'sumimasen-kokoni-kaite-kudasai',
    title: { de: 'Bitte hier aufschreiben', en: 'Please write it here' },
    situation: {
      de: 'An der Hotelrezeption ist auf deinem Handy ein leeres Adressfeld geöffnet; du brauchst den Ortsnamen in Schriftform.',
      en: 'At the hotel reception desk, an empty address field is open on your phone; you need the place name in writing.',
    },
    pedagogicalGoal: 'Die feste Bitte 書いて ください mit ここに verbinden, um eine Notiz genau an der gezeigten Stelle zu erhalten.',
    variant: makeBrightJapaneseVariant({
      corePhrase: {
        targetText: 'すみません、 ここに 書いて ください。',
        baseText: { de: 'Entschuldigung, bitte schreiben Sie es hier auf.', en: 'Excuse me, please write it here.' },
      },
      meaning: {
        de: 'Eine konkrete Schreibbitte für ein Handyfeld, einen Zettel oder ein Formular.',
        en: 'A concrete writing request for a phone field, note, or form.',
      },
      chunks: [
        { id: 'sumimasen-kokoni-kaite-kudasai-attention', targetText: 'すみません、', baseText: { de: 'Entschuldigung,', en: 'Excuse me,' } },
        { id: 'sumimasen-kokoni-kaite-kudasai-place', targetText: 'ここに', baseText: { de: 'hierhin', en: 'here' } },
        { id: 'sumimasen-kokoni-kaite-kudasai-write', targetText: '書いて ください。', baseText: { de: 'schreiben Sie es bitte.', en: 'please write it.' } },
      ],
      lessonItems: [
        { id: 'sumimasen-kokoni-kaite-kudasai-item-sumimasen', targetText: 'すみません', baseText: { de: 'Entschuldigung (sumimasen)', en: 'excuse me (sumimasen)' }, acceptedAnswers: ['すみません'] },
        { id: 'sumimasen-kokoni-kaite-kudasai-item-kokoni', targetText: 'ここに', baseText: { de: 'hierhin (koko ni; mit Zielpartikel)', en: 'here (koko ni; with destination particle)' }, acceptedAnswers: ['ここに'] },
        { id: 'sumimasen-kokoni-kaite-kudasai-item-kaite', targetText: '書いて', baseText: { de: 'schreiben Sie (kaite)', en: 'write (kaite)' }, acceptedAnswers: ['書いて', 'かいて'] },
        { id: 'sumimasen-kokoni-kaite-kudasai-item-kudasai', targetText: 'ください', baseText: { de: 'bitte tun Sie (kudasai)', en: 'please do (kudasai)' }, acceptedAnswers: ['ください', '下さい'] },
      ],
      buildChips: ['すみません、', 'ここに', '書いて ください。', 'あそこに', '見せて ください。'],
      typeRecall: {
        before: 'すみません、 ',
        answer: 'ここに',
        after: ' 書いて ください。',
        acceptedAnswers: japaneseAccepted('ここに'),
        fallbackChoices: ['ここに', 'あそこに', '駅に', '店に'],
      },
      speakTarget: {
        baseCue: { de: 'Entschuldigung, bitte schreiben Sie es hier auf.', en: 'Excuse me, please write it here.' },
        targetPhrase: 'すみません、 ここに 書いて ください。',
        acceptedAnswers: ['すみません、 ここに 書いて ください。', 'すみません、 ここに かいて ください。', 'すみません、 ここに 書いて 下さい。'],
        requiredTokens: ['すみません、', 'ここに', '書いて'],
        optionalTokens: ['ください。'],
      },
      sceneCaption: {
        de: 'Auf dem Handy leuchtet ein leeres Adressfeld, und dein Finger markiert die freie Zeile am Empfangstresen.',
        en: 'An empty address field glows on the phone, and your finger marks the blank line at the reception desk.',
      },
      trophyWord: {
        word: '書く',
        meaning: { de: 'schreiben', en: 'to write' },
        example: 'ここに 書いて ください。',
        whyThisWord: { de: '書く steckt in der festen Bitte 書いて ください und macht Adressen, Namen oder Zimmernummern sichtbar.', en: '書く is the base of the fixed request 書いて ください and makes addresses, names, or room numbers visible.' },
      },
      placeholderCaption: { de: 'Nahaufnahme eines Handys mit leerem Adressfeld auf einem ruhigen Rezeptionstresen.', en: 'Close-up of a phone with a blank address field on a quiet reception counter.' },
      songMood: 'precise written guidance',
      visualNotes: 'Hotel reception counter, phone search field clearly blank, fingertip indicating the exact place for text.',
    }),
  },
  {
    slug: 'sumimasen-kono-chizu-misete-kudasai',
    title: { de: 'Bitte die Karte zeigen', en: 'Please show me the map' },
    situation: {
      de: 'In der Bahnhofsinformation liegt ein gefalteter Stadtplan hinter dem Tresen; du möchtest ihn für die Wegsuche sehen.',
      en: 'At the station information desk, a folded city map lies behind the counter; you want to see it for directions.',
    },
    pedagogicalGoal: 'Die feste Bitte 見せて ください mit その 地図を auf einen sichtbaren Gegenstand richten.',
    variant: makeBrightJapaneseVariant({
      corePhrase: {
        targetText: 'すみません、 その 地図を 見せて ください。',
        baseText: { de: 'Entschuldigung, zeigen Sie mir bitte diese Karte.', en: 'Excuse me, please show me this map.' },
      },
      meaning: {
        de: 'Eine visuelle Hilfsbitte, wenn eine Karte verständlicher ist als eine längere Erklärung.',
        en: 'A visual help request when a map is easier to understand than a longer explanation.',
      },
      chunks: [
        { id: 'sumimasen-kono-chizu-misete-kudasai-attention', targetText: 'すみません、', baseText: { de: 'Entschuldigung,', en: 'Excuse me,' } },
        { id: 'sumimasen-kono-chizu-misete-kudasai-map', targetText: 'その 地図を', baseText: { de: 'die Karte dort', en: 'that map' } },
        { id: 'sumimasen-kono-chizu-misete-kudasai-show', targetText: '見せて ください。', baseText: { de: 'zeigen Sie sie bitte.', en: 'please show it.' } },
      ],
      lessonItems: [
        { id: 'sumimasen-kono-chizu-misete-kudasai-item-sumimasen', targetText: 'すみません', baseText: { de: 'Entschuldigung (sumimasen)', en: 'excuse me (sumimasen)' }, acceptedAnswers: ['すみません'] },
        { id: 'sumimasen-kono-chizu-misete-kudasai-item-sono', targetText: 'その', baseText: { de: 'der / die / das dort (sono)', en: 'that (sono)' }, acceptedAnswers: ['その'] },
        { id: 'sumimasen-kono-chizu-misete-kudasai-item-chizu', targetText: '地図', baseText: { de: 'Karte / Stadtplan (chizu)', en: 'map (chizu)' }, acceptedAnswers: ['地図', 'ちず'] },
        { id: 'sumimasen-kono-chizu-misete-kudasai-item-chizuwo', targetText: '地図を', baseText: { de: 'Karte (chizu o; mit Objektpartikel)', en: 'map (chizu o; with object particle)' }, acceptedAnswers: ['地図を', 'ちずを'] },
        { id: 'sumimasen-kono-chizu-misete-kudasai-item-misete', targetText: '見せて', baseText: { de: 'zeigen Sie (misete)', en: 'show (misete)' }, acceptedAnswers: ['見せて', 'みせて'] },
        { id: 'sumimasen-kono-chizu-misete-kudasai-item-kudasai', targetText: 'ください', baseText: { de: 'bitte tun Sie (kudasai)', en: 'please do (kudasai)' }, acceptedAnswers: ['ください', '下さい'] },
      ],
      buildChips: ['すみません、', 'その 地図を', '見せて ください。', 'メニューを', '書いて ください。'],
      typeRecall: {
        before: 'すみません、 その ',
        answer: '地図を',
        after: ' 見せて ください。',
        acceptedAnswers: japaneseAccepted('地図を', 'ちずを'),
        fallbackChoices: ['地図を', 'メニューを', '切符を', 'レシートを'],
      },
      speakTarget: {
        baseCue: { de: 'Entschuldigung, zeigen Sie mir bitte diese Karte.', en: 'Excuse me, please show me this map.' },
        targetPhrase: 'すみません、 その 地図を 見せて ください。',
        acceptedAnswers: ['すみません、 その 地図を 見せて ください。', 'すみません、 その ちずを みせて ください。', 'すみません、 その 地図を 見せて 下さい。'],
        requiredTokens: ['すみません、', '地図を', '見せて'],
        optionalTokens: ['この', 'ください。'],
      },
      sceneCaption: {
        de: 'Hinter dem Informationsschalter liegt ein gefalteter Stadtplan, während auf deinem Handy nur ein kleiner Kartenausschnitt sichtbar ist.',
        en: 'A folded city map lies behind the information counter while only a tiny map section is visible on your phone.',
      },
      trophyWord: {
        word: '地図',
        meaning: { de: 'Karte / Stadtplan', en: 'map' },
        example: '地図を 見せて ください。',
        whyThisWord: { de: '地図 macht komplizierte Wege sichtbar und ist an großen Bahnhöfen oft hilfreicher als viele Richtungswörter.', en: '地図 makes complex routes visible and is often more useful than many direction words in large stations.' },
      },
      placeholderCaption: { de: 'Informationsschalter mit gefaltetem Stadtplan und kleinem Handy-Kartenausschnitt.', en: 'Information desk with a folded city map and a small phone map view.' },
      songMood: 'focused visual wayfinding',
      visualNotes: 'Station information counter, paper map in reach, phone map too zoomed-in, clear visual need for a wider view.',
    }),
  },
  {
    slug: 'dorega-ii-desuka',
    title: { de: 'Welches ist gut?', en: 'Which one is good?' },
    situation: {
      de: 'In einem Souvenirladen liegen zwei ähnliche Teesorten vor dir; die Verkäuferin wartet auf deine Auswahl.',
      en: 'In a souvenir shop, two similar teas are in front of you; the shopkeeper waits for your choice.',
    },
    pedagogicalGoal: 'Mit どれが いい ですか zwischen sichtbaren Möglichkeiten nach einer Empfehlung fragen.',
    variant: makeBrightJapaneseVariant({
      corePhrase: {
        targetText: 'どれが いい ですか。',
        baseText: { de: 'Welches ist gut?', en: 'Which one is good?' },
      },
      meaning: {
        de: 'Eine einfache Empfehlungsfrage, wenn mehrere Dinge direkt sichtbar sind.',
        en: 'A simple recommendation question when several items are directly visible.',
      },
      chunks: [
        { id: 'dorega-ii-desuka-choice', targetText: 'どれが', baseText: { de: 'welches davon', en: 'which one' } },
        { id: 'dorega-ii-desuka-good', targetText: 'いい', baseText: { de: 'gut', en: 'good' } },
        { id: 'dorega-ii-desuka-question', targetText: 'ですか。', baseText: { de: 'ist es?', en: 'is it?' } },
      ],
      lessonItems: [
        { id: 'dorega-ii-desuka-item-dore', targetText: 'どれ', baseText: { de: 'welches (dore)', en: 'which one (dore)' }, acceptedAnswers: ['どれ'] },
        { id: 'dorega-ii-desuka-item-dorega', targetText: 'どれが', baseText: { de: 'welches (dore ga; mit Subjektpartikel)', en: 'which one (dore ga; with subject particle)' }, acceptedAnswers: ['どれが'] },
        { id: 'dorega-ii-desuka-item-ii', targetText: 'いい', baseText: { de: 'gut / passend (ii)', en: 'good / suitable (ii)' }, acceptedAnswers: ['いい'] },
        { id: 'dorega-ii-desuka-item-desuka', targetText: 'ですか', baseText: { de: 'ist es? (desu ka)', en: 'is it? (desu ka)' }, acceptedAnswers: ['ですか'] },
      ],
      buildChips: ['どれが', 'いい', 'ですか。', 'これが', 'ありますか。'],
      typeRecall: {
        before: '',
        answer: 'どれが',
        after: ' いい ですか。',
        acceptedAnswers: japaneseAccepted('どれが'),
        fallbackChoices: ['どれが', 'これが', 'それが', 'あれが'],
      },
      speakTarget: {
        baseCue: { de: 'Welches ist gut?', en: 'Which one is good?' },
        targetPhrase: 'どれが いい ですか。',
        acceptedAnswers: ['どれが いい ですか。'],
        requiredTokens: ['どれが', 'いい', 'ですか。'],
        optionalTokens: [],
      },
      sceneCaption: {
        de: 'Zwei Teedosen stehen gleichwertig nebeneinander, und die Verkäuferin hält die Hände offen zwischen beiden.',
        en: 'Two tea tins sit side by side, and the shopkeeper holds an open hand between them.',
      },
      trophyWord: {
        word: 'どれ',
        meaning: { de: 'welches', en: 'which one' },
        example: 'どれが いい ですか。',
        whyThisWord: { de: 'どれ hilft bei einer sichtbaren Auswahl, ohne dass du die Namen der einzelnen Produkte kennen musst.', en: 'どれ helps with a visible choice without requiring you to know each product’s name.' },
      },
      placeholderCaption: { de: 'Zwei unterschiedliche Teedosen auf einem hellen Souvenirtresen.', en: 'Two distinct tea tins on a bright souvenir counter.' },
      songMood: 'light curious recommendation',
      visualNotes: 'Small Japanese gift shop, two clearly differentiated tea tins, shopkeeper ready to recommend without pointing to a winner.',
    }),
  },
  {
    slug: 'kono-ocha-arimasu-ka',
    title: { de: 'Gibt es diesen Tee?', en: 'Do you have this tea?' },
    situation: {
      de: 'Im Konbini zeigst du der Mitarbeiterin ein Foto einer bestimmten Teeflasche, aber im sichtbaren Regal fehlt sie.',
      en: 'In a convenience store, you show the clerk a photo of a particular bottled tea, but it is missing from the visible shelf.',
    },
    pedagogicalGoal: 'Mit この お茶は ありますか höflich nach dem Vorhandensein eines konkreten Produkts fragen.',
    variant: makeBrightJapaneseVariant({
      corePhrase: {
        targetText: 'この お茶は ありますか。',
        baseText: { de: 'Haben Sie diesen Tee?', en: 'Do you have this tea?' },
      },
      meaning: {
        de: 'Eine Verfügbarkeitsfrage für ein Produkt, das du zeigen oder beschreiben kannst.',
        en: 'An availability question for a product you can point to or show.',
      },
      chunks: [
        { id: 'kono-ocha-arimasu-ka-product', targetText: 'この お茶は', baseText: { de: 'diesen Tee', en: 'this tea' } },
        { id: 'kono-ocha-arimasu-ka-available', targetText: 'ありますか。', baseText: { de: 'haben Sie ihn?', en: 'do you have it?' } },
      ],
      lessonItems: [
        { id: 'kono-ocha-arimasu-ka-item-kono', targetText: 'この', baseText: { de: 'dieser / diese / dieses (kono)', en: 'this (kono)' }, acceptedAnswers: ['この'] },
        { id: 'kono-ocha-arimasu-ka-item-ocha', targetText: 'お茶', baseText: { de: 'Tee (ocha)', en: 'tea (ocha)' }, acceptedAnswers: ['お茶', 'おちゃ'] },
        { id: 'kono-ocha-arimasu-ka-item-ochawa', targetText: 'お茶は', baseText: { de: 'Tee (ocha wa; mit Themenpartikel)', en: 'tea (ocha wa; with topic particle)' }, acceptedAnswers: ['お茶は', 'おちゃは'] },
        { id: 'kono-ocha-arimasu-ka-item-arimasu', targetText: 'あります', baseText: { de: 'es gibt / Sie haben (arimasu)', en: 'there is / you have (arimasu)' }, acceptedAnswers: ['あります'] },
      ],
      buildChips: ['この お茶は', 'ありますか。', '水は', 'いりません。'],
      typeRecall: {
        before: 'この ',
        answer: 'お茶は',
        after: ' ありますか。',
        acceptedAnswers: japaneseAccepted('お茶は', 'おちゃは'),
        fallbackChoices: ['お茶は', '水は', '薬は', 'コーヒーは'],
      },
      speakTarget: {
        baseCue: { de: 'Haben Sie diesen Tee?', en: 'Do you have this tea?' },
        targetPhrase: 'この お茶は ありますか。',
        acceptedAnswers: ['この お茶は ありますか。', 'この おちゃは ありますか。'],
        requiredTokens: ['この', 'お茶は', 'ありますか。'],
        optionalTokens: [],
      },
      sceneCaption: {
        de: 'Auf dem Handy ist eine Teeflasche zu sehen, während im Kühlregal genau an dieser Stelle eine Lücke bleibt.',
        en: 'A bottled tea is visible on the phone while the matching place in the cooler remains empty.',
      },
      trophyWord: {
        word: 'お茶',
        meaning: { de: 'Tee', en: 'tea' },
        example: 'お茶は ありますか。',
        whyThisWord: { de: 'お茶 ist ein häufiges Alltagsprodukt und umfasst im Laden viele warme und kalte Teesorten.', en: 'お茶 is a common everyday product and covers many hot and cold tea varieties in shops.' },
      },
      placeholderCaption: { de: 'Konbini-Kühlregal mit einer freien Stelle und einem Handyfoto einer Teeflasche.', en: 'Convenience-store cooler with one empty slot and a phone photo of bottled tea.' },
      songMood: 'small convenience-store search',
      visualNotes: 'Bright konbini cooler, empty product slot, phone reference image clear enough to motivate the availability question.',
    }),
  },
  {
    slug: 'kadobarai-de-ii-desuka',
    title: { de: 'Kartenzahlung prüfen', en: 'Checking card payment' },
    situation: {
      de: 'An einer kleinen Ramen-Kasse liegt die Rechnung bereit; du hältst deine Zahlungskarte neben das Terminal und prüfst die Zahlungsart.',
      en: 'At a small ramen-shop register, the bill is ready; you hold your payment card beside the terminal and check the method.',
    },
    pedagogicalGoal: 'カード払いで いい ですか als kompakte Frage verwenden, ob Kartenzahlung akzeptiert wird.',
    variant: makeBrightJapaneseVariant({
      corePhrase: {
        targetText: 'カード払いで いい ですか。',
        baseText: { de: 'Ist Kartenzahlung in Ordnung?', en: 'Is card payment okay?' },
      },
      meaning: {
        de: 'Eine eindeutige Zahlungsfrage für kleine Läden und Restaurants.',
        en: 'An unambiguous payment question for small shops and restaurants.',
      },
      chunks: [
        { id: 'kadobarai-de-ii-desuka-method', targetText: 'カード払いで', baseText: { de: 'mit Kartenzahlung', en: 'with card payment' } },
        { id: 'kadobarai-de-ii-desuka-okay', targetText: 'いい', baseText: { de: 'in Ordnung', en: 'okay' } },
        { id: 'kadobarai-de-ii-desuka-question', targetText: 'ですか。', baseText: { de: 'ist es?', en: 'is it?' } },
      ],
      lessonItems: [
        { id: 'kadobarai-de-ii-desuka-item-kado', targetText: 'カード', baseText: { de: 'Karte (kādo)', en: 'card (kādo)' }, acceptedAnswers: ['カード'] },
        { id: 'kadobarai-de-ii-desuka-item-kadobarai', targetText: 'カード払い', baseText: { de: 'Kartenzahlung (kādo-barai)', en: 'card payment (kādo-barai)' }, acceptedAnswers: ['カード払い', 'カードばらい'] },
        { id: 'kadobarai-de-ii-desuka-item-kadobaraide', targetText: 'カード払いで', baseText: { de: 'mit Kartenzahlung (kādo-barai de; mit Mittelpartikel)', en: 'by card payment (kādo-barai de; with means particle)' }, acceptedAnswers: ['カード払いで', 'カードばらいで'] },
        { id: 'kadobarai-de-ii-desuka-item-ii', targetText: 'いい', baseText: { de: 'gut / in Ordnung (ii)', en: 'good / okay (ii)' }, acceptedAnswers: ['いい'] },
      ],
      buildChips: ['カード払いで', 'いい', 'ですか。', '袋で', '地図で'],
      typeRecall: {
        before: '',
        answer: 'カード払いで',
        after: ' いい ですか。',
        acceptedAnswers: japaneseAccepted('カード払いで', 'カードばらいで'),
        fallbackChoices: ['カード払いで', '袋で', '切符で', '地図で'],
      },
      speakTarget: {
        baseCue: { de: 'Ist Kartenzahlung in Ordnung?', en: 'Is card payment okay?' },
        targetPhrase: 'カード払いで いい ですか。',
        acceptedAnswers: ['カード払いで いい ですか。', 'カードばらいで いい ですか。'],
        requiredTokens: ['カード払いで', 'いい', 'ですか。'],
        optionalTokens: [],
      },
      sceneCaption: {
        de: 'Neben der kleinen Rechnung steht ein kompaktes Kartenterminal, während die Zahlungskarte schon in deiner Hand liegt.',
        en: 'A compact card terminal sits beside the small bill while the payment card is already in your hand.',
      },
      trophyWord: {
        word: 'カード払い',
        meaning: { de: 'Kartenzahlung', en: 'card payment' },
        example: 'カード払いで いい ですか。',
        whyThisWord: { de: 'カード払い benennt die Zahlungsart eindeutig und vermeidet die Verwechslung mit einer Kunden- oder Verkehrskarte.', en: 'カード払い names the payment method clearly and avoids confusion with a loyalty or transit card.' },
      },
      placeholderCaption: { de: 'Kleine Ramen-Kasse mit Rechnungsschale, Karte und kompaktem Zahlterminal.', en: 'Small ramen-shop register with a bill tray, card, and compact payment terminal.' },
      songMood: 'smooth compact payment check',
      visualNotes: 'Neighborhood ramen register, modest card terminal, bill tray and card visible, practical end-of-meal tone.',
    }),
  },
  {
    slug: 'fukuroto-reshito-onegaishimasu',
    title: { de: 'Tüte und Beleg, bitte', en: 'A bag and receipt, please' },
    situation: {
      de: 'Im Konbini liegen mehrere kleine Einkäufe an der Kasse; die Tüte ist noch geschlossen und der Beleg steckt im Drucker.',
      en: 'At a convenience-store checkout, several small purchases are on the counter; the bag is still folded and the receipt remains in the printer.',
    },
    pedagogicalGoal: 'Mit 袋と zwei Dinge verbinden und レシートを お願いします als gemeinsame Kassenbitte formulieren.',
    variant: makeBrightJapaneseVariant({
      corePhrase: {
        targetText: '袋と レシートを お願いします。',
        baseText: { de: 'Eine Tüte und den Beleg, bitte.', en: 'A bag and the receipt, please.' },
      },
      meaning: {
        de: 'Eine kompakte Bitte um zwei konkrete Dinge am Ende des Einkaufs.',
        en: 'A compact request for two concrete things at the end of a purchase.',
      },
      chunks: [
        { id: 'fukuroto-reshito-onegaishimasu-things', targetText: '袋と レシートを', baseText: { de: 'eine Tüte und den Beleg', en: 'a bag and the receipt' } },
        { id: 'fukuroto-reshito-onegaishimasu-request', targetText: 'お願いします。', baseText: { de: 'bitte.', en: 'please.' } },
      ],
      lessonItems: [
        { id: 'fukuroto-reshito-onegaishimasu-item-fukuro', targetText: '袋', baseText: { de: 'Tüte (fukuro)', en: 'bag (fukuro)' }, acceptedAnswers: ['袋', 'ふくろ'] },
        { id: 'fukuroto-reshito-onegaishimasu-item-fukuroto', targetText: '袋と', baseText: { de: 'Tüte und (fukuro to; mit und-Partikel)', en: 'bag and (fukuro to; with and particle)' }, acceptedAnswers: ['袋と', 'ふくろと'] },
        { id: 'fukuroto-reshito-onegaishimasu-item-reshito', targetText: 'レシート', baseText: { de: 'Kassenbeleg (reshīto)', en: 'receipt (reshīto)' }, acceptedAnswers: ['レシート'] },
        { id: 'fukuroto-reshito-onegaishimasu-item-reshitowo', targetText: 'レシートを', baseText: { de: 'Beleg (reshīto o; mit Objektpartikel)', en: 'receipt (reshīto o; with object particle)' }, acceptedAnswers: ['レシートを'] },
        { id: 'fukuroto-reshito-onegaishimasu-item-onegaishimasu', targetText: 'お願いします', baseText: { de: 'bitte (onegaishimasu)', en: 'please (onegaishimasu)' }, acceptedAnswers: ['お願いします', 'おねがいします'] },
      ],
      buildChips: ['袋と レシートを', 'お願いします。', '地図を', 'カードは いりません。'],
      typeRecall: {
        before: '袋と ',
        answer: 'レシートを',
        after: ' お願いします。',
        acceptedAnswers: japaneseAccepted('レシートを'),
        fallbackChoices: ['レシートを', 'お茶を', '水を', 'カードを'],
      },
      speakTarget: {
        baseCue: { de: 'Eine Tüte und den Beleg, bitte.', en: 'A bag and the receipt, please.' },
        targetPhrase: '袋と レシートを お願いします。',
        acceptedAnswers: ['袋と レシートを お願いします。', 'ふくろと レシートを おねがいします。'],
        requiredTokens: ['袋と', 'レシートを', 'お願いします。'],
        optionalTokens: [],
      },
      sceneCaption: {
        de: 'Kleine Einkäufe warten auf dem Kassentresen, neben einer gefalteten Tüte und dem noch nicht abgerissenen Papierstreifen.',
        en: 'Small purchases wait on the counter beside a folded bag and the paper strip not yet torn from the printer.',
      },
      trophyWord: {
        word: 'レシート',
        meaning: { de: 'Kassenbeleg', en: 'receipt' },
        example: 'レシートを お願いします。',
        whyThisWord: { de: 'レシート ist der übliche Beleg im Laden und hilft bei Rückgaben, Ausgaben oder einer späteren Kontrolle.', en: 'レシート is the usual shop receipt and helps with returns, expenses, or checking a purchase later.' },
      },
      placeholderCaption: { de: 'Konbini-Kasse mit kleinen Einkäufen, gefalteter Tüte und Belegdrucker.', en: 'Convenience-store checkout with small purchases, a folded bag, and a receipt printer.' },
      songMood: 'tidy checkout finishing touch',
      visualNotes: 'Japanese convenience-store counter, groceries grouped neatly, bag and receipt printer both visually distinct.',
    }),
  },
  {
    slug: 'hoteruno-yoyakuga-arimasu',
    title: { de: 'Eine Hotelreservierung', en: 'A hotel reservation' },
    situation: {
      de: 'Du kommst mit Gepäck an die Hotelrezeption; auf dem Tresen liegt die Gästeliste für den heutigen Check-in.',
      en: 'You arrive at the hotel desk with luggage; today’s check-in list is open on the counter.',
    },
    pedagogicalGoal: 'Mit 予約が あります das Vorhandensein einer Buchung einfach und höflich mitteilen.',
    variant: makeBrightJapaneseVariant({
      corePhrase: {
        targetText: 'ホテルの 予約が あります。',
        baseText: { de: 'Ich habe eine Hotelreservierung.', en: 'I have a hotel reservation.' },
      },
      meaning: {
        de: 'Ein klarer erster Satz beim Einchecken mit einer bestehenden Buchung.',
        en: 'A clear first sentence when checking in with an existing booking.',
      },
      chunks: [
        { id: 'hoteruno-yoyakuga-arimasu-booking', targetText: 'ホテルの 予約が', baseText: { de: 'eine Hotelreservierung', en: 'a hotel reservation' } },
        { id: 'hoteruno-yoyakuga-arimasu-exists', targetText: 'あります。', baseText: { de: 'habe ich.', en: 'I have.' } },
      ],
      lessonItems: [
        { id: 'hoteruno-yoyakuga-arimasu-item-hoteru', targetText: 'ホテル', baseText: { de: 'Hotel (hoteru)', en: 'hotel (hoteru)' }, acceptedAnswers: ['ホテル'] },
        { id: 'hoteruno-yoyakuga-arimasu-item-hoteruno', targetText: 'ホテルの', baseText: { de: 'des Hotels (hoteru no; mit Zuordnungspartikel)', en: 'hotel’s / of the hotel (hoteru no; with linking particle)' }, acceptedAnswers: ['ホテルの'] },
        { id: 'hoteruno-yoyakuga-arimasu-item-yoyaku', targetText: '予約', baseText: { de: 'Reservierung (yoyaku)', en: 'reservation (yoyaku)' }, acceptedAnswers: ['予約', 'よやく'] },
        { id: 'hoteruno-yoyakuga-arimasu-item-yoyakuga', targetText: '予約が', baseText: { de: 'Reservierung (yoyaku ga; mit Subjektpartikel)', en: 'reservation (yoyaku ga; with subject particle)' }, acceptedAnswers: ['予約が', 'よやくが'] },
        { id: 'hoteruno-yoyakuga-arimasu-item-arimasu', targetText: 'あります', baseText: { de: 'es gibt / ich habe (arimasu)', en: 'there is / I have (arimasu)' }, acceptedAnswers: ['あります'] },
      ],
      buildChips: ['ホテルの 予約が', 'あります。', '部屋が', 'ホテル です。'],
      typeRecall: {
        before: 'ホテルの ',
        answer: '予約が',
        after: ' あります。',
        acceptedAnswers: japaneseAccepted('予約が', 'よやくが'),
        fallbackChoices: ['予約が', '部屋が', '荷物が', '切符が'],
      },
      speakTarget: {
        baseCue: { de: 'Ich habe eine Hotelreservierung.', en: 'I have a hotel reservation.' },
        targetPhrase: 'ホテルの 予約が あります。',
        acceptedAnswers: ['ホテルの 予約が あります。', 'ホテルの よやくが あります。'],
        requiredTokens: ['ホテルの', '予約が', 'あります。'],
        optionalTokens: [],
      },
      sceneCaption: {
        de: 'Reisekoffer stehen am Empfangstresen, auf dem die geöffnete Liste der heutigen Ankünfte liegt.',
        en: 'Travel bags stand at the reception counter where today’s arrival list lies open.',
      },
      trophyWord: {
        word: '予約',
        meaning: { de: 'Reservierung', en: 'reservation' },
        example: '予約が あります。',
        whyThisWord: { de: '予約 öffnet den richtigen Eintrag in Hotels, Restaurants und bei gebuchten Terminen.', en: '予約 gets you to the correct entry at hotels, restaurants, and booked appointments.' },
      },
      placeholderCaption: { de: 'Hotelrezeption mit Ankunftsliste, kleinem Namensschild und zwei Reisekoffern.', en: 'Hotel reception with an arrival list, a small nameplate, and two travel bags.' },
      songMood: 'welcoming check-in arrival',
      visualNotes: 'Contemporary Japanese hotel desk, arrival ledger visible, luggage beside traveler, calm beginning of check-in.',
    }),
  },
  {
    slug: 'kono-kippude-ii-desuka',
    title: { de: 'Ist dieses Ticket richtig?', en: 'Is this ticket right?' },
    situation: {
      de: 'Der Fahrkartenautomat hat ein Ticket ausgegeben; über dir zeigt die Tafel mehrere Shinkansen-Verbindungen.',
      en: 'The ticket machine has issued a ticket; the board above shows several Shinkansen services.',
    },
    pedagogicalGoal: 'Mit この 切符で いい ですか vor dem Bahnsteig prüfen, ob die vorliegende Fahrkarte passt.',
    variant: makeBrightJapaneseVariant({
      corePhrase: {
        targetText: 'この 切符で いい ですか。',
        baseText: { de: 'Ist dieses Ticket richtig?', en: 'Is this ticket okay?' },
      },
      meaning: {
        de: 'Eine Sicherheitsfrage, bevor du mit einer gerade gekauften Fahrkarte weitergehst.',
        en: 'A safety check before proceeding with a ticket you have just bought.',
      },
      chunks: [
        { id: 'kono-kippude-ii-desuka-ticket', targetText: 'この 切符で', baseText: { de: 'mit diesem Ticket', en: 'with this ticket' } },
        { id: 'kono-kippude-ii-desuka-okay', targetText: 'いい', baseText: { de: 'in Ordnung', en: 'okay' } },
        { id: 'kono-kippude-ii-desuka-question', targetText: 'ですか。', baseText: { de: 'ist es?', en: 'is it?' } },
      ],
      lessonItems: [
        { id: 'kono-kippude-ii-desuka-item-kono', targetText: 'この', baseText: { de: 'dieser / diese / dieses (kono)', en: 'this (kono)' }, acceptedAnswers: ['この'] },
        { id: 'kono-kippude-ii-desuka-item-kippu', targetText: '切符', baseText: { de: 'Fahrkarte (kippu)', en: 'ticket (kippu)' }, acceptedAnswers: ['切符', 'きっぷ'] },
        { id: 'kono-kippude-ii-desuka-item-kippude', targetText: '切符で', baseText: { de: 'mit der Fahrkarte (kippu de; mit Mittelpartikel)', en: 'with the ticket (kippu de; with means particle)' }, acceptedAnswers: ['切符で', 'きっぷで'] },
        { id: 'kono-kippude-ii-desuka-item-ii', targetText: 'いい', baseText: { de: 'gut / in Ordnung (ii)', en: 'good / okay (ii)' }, acceptedAnswers: ['いい'] },
      ],
      buildChips: ['この 切符で', 'いい', 'ですか。', 'カードで', '何時 ですか。'],
      typeRecall: {
        before: 'この ',
        answer: '切符で',
        after: ' いい ですか。',
        acceptedAnswers: japaneseAccepted('切符で', 'きっぷで'),
        fallbackChoices: ['切符で', 'カードで', '現金で', '地図で'],
      },
      speakTarget: {
        baseCue: { de: 'Ist dieses Ticket richtig?', en: 'Is this ticket okay?' },
        targetPhrase: 'この 切符で いい ですか。',
        acceptedAnswers: ['この 切符で いい ですか。', 'この きっぷで いい ですか。'],
        requiredTokens: ['切符で', 'いい', 'ですか。'],
        optionalTokens: ['この'],
      },
      sceneCaption: {
        de: 'Die frisch gedruckte Fahrkarte liegt in deiner Hand, während die Abfahrtstafel mehrere ähnlich benannte Züge zeigt.',
        en: 'The freshly printed ticket is in your hand while the departure board shows several similarly named trains.',
      },
      trophyWord: {
        word: '切符',
        meaning: { de: 'Fahrkarte', en: 'ticket' },
        example: 'この 切符で いい ですか。',
        whyThisWord: { de: '切符 ist die konkrete Papierfahrkarte und bleibt an Automaten, Sperrtoren und Bahnsteigen ein wichtiges Kontrollwort.', en: '切符 is the concrete paper ticket and remains an important checking word at machines, gates, and platforms.' },
      },
      placeholderCaption: { de: 'Gedruckte Fahrkarte vor einer großen Shinkansen-Abfahrtstafel.', en: 'Printed ticket held in front of a large Shinkansen departure board.' },
      songMood: 'careful rail-ticket check',
      visualNotes: 'Shinkansen ticket-machine area, fresh paper ticket foregrounded, departure board busy enough to justify uncertainty.',
    }),
  },
  {
    slug: 'chotto-kokode-matte-kudasai',
    title: { de: 'Bitte kurz hier warten', en: 'Please wait here briefly' },
    situation: {
      de: 'Vor dem Konbini bittest du deine Begleitung, kurz an dieser Stelle zu warten, während du schnell etwas holst.',
      en: 'Outside the convenience store, you ask your companion to wait right here while you quickly grab something.',
    },
    pedagogicalGoal: 'Die feste Bitte 待って ください mit ちょっと und ここで zu einer klaren kurzen Wartebitte machen.',
    variant: makeBrightJapaneseVariant({
      corePhrase: {
        targetText: 'ちょっと ここで 待って ください。',
        baseText: { de: 'Bitte warten Sie kurz hier.', en: 'Please wait here for a moment.' },
      },
      meaning: {
        de: 'Eine höfliche Bitte um einen sehr kurzen Aufschub am aktuellen Ort.',
        en: 'A polite request for a very short delay in the current place.',
      },
      chunks: [
        { id: 'chotto-kokode-matte-kudasai-moment', targetText: 'ちょっと', baseText: { de: 'einen Moment', en: 'for a moment' } },
        { id: 'chotto-kokode-matte-kudasai-place', targetText: 'ここで', baseText: { de: 'hier', en: 'here' } },
        { id: 'chotto-kokode-matte-kudasai-wait', targetText: '待って ください。', baseText: { de: 'warten Sie bitte.', en: 'please wait.' } },
      ],
      lessonItems: [
        { id: 'chotto-kokode-matte-kudasai-item-chotto', targetText: 'ちょっと', baseText: { de: 'einen Moment / kurz (chotto)', en: 'a moment / briefly (chotto)' }, acceptedAnswers: ['ちょっと'] },
        { id: 'chotto-kokode-matte-kudasai-item-kokode', targetText: 'ここで', baseText: { de: 'hier (koko de; mit Ortspartikel)', en: 'here (koko de; with location particle)' }, acceptedAnswers: ['ここで'] },
        { id: 'chotto-kokode-matte-kudasai-item-matte', targetText: '待って', baseText: { de: 'warten Sie (matte)', en: 'wait (matte)' }, acceptedAnswers: ['待って', 'まって'] },
        { id: 'chotto-kokode-matte-kudasai-item-kudasai', targetText: 'ください', baseText: { de: 'bitte tun Sie (kudasai)', en: 'please do (kudasai)' }, acceptedAnswers: ['ください', '下さい'] },
      ],
      buildChips: ['ちょっと', 'ここで', '待って ください。', '外で', '外 です。'],
      typeRecall: {
        before: 'ちょっと ',
        answer: 'ここで',
        after: ' 待って ください。',
        acceptedAnswers: japaneseAccepted('ここで'),
        fallbackChoices: ['ここで', '外で', '駅で', '店で'],
      },
      speakTarget: {
        baseCue: { de: 'Bitte warten Sie kurz hier.', en: 'Please wait here for a moment.' },
        targetPhrase: 'ちょっと ここで 待って ください。',
        acceptedAnswers: ['ちょっと ここで 待って ください。', 'ちょっと ここで まって ください。', 'ちょっと ここで 待って 下さい。'],
        requiredTokens: ['ちょっと', 'ここで', '待って'],
        optionalTokens: ['ください。'],
      },
      sceneCaption: {
        de: 'Die offene Tasche liegt an der Kasse, während deine Hand zwischen Reisepass und kleinen Gegenständen nach der Geldbörse sucht.',
        en: 'The open bag rests at the register while your hand searches between a passport and small items for the wallet.',
      },
      trophyWord: {
        word: '待つ',
        meaning: { de: 'warten', en: 'to wait' },
        example: 'ここで 待って ください。',
        whyThisWord: { de: '待つ steckt in der festen Bitte 待って ください und hält kurze Verzögerungen beim Bezahlen oder Nachsehen höflich.', en: '待つ is the base of the fixed request 待って ください and keeps brief delays while paying or checking something polite.' },
      },
      placeholderCaption: { de: 'Offene Reisetasche an einer Konbini-Kasse mit sichtbar gesuchter Geldbörse.', en: 'Open travel bag at a convenience-store register with a wallet visibly being searched for.' },
      songMood: 'patient checkout pause',
      visualNotes: 'Convenience-store checkout, open bag and partial wallet search, cashier calm, no sense of conflict or urgency.',
    }),
  },
]

export const JAPANESE_A1_PRACTICAL_2_LESSONS: GuidedLessonDefinition[] = makeJapanesePracticalLessons(
  GUIDED_TODAY_PATH_JAPANESE_TWO_METADATA,
  japaneseA1Practical2Inputs,
  { de: 'Du hast Japanisch A1 Praxis 2 abgeschlossen.', en: 'You have completed Japanese A1 Practical 2.' },
)

export const GUIDED_TODAY_PATH_JAPANESE_THREE_METADATA: GuidedPathMetadata = {
  id: 'japanese-a1-practical-3',
  title: 'Japanese A1 Practical 3',
  shortTitle: 'A1 Practical 3',
  subtitle: { de: 'Wege und einfacher Nahverkehr', en: 'Directions and simple transit' },
  level: 'A1',
  baseLanguage: 'German',
  targetLanguage: 'Japanese',
  estimatedMinutes: 5,
}

const japaneseA1Practical3Inputs: JapaneseLessonInput[] = [
  {
    slug: 'ekiwa-migi-hidari',
    title: { de: 'Rechts oder links?', en: 'Right or left?' },
    situation: {
      de: 'An einer Straßenecke zeigen zwei Schilder in verschiedene Richtungen; du prüfst, auf welcher Seite der Bahnhof liegt.',
      en: 'At a street corner, two signs point in different directions; you check which side the station is on.',
    },
    pedagogicalGoal: 'Mit 駅は das Ziel setzen und die klare Auswahl 右 ですか、 左 ですか stellen.',
    variant: makeBrightJapaneseVariant({
      corePhrase: {
        targetText: '駅は 右 ですか、 左 ですか。',
        baseText: { de: 'Ist der Bahnhof rechts oder links?', en: 'Is the station to the right or the left?' },
      },
      meaning: {
        de: 'Eine binäre Richtungsfrage, wenn genau zwei Wege vor dir liegen.',
        en: 'A binary direction question when exactly two routes lie ahead.',
      },
      chunks: [
        { id: 'ekiwa-migi-hidari-destination', targetText: '駅は', baseText: { de: 'der Bahnhof', en: 'the station' } },
        { id: 'ekiwa-migi-hidari-right', targetText: '右 ですか、', baseText: { de: 'ist er rechts,', en: 'is it to the right,' } },
        { id: 'ekiwa-migi-hidari-left', targetText: '左 ですか。', baseText: { de: 'oder links?', en: 'or to the left?' } },
      ],
      lessonItems: [
        { id: 'ekiwa-migi-hidari-item-eki', targetText: '駅', baseText: { de: 'Bahnhof / Station (eki)', en: 'station (eki)' }, acceptedAnswers: ['駅', 'えき'] },
        { id: 'ekiwa-migi-hidari-item-ekiwa', targetText: '駅は', baseText: { de: 'Bahnhof (eki wa; mit Themenpartikel)', en: 'station (eki wa; with topic particle)' }, acceptedAnswers: ['駅は', 'えきは'] },
        { id: 'ekiwa-migi-hidari-item-migi', targetText: '右', baseText: { de: 'rechts (migi)', en: 'right (migi)' }, acceptedAnswers: ['右', 'みぎ'] },
        { id: 'ekiwa-migi-hidari-item-hidari', targetText: '左', baseText: { de: 'links (hidari)', en: 'left (hidari)' }, acceptedAnswers: ['左', 'ひだり'] },
        { id: 'ekiwa-migi-hidari-item-desuka', targetText: 'ですか', baseText: { de: 'ist es? (desu ka)', en: 'is it? (desu ka)' }, acceptedAnswers: ['ですか'] },
      ],
      buildChips: ['駅は', '右 ですか、', '左 ですか。', '改札は', 'まっすぐ です。'],
      typeRecall: {
        before: '',
        answer: '駅は',
        after: ' 右 ですか、 左 ですか。',
        acceptedAnswers: japaneseAccepted('駅は', 'えきは'),
        fallbackChoices: ['駅は', '改札は', '出口は', 'ホテルは'],
      },
      speakTarget: {
        baseCue: { de: 'Ist der Bahnhof rechts oder links?', en: 'Is the station to the right or the left?' },
        targetPhrase: '駅は 右 ですか、 左 ですか。',
        acceptedAnswers: ['駅は 右 ですか、 左 ですか。', 'えきは みぎ ですか、 ひだり ですか。'],
        requiredTokens: ['駅は', '右', '左'],
        optionalTokens: ['ですか、', 'ですか。'],
      },
      sceneCaption: {
        de: 'An der Kreuzung weisen zwei Pfeile auseinander, und das Bahnhofssymbol ist aus deinem Blickwinkel nicht eindeutig zuzuordnen.',
        en: 'At the intersection, two arrows split apart and the station symbol is ambiguous from your angle.',
      },
      trophyWord: {
        word: '右',
        meaning: { de: 'rechts', en: 'right' },
        example: '駅は 右 ですか、 左 ですか。',
        whyThisWord: { de: '右 ist die eine Hälfte der wichtigsten Wegauswahl und steht auf Karten, Ausgängen und Richtungsangaben.', en: '右 is one half of the most important direction choice and appears on maps, exits, and directions.' },
      },
      placeholderCaption: { de: 'Japanische Straßenecke mit zwei auseinanderlaufenden Pfeilen und teilweise verdecktem Bahnhofssymbol.', en: 'Japanese street corner with two diverging arrows and a partly obscured station symbol.' },
      songMood: 'crisp two-way direction choice',
      visualNotes: 'Urban corner near a station, two strong directional arrows, visual uncertainty preserved until the learner asks.',
    }),
  },
  {
    slug: 'ekimade-toi-desuka',
    title: { de: 'Ist es weit bis zum Bahnhof?', en: 'Is the station far?' },
    situation: {
      de: 'Deine Handykarte zeigt mehrere Häuserblöcke bis zum Bahnhof; du möchtest die Entfernung einschätzen, bevor du losgehst.',
      en: 'Your phone map shows several blocks to the station; you want to gauge the distance before setting off.',
    },
    pedagogicalGoal: '駅まで als Zielstrecke mit 遠い ですか zu einer einfachen Entfernungsfrage verbinden.',
    variant: makeBrightJapaneseVariant({
      corePhrase: {
        targetText: '駅まで 遠い ですか。',
        baseText: { de: 'Ist es weit bis zum Bahnhof?', en: 'Is it far to the station?' },
      },
      meaning: {
        de: 'Eine kurze Frage, um zu entscheiden, ob ein Weg zu Fuß sinnvoll ist.',
        en: 'A short question for deciding whether a route is reasonable on foot.',
      },
      chunks: [
        { id: 'ekimade-toi-desuka-distance', targetText: '駅まで', baseText: { de: 'bis zum Bahnhof', en: 'as far as the station' } },
        { id: 'ekimade-toi-desuka-far', targetText: '遠い', baseText: { de: 'weit', en: 'far' } },
        { id: 'ekimade-toi-desuka-question', targetText: 'ですか。', baseText: { de: 'ist es?', en: 'is it?' } },
      ],
      lessonItems: [
        { id: 'ekimade-toi-desuka-item-eki', targetText: '駅', baseText: { de: 'Bahnhof / Station (eki)', en: 'station (eki)' }, acceptedAnswers: ['駅', 'えき'] },
        { id: 'ekimade-toi-desuka-item-ekimade', targetText: '駅まで', baseText: { de: 'bis zum Bahnhof (eki made; mit Grenzpartikel)', en: 'as far as the station (eki made; with limit particle)' }, acceptedAnswers: ['駅まで', 'えきまで'] },
        { id: 'ekimade-toi-desuka-item-toi', targetText: '遠い', baseText: { de: 'weit (tōi)', en: 'far (tōi)' }, acceptedAnswers: ['遠い', 'とおい'] },
        { id: 'ekimade-toi-desuka-item-desuka', targetText: 'ですか', baseText: { de: 'ist es? (desu ka)', en: 'is it? (desu ka)' }, acceptedAnswers: ['ですか'] },
      ],
      buildChips: ['駅まで', '遠い', 'ですか。', '近い', '近い ですか。'],
      typeRecall: {
        before: '',
        answer: '駅まで',
        after: ' 遠い ですか。',
        acceptedAnswers: japaneseAccepted('駅まで', 'えきまで'),
        fallbackChoices: ['駅まで', 'ホテルまで', '空港まで', '角まで'],
      },
      speakTarget: {
        baseCue: { de: 'Ist es weit bis zum Bahnhof?', en: 'Is it far to the station?' },
        targetPhrase: '駅まで 遠い ですか。',
        acceptedAnswers: ['駅まで 遠い ですか。', 'えきまで とおい ですか。'],
        requiredTokens: ['駅まで', '遠い', 'ですか。'],
        optionalTokens: [],
      },
      sceneCaption: {
        de: 'Auf der Handykarte zieht sich die Route über mehrere Häuserblöcke, während dein Gepäck neben dir steht.',
        en: 'On the phone map, the route stretches across several blocks while your luggage stands beside you.',
      },
      trophyWord: {
        word: '遠い',
        meaning: { de: 'weit / fern', en: 'far / distant' },
        example: '駅まで 遠い ですか。',
        whyThisWord: { de: '遠い hilft bei der praktischen Entscheidung zwischen Gehen, Bus und Taxi, noch bevor du aufbrichst.', en: '遠い helps with the practical choice between walking, bus, and taxi before you set off.' },
      },
      placeholderCaption: { de: 'Handykarte mit einer Route über mehrere Blöcke und einem Reisekoffer am Gehwegrand.', en: 'Phone map with a route across several blocks and a travel bag at the curb.' },
      songMood: 'measured distance check',
      visualNotes: 'Street-side route check, several city blocks visible on map, traveler evaluating distance with luggage.',
    }),
  },
  {
    slug: 'omise-ima-eigyochu',
    title: { de: 'Ist das Geschäft geöffnet?', en: 'Is the shop open?' },
    situation: {
      de: 'Vor einem kleinen Laden ist der Eingang beleuchtet, doch ein Vorhang verdeckt einen Teil des Schildes; du prüfst den aktuellen Status.',
      en: 'Outside a small shop, the entrance is lit but a curtain hides part of the sign; you check its current status.',
    },
    pedagogicalGoal: '営業中 als festen Nomenstatus mit 今 und ですか verwenden, ohne eine neue Verlaufsform einzuführen.',
    variant: makeBrightJapaneseVariant({
      corePhrase: {
        targetText: 'お店は 今 営業中 ですか。',
        baseText: { de: 'Ist das Geschäft jetzt geöffnet?', en: 'Is the shop open now?' },
      },
      meaning: {
        de: 'Eine Statusfrage für einen Laden, dessen Öffnung von außen nicht klar erkennbar ist.',
        en: 'A status question for a shop whose opening state is unclear from outside.',
      },
      chunks: [
        { id: 'omise-ima-eigyochu-shop', targetText: 'お店は', baseText: { de: 'was das Geschäft angeht', en: 'as for the shop' } },
        { id: 'omise-ima-eigyochu-now', targetText: '今', baseText: { de: 'jetzt', en: 'now' } },
        { id: 'omise-ima-eigyochu-status', targetText: '営業中 ですか。', baseText: { de: 'ist es geöffnet?', en: 'is it open?' } },
      ],
      lessonItems: [
        { id: 'omise-ima-eigyochu-item-omise', targetText: 'お店', baseText: { de: 'Geschäft / Laden (omise)', en: 'shop / store (omise)' }, acceptedAnswers: ['お店', 'おみせ'] },
        { id: 'omise-ima-eigyochu-item-omisewa', targetText: 'お店は', baseText: { de: 'Geschäft (omise wa; mit Themenpartikel)', en: 'shop (omise wa; with topic particle)' }, acceptedAnswers: ['お店は', 'おみせは'] },
        { id: 'omise-ima-eigyochu-item-ima', targetText: '今', baseText: { de: 'jetzt (ima)', en: 'now (ima)' }, acceptedAnswers: ['今', 'いま'] },
        { id: 'omise-ima-eigyochu-item-eigyochu', targetText: '営業中', baseText: { de: 'geöffnet / in Betrieb (eigyō-chū)', en: 'open / in operation (eigyō-chū)' }, acceptedAnswers: ['営業中', 'えいぎょうちゅう'] },
        { id: 'omise-ima-eigyochu-item-desuka', targetText: 'ですか', baseText: { de: 'ist es? (desu ka)', en: 'is it? (desu ka)' }, acceptedAnswers: ['ですか'] },
      ],
      buildChips: ['お店は', '今', '営業中 ですか。', '休み です。', '何時まで'],
      typeRecall: {
        before: '',
        answer: 'お店は',
        after: ' 今 営業中 ですか。',
        acceptedAnswers: japaneseAccepted('お店は', 'おみせは'),
        fallbackChoices: ['お店は', 'ホテルは', '駅は', '薬局は'],
      },
      speakTarget: {
        baseCue: { de: 'Ist das Geschäft jetzt geöffnet?', en: 'Is the shop open now?' },
        targetPhrase: 'お店は 今 営業中 ですか。',
        acceptedAnswers: ['お店は 今 営業中 ですか。', 'おみせは いま えいぎょうちゅう ですか。'],
        requiredTokens: ['お店は', '今', '営業中'],
        optionalTokens: ['ですか。'],
      },
      sceneCaption: {
        de: 'Der Eingang ist beleuchtet, aber der Noren-Vorhang verdeckt den entscheidenden Teil des kleinen Schildes.',
        en: 'The entrance is lit, but the noren curtain hides the decisive part of the small sign.',
      },
      trophyWord: {
        word: '営業中',
        meaning: { de: 'geöffnet / in Betrieb', en: 'open / in operation' },
        example: '今 営業中 ですか。',
        whyThisWord: { de: '営業中 erscheint häufig auf Ladenschildern und drückt den geöffneten Status als feste Nomenphrase aus.', en: '営業中 frequently appears on shop signs and expresses open status as a fixed noun phrase.' },
      },
      placeholderCaption: { de: 'Kleiner beleuchteter Laden mit halb verdecktem Statusschild hinter einem Noren-Vorhang.', en: 'Small lit shop with a status sign partly hidden behind a noren curtain.' },
      songMood: 'quiet storefront uncertainty',
      visualNotes: 'Evening neighborhood storefront, warm interior light, status sign partly occluded so the question remains necessary.',
    }),
  },
  {
    slug: 'kono-denshawa-nansen',
    title: { de: 'Welche Linie ist das?', en: 'Which line is this?' },
    situation: {
      de: 'Auf einem großen Bahnsteig hält ein Zug neben mehreren farbigen Linienmarkierungen; du prüfst seine Linie vor dem Einsteigen.',
      en: 'On a large platform, a train stops beside several colored line markings; you check its line before boarding.',
    },
    pedagogicalGoal: 'Mit この 電車は das konkrete Fahrzeug zum Thema machen und mit 何線 nach der Linie fragen.',
    variant: makeBrightJapaneseVariant({
      corePhrase: {
        targetText: 'この 電車は 何線 ですか。',
        baseText: { de: 'Zu welcher Linie gehört dieser Zug?', en: 'Which line is this train on?' },
      },
      meaning: {
        de: 'Eine Kontrollfrage für Bahnhöfe, an denen mehrere Linien denselben Bereich nutzen.',
        en: 'A confirmation question for stations where several lines share the same area.',
      },
      chunks: [
        { id: 'kono-denshawa-nansen-train', targetText: 'この 電車は', baseText: { de: 'dieser Zug', en: 'this train' } },
        { id: 'kono-denshawa-nansen-line', targetText: '何線', baseText: { de: 'welche Linie', en: 'which line' } },
        { id: 'kono-denshawa-nansen-question', targetText: 'ですか。', baseText: { de: 'ist es?', en: 'is it?' } },
      ],
      lessonItems: [
        { id: 'kono-denshawa-nansen-item-kono', targetText: 'この', baseText: { de: 'dieser / diese / dieses (kono)', en: 'this (kono)' }, acceptedAnswers: ['この'] },
        { id: 'kono-denshawa-nansen-item-densha', targetText: '電車', baseText: { de: 'Zug / elektrische Bahn (densha)', en: 'train / electric railway (densha)' }, acceptedAnswers: ['電車', 'でんしゃ'] },
        { id: 'kono-denshawa-nansen-item-denshawa', targetText: '電車は', baseText: { de: 'Zug (densha wa; mit Themenpartikel)', en: 'train (densha wa; with topic particle)' }, acceptedAnswers: ['電車は', 'でんしゃは'] },
        { id: 'kono-denshawa-nansen-item-nansen', targetText: '何線', baseText: { de: 'welche Linie (nan-sen)', en: 'which line (nan-sen)' }, acceptedAnswers: ['何線', 'なんせん'] },
        { id: 'kono-denshawa-nansen-item-desuka', targetText: 'ですか', baseText: { de: 'ist es? (desu ka)', en: 'is it? (desu ka)' }, acceptedAnswers: ['ですか'] },
      ],
      buildChips: ['この 電車は', '何線', 'ですか。', '何時', '何色 ですか。'],
      typeRecall: {
        before: 'この ',
        answer: '電車は',
        after: ' 何線 ですか。',
        acceptedAnswers: japaneseAccepted('電車は', 'でんしゃは'),
        fallbackChoices: ['電車は', 'バスは', '新幹線は', 'タクシーは'],
      },
      speakTarget: {
        baseCue: { de: 'Zu welcher Linie gehört dieser Zug?', en: 'Which line is this train on?' },
        targetPhrase: 'この 電車は 何線 ですか。',
        acceptedAnswers: ['この 電車は 何線 ですか。', 'この でんしゃは なんせん ですか。'],
        requiredTokens: ['電車は', '何線', 'ですか。'],
        optionalTokens: ['この'],
      },
      sceneCaption: {
        de: 'Ein Zug steht abfahrbereit, während am Bahnsteigboden mehrere verschiedenfarbige Linien nebeneinander verlaufen.',
        en: 'A train stands ready to depart while several differently colored line markings run beside one another on the platform floor.',
      },
      trophyWord: {
        word: '電車',
        meaning: { de: 'Zug / elektrische Bahn', en: 'train / electric railway' },
        example: 'この 電車は 何線 ですか。',
        whyThisWord: { de: '電車 ist das alltägliche Wort für städtische und regionale Züge und der klare Gegenstand dieser Linienfrage.', en: '電車 is the everyday word for urban and regional trains and the clear object of this line question.' },
      },
      placeholderCaption: { de: 'Bahnsteig mit wartendem Zug und mehreren farbigen Linienmarkierungen am Boden.', en: 'Platform with a waiting train and several colored line markings on the floor.' },
      songMood: 'focused platform line check',
      visualNotes: 'Busy interchange platform, train doors open, multiple color bands visible, no line name made dominant.',
    }),
  },
  {
    slug: 'tsugiwa-dono-eki',
    title: { de: 'Welche Station kommt als Nächstes?', en: 'Which station is next?' },
    situation: {
      de: 'Im Zug wechselt die Anzeige zwischen mehreren Informationen; du möchtest vor der nächsten Ansage den folgenden Halt prüfen.',
      en: 'On the train, the display cycles through several pieces of information; you want to check the following stop before the next announcement.',
    },
    pedagogicalGoal: 'Mit 次は den nächsten Halt zum Thema machen und mit どの 駅 nach seiner Station fragen.',
    variant: makeBrightJapaneseVariant({
      corePhrase: {
        targetText: '次は どの 駅 ですか。',
        baseText: { de: 'Welche Station ist die nächste?', en: 'Which station is next?' },
      },
      meaning: {
        de: 'Eine direkte Frage nach dem unmittelbar folgenden Halt.',
        en: 'A direct question about the immediately following stop.',
      },
      chunks: [
        { id: 'tsugiwa-dono-eki-next', targetText: '次は', baseText: { de: 'als Nächstes', en: 'next' } },
        { id: 'tsugiwa-dono-eki-station', targetText: 'どの 駅', baseText: { de: 'welche Station', en: 'which station' } },
        { id: 'tsugiwa-dono-eki-question', targetText: 'ですか。', baseText: { de: 'ist es?', en: 'is it?' } },
      ],
      lessonItems: [
        { id: 'tsugiwa-dono-eki-item-tsugi', targetText: '次', baseText: { de: 'das Nächste (tsugi)', en: 'next (tsugi)' }, acceptedAnswers: ['次', 'つぎ'] },
        { id: 'tsugiwa-dono-eki-item-tsugiwa', targetText: '次は', baseText: { de: 'als Nächstes (tsugi wa; mit Themenpartikel)', en: 'as for next (tsugi wa; with topic particle)' }, acceptedAnswers: ['次は', 'つぎは'] },
        { id: 'tsugiwa-dono-eki-item-dono', targetText: 'どの', baseText: { de: 'welcher / welche / welches (dono)', en: 'which (dono)' }, acceptedAnswers: ['どの'] },
        { id: 'tsugiwa-dono-eki-item-eki', targetText: '駅', baseText: { de: 'Bahnhof / Station (eki)', en: 'station (eki)' }, acceptedAnswers: ['駅', 'えき'] },
        { id: 'tsugiwa-dono-eki-item-desuka', targetText: 'ですか', baseText: { de: 'ist es? (desu ka)', en: 'is it? (desu ka)' }, acceptedAnswers: ['ですか'] },
      ],
      buildChips: ['次は', 'どの 駅', 'ですか。', '今は', '何線 ですか。'],
      typeRecall: {
        before: '',
        answer: '次は',
        after: ' どの 駅 ですか。',
        acceptedAnswers: japaneseAccepted('次は', 'つぎは'),
        fallbackChoices: ['次は', '今は', '今日は', '入口は'],
      },
      speakTarget: {
        baseCue: { de: 'Welche Station ist die nächste?', en: 'Which station is next?' },
        targetPhrase: '次は どの 駅 ですか。',
        acceptedAnswers: ['次は どの 駅 ですか。', 'つぎは どの えき ですか。'],
        requiredTokens: ['次は', 'どの', '駅'],
        optionalTokens: ['ですか。'],
      },
      sceneCaption: {
        de: 'Die Anzeige über der Zugtür wechselt gerade den Bildschirm, während der Zug zwischen zwei Stationen fährt.',
        en: 'The display above the train door is changing screens while the train runs between two stations.',
      },
      trophyWord: {
        word: '次',
        meaning: { de: 'das Nächste', en: 'next' },
        example: '次は どの 駅 ですか。',
        whyThisWord: { de: '次 richtet den Blick genau auf den folgenden Halt und hilft, rechtzeitig zum Aussteigen bereit zu sein.', en: '次 focuses exactly on the following stop and helps you get ready to leave in time.' },
      },
      placeholderCaption: { de: 'Zuginnenraum mit wechselnder Türanzeige und vorbeiziehenden Lichtern zwischen Stationen.', en: 'Train interior with a changing door display and lights passing between stations.' },
      songMood: 'rolling next-stop anticipation',
      visualNotes: 'Clean commuter-train interior, information display mid-transition, route context visible but next stop not resolved.',
    }),
  },
  {
    slug: 'kono-kadoni-chaji-onegaishimasu',
    title: { de: 'Die Karte aufladen', en: 'Topping up the card' },
    situation: {
      de: 'Am besetzten Servicefenster neben den Sperren legst du deine Verkehrskarte mit niedrigem Guthaben auf die Ablage.',
      en: 'At the staffed service window beside the gates, you place your low-balance transit card on the tray.',
    },
    pedagogicalGoal: 'Mit この カードに das Ziel der Aufladung markieren und チャージを お願いします als feste Servicebitte verwenden.',
    variant: makeBrightJapaneseVariant({
      corePhrase: {
        targetText: 'この カードに チャージを お願いします。',
        baseText: { de: 'Bitte laden Sie diese Karte auf.', en: 'Please top up this card.' },
      },
      meaning: {
        de: 'Eine Japan-typische Bitte zum Aufladen einer Verkehrskarte am Bahnhof.',
        en: 'A Japan-specific request to add value to a transit card at the station.',
      },
      chunks: [
        { id: 'kono-kadoni-chaji-onegaishimasu-card', targetText: 'この カードに', baseText: { de: 'auf diese Karte', en: 'onto this card' } },
        { id: 'kono-kadoni-chaji-onegaishimasu-topup', targetText: 'チャージを', baseText: { de: 'eine Aufladung', en: 'a top-up' } },
        { id: 'kono-kadoni-chaji-onegaishimasu-request', targetText: 'お願いします。', baseText: { de: 'bitte.', en: 'please.' } },
      ],
      lessonItems: [
        { id: 'kono-kadoni-chaji-onegaishimasu-item-kono', targetText: 'この', baseText: { de: 'dieser / diese / dieses (kono)', en: 'this (kono)' }, acceptedAnswers: ['この'] },
        { id: 'kono-kadoni-chaji-onegaishimasu-item-kado', targetText: 'カード', baseText: { de: 'Karte (kādo)', en: 'card (kādo)' }, acceptedAnswers: ['カード'] },
        { id: 'kono-kadoni-chaji-onegaishimasu-item-kadoni', targetText: 'カードに', baseText: { de: 'auf die Karte (kādo ni; mit Zielpartikel)', en: 'onto the card (kādo ni; with destination particle)' }, acceptedAnswers: ['カードに'] },
        { id: 'kono-kadoni-chaji-onegaishimasu-item-chaji', targetText: 'チャージ', baseText: { de: 'Aufladung (chāji)', en: 'top-up / charge (chāji)' }, acceptedAnswers: ['チャージ'] },
        { id: 'kono-kadoni-chaji-onegaishimasu-item-chajiwo', targetText: 'チャージを', baseText: { de: 'Aufladung (chāji o; mit Objektpartikel)', en: 'top-up (chāji o; with object particle)' }, acceptedAnswers: ['チャージを'] },
        { id: 'kono-kadoni-chaji-onegaishimasu-item-onegaishimasu', targetText: 'お願いします', baseText: { de: 'bitte (onegaishimasu)', en: 'please (onegaishimasu)' }, acceptedAnswers: ['お願いします', 'おねがいします'] },
      ],
      buildChips: ['この カードに', 'チャージを', 'お願いします。', '切符を', '地図 です。'],
      typeRecall: {
        before: 'この カードに ',
        answer: 'チャージを',
        after: ' お願いします。',
        acceptedAnswers: japaneseAccepted('チャージを'),
        fallbackChoices: ['チャージを', '水を', 'お茶を', '袋を'],
      },
      speakTarget: {
        baseCue: { de: 'Bitte laden Sie diese Karte auf.', en: 'Please top up this card.' },
        targetPhrase: 'この カードに チャージを お願いします。',
        acceptedAnswers: ['この カードに チャージを お願いします。', 'この カードに チャージを おねがいします。'],
        requiredTokens: ['カードに', 'チャージを', 'お願いします。'],
        optionalTokens: ['この'],
      },
      sceneCaption: {
        de: 'Der Ausgleichsautomat zeigt einen fast leeren Guthabenbalken, und die Verkehrskarte liegt griffbereit daneben.',
        en: 'The fare-adjustment machine shows an almost empty balance bar, and the transit card is ready beside it.',
      },
      trophyWord: {
        word: 'チャージ',
        meaning: { de: 'Aufladung / Guthaben aufladen', en: 'top-up / adding value' },
        example: 'チャージを お願いします。',
        whyThisWord: { de: 'チャージ ist das in Japan übliche Wort am Automaten und Schalter, wenn Guthaben auf eine Verkehrskarte soll.', en: 'チャージ is the usual word in Japan at machines and counters when adding value to a transit card.' },
      },
      placeholderCaption: { de: 'Fahrpreis-Ausgleichsautomat mit niedrigem Guthaben und bereitgelegter Verkehrskarte.', en: 'Fare-adjustment machine with a low balance and a transit card placed ready.' },
      songMood: 'bright transit-card reset',
      visualNotes: 'Station fare-adjustment area, low balance graphic clearly visible, transit card and machine slot in practical focus.',
    }),
  },
  {
    slug: 'konbiniwa-nanjimade',
    title: { de: 'Bis wann ist der Konbini offen?', en: 'How late is the convenience store open?' },
    situation: {
      de: 'Spät am Abend zeigt dir die Hotelkarte einen Konbini in der Nähe; du brauchst noch etwas und fragst nach seiner Öffnungszeit.',
      en: 'Late in the evening, the hotel map shows a nearby convenience store; you still need something and ask about its hours.',
    },
    pedagogicalGoal: 'Mit 何時まで nach der Endzeit eines bekannten Ortes fragen, ohne Uhrzeiten selbst bilden zu müssen.',
    variant: makeBrightJapaneseVariant({
      corePhrase: {
        targetText: 'コンビニは 何時まで ですか。',
        baseText: { de: 'Bis wie viel Uhr ist der Konbini geöffnet?', en: 'Until what time is the convenience store open?' },
      },
      meaning: {
        de: 'Eine praktische Frage nach dem Ende der Öffnungszeit eines nahen Geschäfts.',
        en: 'A practical question about when a nearby shop closes.',
      },
      chunks: [
        { id: 'konbiniwa-nanjimade-store', targetText: 'コンビニは', baseText: { de: 'der Konbini', en: 'the convenience store' } },
        { id: 'konbiniwa-nanjimade-until', targetText: '何時まで', baseText: { de: 'bis wie viel Uhr', en: 'until what time' } },
        { id: 'konbiniwa-nanjimade-question', targetText: 'ですか。', baseText: { de: 'ist es?', en: 'is it?' } },
      ],
      lessonItems: [
        { id: 'konbiniwa-nanjimade-item-konbini', targetText: 'コンビニ', baseText: { de: 'Convenience-Store (konbini)', en: 'convenience store (konbini)' }, acceptedAnswers: ['コンビニ'] },
        { id: 'konbiniwa-nanjimade-item-konbiniwa', targetText: 'コンビニは', baseText: { de: 'Konbini (konbini wa; mit Themenpartikel)', en: 'convenience store (konbini wa; with topic particle)' }, acceptedAnswers: ['コンビニは'] },
        { id: 'konbiniwa-nanjimade-item-nanji', targetText: '何時', baseText: { de: 'wie viel Uhr (nanji)', en: 'what time (nanji)' }, acceptedAnswers: ['何時', 'なんじ'] },
        { id: 'konbiniwa-nanjimade-item-nanjimade', targetText: '何時まで', baseText: { de: 'bis wie viel Uhr (nanji made; mit Grenzpartikel)', en: 'until what time (nanji made; with limit particle)' }, acceptedAnswers: ['何時まで', 'なんじまで'] },
        { id: 'konbiniwa-nanjimade-item-desuka', targetText: 'ですか', baseText: { de: 'ist es? (desu ka)', en: 'is it? (desu ka)' }, acceptedAnswers: ['ですか'] },
      ],
      buildChips: ['コンビニは', '何時まで', 'ですか。', 'ホテルは', 'どの 店 ですか。'],
      typeRecall: {
        before: 'コンビニは ',
        answer: '何時まで',
        after: ' ですか。',
        acceptedAnswers: japaneseAccepted('何時まで', 'なんじまで'),
        fallbackChoices: ['何時まで', '駅まで', 'ホテルまで', '明日まで'],
      },
      speakTarget: {
        baseCue: { de: 'Bis wie viel Uhr ist der Konbini geöffnet?', en: 'Until what time is the convenience store open?' },
        targetPhrase: 'コンビニは 何時まで ですか。',
        acceptedAnswers: ['コンビニは 何時まで ですか。', 'コンビニは なんじまで ですか。'],
        requiredTokens: ['コンビニは', '何時まで', 'ですか。'],
        optionalTokens: [],
      },
      sceneCaption: {
        de: 'Auf der Hotelkarte leuchtet spätabends die Markierung eines nahen Ladens, während draußen bereits viele Schaufenster dunkel sind.',
        en: 'A nearby shop pin glows on the hotel map late at night while many storefronts outside are already dark.',
      },
      trophyWord: {
        word: '何時',
        meaning: { de: 'wie viel Uhr', en: 'what time' },
        example: '何時まで ですか。',
        whyThisWord: { de: '何時 fragt direkt nach einer Uhrzeit; mit まで wird daraus die wichtige Frage nach dem Ende.', en: '何時 asks directly for a clock time; with まで, it becomes the important question about an ending time.' },
      },
      placeholderCaption: { de: 'Nächtliche Hotellobby mit Stadtkarte, leuchtender Ladenmarkierung und dunkler Straße draußen.', en: 'Night hotel lobby with a city map, a glowing shop pin, and a dark street outside.' },
      songMood: 'late-night practical timing',
      visualNotes: 'Hotel lobby after dark, nearby convenience-store pin on map, contrast between open possibility and closed storefronts.',
    }),
  },
  {
    slug: 'ano-kadode-onegaishimasu',
    title: { de: 'An jener Ecke, bitte', en: 'At that corner, please' },
    situation: {
      de: 'Im Taxi nähert ihr euch dem Ziel; die passende Straßenecke ist bereits durch die Windschutzscheibe zu sehen.',
      en: 'In a taxi, you are approaching the destination; the suitable street corner is already visible through the windshield.',
    },
    pedagogicalGoal: 'Mit あの 角で einen sichtbaren Haltepunkt wählen und die Ortsangabe mit お願いします höflich abschließen.',
    variant: makeBrightJapaneseVariant({
      corePhrase: {
        targetText: 'あの 角で お願いします。',
        baseText: { de: 'An jener Ecke, bitte.', en: 'At that corner, please.' },
      },
      meaning: {
        de: 'Eine knappe, natürliche Taxiangabe für einen gut sichtbaren Ausstiegspunkt.',
        en: 'A concise, natural taxi direction for a clearly visible drop-off point.',
      },
      chunks: [
        { id: 'ano-kadode-onegaishimasu-corner', targetText: 'あの 角で', baseText: { de: 'an jener Ecke', en: 'at that corner' } },
        { id: 'ano-kadode-onegaishimasu-request', targetText: 'お願いします。', baseText: { de: 'bitte.', en: 'please.' } },
      ],
      lessonItems: [
        { id: 'ano-kadode-onegaishimasu-item-ano', targetText: 'あの', baseText: { de: 'jener / jene / jenes dort (ano)', en: 'that over there (ano)' }, acceptedAnswers: ['あの'] },
        { id: 'ano-kadode-onegaishimasu-item-kado', targetText: '角', baseText: { de: 'Ecke (kado)', en: 'corner (kado)' }, acceptedAnswers: ['角', 'かど'] },
        { id: 'ano-kadode-onegaishimasu-item-kadode', targetText: '角で', baseText: { de: 'an der Ecke (kado de; mit Ortspartikel)', en: 'at the corner (kado de; with location particle)' }, acceptedAnswers: ['角で', 'かどで'] },
        { id: 'ano-kadode-onegaishimasu-item-onegaishimasu', targetText: 'お願いします', baseText: { de: 'bitte (onegaishimasu)', en: 'please (onegaishimasu)' }, acceptedAnswers: ['お願いします', 'おねがいします'] },
      ],
      buildChips: ['あの 角で', 'お願いします。', '駅で', '待って ください。'],
      typeRecall: {
        before: 'あの ',
        answer: '角で',
        after: ' お願いします。',
        acceptedAnswers: japaneseAccepted('角で', 'かどで'),
        fallbackChoices: ['角で', '駅で', 'ホテルで', '改札で'],
      },
      speakTarget: {
        baseCue: { de: 'An jener Ecke, bitte.', en: 'At that corner, please.' },
        targetPhrase: 'あの 角で お願いします。',
        acceptedAnswers: ['あの 角で お願いします。', 'あの かどで おねがいします。'],
        requiredTokens: ['あの', '角で', 'お願いします。'],
        optionalTokens: [],
      },
      sceneCaption: {
        de: 'Durch die Taxischeibe rückt eine markante Straßenecke näher, kurz bevor der Wagen an ihr vorbeifahren würde.',
        en: 'Through the taxi windshield, a distinctive street corner draws closer just before the car would pass it.',
      },
      trophyWord: {
        word: '角',
        meaning: { de: 'Ecke', en: 'corner' },
        example: 'あの 角で お願いします。',
        whyThisWord: { de: '角 ist ein sichtbarer, leicht zeigbarer Orientierungspunkt für Taxis und kurze Wegbeschreibungen.', en: '角 is a visible, easy-to-point-out landmark for taxis and short directions.' },
      },
      placeholderCaption: { de: 'Blick aus einem Taxi auf eine näherkommende markante Straßenecke.', en: 'View from a taxi toward a distinctive street corner drawing near.' },
      songMood: 'gentle city drop-off cue',
      visualNotes: 'Taxi interior viewpoint, approaching corner framed clearly through windshield, driver attentive but action not yet resolved.',
    }),
  },
  {
    slug: 'sokomadewa-aruki-takushi',
    title: { de: 'Zu Fuß oder mit dem Taxi?', en: 'On foot or by taxi?' },
    situation: {
      de: 'Vor einem kleinen Vorortbahnhof zeigt die Karte das Ryokan abseits der Hauptstraße; du vergleichst die sinnvollen Wege dorthin.',
      en: 'Outside a small suburban station, the map shows the ryokan away from the main road; you compare sensible ways to reach it.',
    },
    pedagogicalGoal: 'Mit そこまでは das Ziel bündeln und zwischen 徒歩 und タクシー als zwei Verkehrsmöglichkeiten wählen.',
    variant: makeBrightJapaneseVariant({
      corePhrase: {
        targetText: 'そこまでは 徒歩 ですか、 タクシー ですか。',
        baseText: { de: 'Dorthin zu Fuß oder mit dem Taxi?', en: 'Should I walk there or take a taxi?' },
      },
      meaning: {
        de: 'Eine einfache Wahlfrage für die letzte Strecke zu einem Ziel.',
        en: 'A simple choice question for the final leg to a destination.',
      },
      chunks: [
        { id: 'sokomadewa-aruki-takushi-destination', targetText: 'そこまでは', baseText: { de: 'bis dorthin', en: 'to get there' } },
        { id: 'sokomadewa-aruki-takushi-walk', targetText: '徒歩 ですか、', baseText: { de: 'zu Fuß,', en: 'on foot,' } },
        { id: 'sokomadewa-aruki-takushi-taxi', targetText: 'タクシー ですか。', baseText: { de: 'oder mit dem Taxi?', en: 'or by taxi?' } },
      ],
      lessonItems: [
        { id: 'sokomadewa-aruki-takushi-item-soko', targetText: 'そこ', baseText: { de: 'dort (soko)', en: 'there (soko)' }, acceptedAnswers: ['そこ'] },
        { id: 'sokomadewa-aruki-takushi-item-sokomadewa', targetText: 'そこまでは', baseText: { de: 'bis dorthin (soko made wa; mit Grenz- und Themenpartikel)', en: 'as far as there (soko made wa; with limit and topic particles)' }, acceptedAnswers: ['そこまでは'] },
        { id: 'sokomadewa-aruki-takushi-item-toho', targetText: '徒歩', baseText: { de: 'zu Fuß / Fußweg (toho)', en: 'on foot / walking (toho)' }, acceptedAnswers: ['徒歩', 'とほ'] },
        { id: 'sokomadewa-aruki-takushi-item-takushi', targetText: 'タクシー', baseText: { de: 'Taxi (takushī)', en: 'taxi (takushī)' }, acceptedAnswers: ['タクシー'] },
        { id: 'sokomadewa-aruki-takushi-item-desuka', targetText: 'ですか', baseText: { de: 'ist es? (desu ka)', en: 'is it? (desu ka)' }, acceptedAnswers: ['ですか'] },
      ],
      buildChips: ['そこまでは', '徒歩 ですか、', 'タクシー ですか。', '電車 ですか。', '右 ですか。'],
      typeRecall: {
        before: '',
        answer: 'そこまでは',
        after: ' 徒歩 ですか、 タクシー ですか。',
        acceptedAnswers: japaneseAccepted('そこまでは'),
        fallbackChoices: ['そこまでは', '駅までは', 'ホテルまでは', '空港までは'],
      },
      speakTarget: {
        baseCue: { de: 'Dorthin zu Fuß oder mit dem Taxi?', en: 'Should I walk there or take a taxi?' },
        targetPhrase: 'そこまでは 徒歩 ですか、 タクシー ですか。',
        acceptedAnswers: ['そこまでは 徒歩 ですか、 タクシー ですか。', 'そこまでは とほ ですか、 タクシー ですか。'],
        requiredTokens: ['そこまでは', '徒歩', 'タクシー'],
        optionalTokens: ['ですか、', 'ですか。'],
      },
      sceneCaption: {
        de: 'Auf der Karte liegt das Ryokan jenseits der Hauptstraße, während vor dem kleinen Bahnhof sowohl ein Gehweg als auch ein Taxistand beginnen.',
        en: 'On the map, the ryokan lies beyond the main road while both a footpath and a taxi stand begin outside the small station.',
      },
      trophyWord: {
        word: 'タクシー',
        meaning: { de: 'Taxi', en: 'taxi' },
        example: '徒歩 ですか、 タクシー ですか。',
        whyThisWord: { de: 'タクシー ist die klare Alternative, wenn Gepäck, Entfernung oder der letzte Wegabschnitt gegen das Gehen sprechen.', en: 'タクシー is the clear alternative when luggage, distance, or the final stretch makes walking impractical.' },
      },
      placeholderCaption: { de: 'Kleiner Bahnhofsvorplatz mit beginnendem Gehweg, Taxistand und entfernt markiertem Ryokan.', en: 'Small station forecourt with a footpath, taxi stand, and a ryokan marked in the distance.' },
      songMood: 'open last-mile choice',
      visualNotes: 'Suburban station exit, walking route and taxi queue equally visible, distant inn pin anchoring the decision.',
    }),
  },
  {
    slug: 'hoteruni-modoritai-desu',
    title: { de: 'Zum Hotel zurück', en: 'Going back to the hotel' },
    situation: {
      de: 'Nach einem Abendmarkt stehst du in einem unbekannten Viertel mit der Hotelkarte in der Hand und brauchst den Rückweg.',
      en: 'After an evening market, you stand in an unfamiliar neighborhood with the hotel card in hand and need the way back.',
    },
    pedagogicalGoal: 'Die feste Wunschform 戻りたい mit ホテルに und です zu einem klaren Rückkehrwunsch verbinden.',
    variant: makeBrightJapaneseVariant({
      corePhrase: {
        targetText: 'ホテルに 戻りたい です。',
        baseText: { de: 'Ich möchte zum Hotel zurück.', en: 'I want to return to the hotel.' },
      },
      meaning: {
        de: 'Eine direkte Zielaussage, wenn du Hilfe für den Rückweg brauchst.',
        en: 'A direct destination statement when you need help finding the way back.',
      },
      chunks: [
        { id: 'hoteruni-modoritai-desu-destination', targetText: 'ホテルに', baseText: { de: 'zum Hotel', en: 'to the hotel' } },
        { id: 'hoteruni-modoritai-desu-return', targetText: '戻りたい です。', baseText: { de: 'möchte ich zurück.', en: 'I want to return.' } },
      ],
      lessonItems: [
        { id: 'hoteruni-modoritai-desu-item-hoteru', targetText: 'ホテル', baseText: { de: 'Hotel (hoteru)', en: 'hotel (hoteru)' }, acceptedAnswers: ['ホテル'] },
        { id: 'hoteruni-modoritai-desu-item-hoteruni', targetText: 'ホテルに', baseText: { de: 'zum Hotel (hoteru ni; mit Zielpartikel)', en: 'to the hotel (hoteru ni; with destination particle)' }, acceptedAnswers: ['ホテルに'] },
        { id: 'hoteruni-modoritai-desu-item-modoritai', targetText: '戻りたい', baseText: { de: 'möchte zurückkehren (modoritai)', en: 'want to return (modoritai)' }, acceptedAnswers: ['戻りたい', 'もどりたい'] },
        { id: 'hoteruni-modoritai-desu-item-desu', targetText: 'です', baseText: { de: 'ist / höfliche Endung (desu)', en: 'is / polite ending (desu)' }, acceptedAnswers: ['です'] },
      ],
      buildChips: ['ホテルに', '戻りたい です。', '駅に', '行きたい です。'],
      typeRecall: {
        before: '',
        answer: 'ホテルに',
        after: ' 戻りたい です。',
        acceptedAnswers: japaneseAccepted('ホテルに'),
        fallbackChoices: ['ホテルに', '駅に', '空港に', '店に'],
      },
      speakTarget: {
        baseCue: { de: 'Ich möchte zum Hotel zurück.', en: 'I want to return to the hotel.' },
        targetPhrase: 'ホテルに 戻りたい です。',
        acceptedAnswers: ['ホテルに 戻りたい です。', 'ホテルに もどりたい です。'],
        requiredTokens: ['ホテルに', '戻りたい', 'です。'],
        optionalTokens: [],
      },
      sceneCaption: {
        de: 'Die Marktlichter liegen hinter dir, und auf der Hotelkarte ist nur die entfernte Adresse neben einem kleinen Logo zu sehen.',
        en: 'The market lights are behind you, and the hotel card shows only a distant address beside a small logo.',
      },
      trophyWord: {
        word: 'ホテル',
        meaning: { de: 'Hotel', en: 'hotel' },
        example: 'ホテルに 戻りたい です。',
        whyThisWord: { de: 'ホテル ist ein klares Zielwort, das Taxifahrer, Stationspersonal und Passanten sofort einordnen können.', en: 'ホテル is a clear destination word that taxi drivers, station staff, and passersby can immediately place.' },
      },
      placeholderCaption: { de: 'Abendliches Viertel nach einem Marktbesuch mit Hotelkarte und entfernter Adressmarkierung.', en: 'Evening neighborhood after a market visit with a hotel card and a distant address marker.' },
      songMood: 'soft return-home intention',
      visualNotes: 'Evening street beyond a market, hotel card foregrounded, traveler oriented but needing a route back.',
    }),
  },
]

export const JAPANESE_A1_PRACTICAL_3_LESSONS: GuidedLessonDefinition[] = makeJapanesePracticalLessons(
  GUIDED_TODAY_PATH_JAPANESE_THREE_METADATA,
  japaneseA1Practical3Inputs,
  { de: 'Du hast Japanisch A1 Praxis 3 abgeschlossen.', en: 'You have completed Japanese A1 Practical 3.' },
)

export const GUIDED_TODAY_PATH_JAPANESE_FOUR_METADATA: GuidedPathMetadata = {
  id: 'japanese-a1-practical-4',
  title: 'Japanese A1 Practical 4',
  shortTitle: 'A1 Practical 4',
  subtitle: { de: 'Café, Essen und höfliches Bestellen', en: 'Cafe, food, and polite ordering' },
  level: 'A1',
  baseLanguage: 'German',
  targetLanguage: 'Japanese',
  estimatedMinutes: 5,
}

const japaneseA1Practical4Inputs: JapaneseLessonInput[] = [
  {
    slug: 'sumimasen-hitori-desu',
    title: { de: 'Ein Tisch für eine Person', en: 'A table for one' },
    situation: {
      de: 'Am Eingang eines kleinen Ramen-Ladens blickt die Bedienung von der Sitzliste auf, als du hereinkommst.',
      en: 'At the entrance to a small ramen shop, the host looks up from the seating list as you come in.',
    },
    pedagogicalGoal: 'Mit 一人 die Gruppengröße nennen und die knappe Antwort durch すみません höflich eröffnen.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: 'すみません、 一人 です。', baseText: { de: 'Entschuldigung, eine Person.', en: 'Excuse me, one person.' } },
      meaning: { de: 'Eine natürliche kurze Antwort am Restauranteingang, wenn du allein bist.', en: 'A natural short answer at a restaurant entrance when you are alone.' },
      chunks: [
        { id: 'sumimasen-hitori-desu-attention', targetText: 'すみません、', baseText: { de: 'Entschuldigung,', en: 'Excuse me,' } },
        { id: 'sumimasen-hitori-desu-party', targetText: '一人 です。', baseText: { de: 'eine Person.', en: 'one person.' } },
      ],
      lessonItems: [
        { id: 'sumimasen-hitori-desu-item-hitori', targetText: '一人', baseText: { de: 'eine Person (hitori)', en: 'one person (hitori)' }, acceptedAnswers: ['一人', 'ひとり'] },
        { id: 'sumimasen-hitori-desu-item-futari', targetText: '二人', baseText: { de: 'zwei Personen (futari)', en: 'two people (futari)' }, acceptedAnswers: ['二人', 'ふたり'] },
        { id: 'sumimasen-hitori-desu-item-seki', targetText: '席', baseText: { de: 'Sitzplatz (seki)', en: 'seat (seki)' }, acceptedAnswers: ['席', 'せき'] },
        { id: 'sumimasen-hitori-desu-item-iriguchi', targetText: '入口', baseText: { de: 'Eingang (iriguchi)', en: 'entrance (iriguchi)' }, acceptedAnswers: ['入口', 'いりぐち'] },
      ],
      buildChips: ['すみません、', '一人 です。', '予約が あります。', '二人 です。'],
      typeRecall: {
        before: 'すみません、 ', answer: '一人', after: ' です。',
        acceptedAnswers: japaneseAccepted('一人', 'ひとり'),
        fallbackChoices: ['一人', '二人', '三人', '四人'],
      },
      speakTarget: {
        baseCue: { de: 'Entschuldigung, eine Person.', en: 'Excuse me, one person.' },
        targetPhrase: 'すみません、 一人 です。',
        acceptedAnswers: ['すみません、 一人 です。', 'すみません、 ひとり です。'],
        requiredTokens: ['すみません、', '一人', 'です。'], optionalTokens: [],
      },
      sceneCaption: { de: 'Vor dem schmalen Eingang wartet die Bedienung mit Stift und einer noch freien Zeile auf der Sitzliste.', en: 'At the narrow entrance, the host waits with a pen and an open line on the seating list.' },
      trophyWord: {
        word: '一人', meaning: { de: 'eine Person / allein', en: 'one person / alone' }, example: '一人 です。',
        whyThisWord: { de: '一人 beantwortet am Eingang sofort die Frage nach der Gruppengröße und ist für Alleinreisende besonders nützlich.', en: '一人 immediately answers the party-size question at the door and is especially useful for solo travelers.' },
      },
      placeholderCaption: { de: 'Kleiner Ramen-Eingang mit Sitzliste, Hockerreihe und einem freien Platz am Tresen.', en: 'Small ramen-shop entrance with a seating list, counter stools, and one open place.' },
      songMood: 'quiet confident solo arrival',
      visualNotes: 'Compact ramen-shop doorway, host stand and counter stools visible, welcoming rather than crowded.',
    }),
  },
  {
    slug: 'sumimasen-menyu-onegaishimasu',
    title: { de: 'Die Speisekarte, bitte', en: 'The menu, please' },
    situation: {
      de: 'Am Tisch steht nur ein Wasserglas; die Bedienung kommt zurück, bevor eine Speisekarte vor dir liegt.',
      en: 'Only a water glass is on the table; the server returns before a menu has been placed in front of you.',
    },
    pedagogicalGoal: 'メニューを mit der festen Serviceformel お願いします zu einer höflichen Bitte verbinden.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: 'すみません、 メニューを お願いします。', baseText: { de: 'Entschuldigung, die Speisekarte bitte.', en: 'Excuse me, the menu please.' } },
      meaning: { de: 'Eine direkte, freundliche Bitte um die Speisekarte am Tisch.', en: 'A direct, friendly request for the menu at the table.' },
      chunks: [
        { id: 'sumimasen-menyu-onegaishimasu-attention', targetText: 'すみません、', baseText: { de: 'Entschuldigung,', en: 'Excuse me,' } },
        { id: 'sumimasen-menyu-onegaishimasu-menu', targetText: 'メニューを', baseText: { de: 'die Speisekarte', en: 'the menu' } },
        { id: 'sumimasen-menyu-onegaishimasu-request', targetText: 'お願いします。', baseText: { de: 'bitte.', en: 'please.' } },
      ],
      lessonItems: [
        { id: 'sumimasen-menyu-onegaishimasu-item-menyu', targetText: 'メニュー', baseText: { de: 'Speisekarte (menyū)', en: 'menu (menyū)' }, acceptedAnswers: ['メニュー'] },
        { id: 'sumimasen-menyu-onegaishimasu-item-menyuwo', targetText: 'メニューを', baseText: { de: 'Speisekarte (menyū o; mit Objektpartikel)', en: 'menu (menyū o; with object particle)' }, acceptedAnswers: ['メニューを'] },
        { id: 'sumimasen-menyu-onegaishimasu-item-nomimono', targetText: '飲み物', baseText: { de: 'Getränk (nomimono)', en: 'drink (nomimono)' }, acceptedAnswers: ['飲み物', 'のみもの'] },
        { id: 'sumimasen-menyu-onegaishimasu-item-tabemono', targetText: '食べ物', baseText: { de: 'Essen (tabemono)', en: 'food (tabemono)' }, acceptedAnswers: ['食べ物', 'たべもの'] },
        { id: 'sumimasen-menyu-onegaishimasu-item-chumon', targetText: '注文', baseText: { de: 'Bestellung (chūmon)', en: 'order (chūmon)' }, acceptedAnswers: ['注文', 'ちゅうもん'] },
      ],
      buildChips: ['すみません、', 'メニューを', 'お願いします。', '水を お願いします。', 'お会計を お願いします。'],
      typeRecall: {
        before: 'すみません、 ', answer: 'メニューを', after: ' お願いします。',
        acceptedAnswers: japaneseAccepted('メニューを'),
        fallbackChoices: ['メニューを', 'お水を', 'おしぼりを', 'デザートを'],
      },
      speakTarget: {
        baseCue: { de: 'Entschuldigung, die Speisekarte bitte.', en: 'Excuse me, the menu please.' },
        targetPhrase: 'すみません、 メニューを お願いします。',
        acceptedAnswers: ['すみません、 メニューを お願いします。', 'すみません、 メニューを おねがいします。'],
        requiredTokens: ['すみません、', 'メニューを', 'お願いします。'], optionalTokens: [],
      },
      sceneCaption: { de: 'Auf der leeren Tischfläche steht nur Wasser, während die Bedienung mit einem Stapel Karten in der Nähe anhält.', en: 'Only water sits on the empty tabletop while the server pauses nearby with a stack of folders.' },
      trophyWord: {
        word: 'メニュー', meaning: { de: 'Speisekarte', en: 'menu' }, example: 'メニューを お願いします。',
        whyThisWord: { de: 'メニュー ist in Cafés und Restaurants sofort verständlich; mit を wird es zum Gegenstand deiner Bitte.', en: 'メニュー is immediately understood in cafes and restaurants; を marks it as the object of your request.' },
      },
      placeholderCaption: { de: 'Heller Cafétisch mit Wasserglas, Besteckablage und einem Stapel geschlossener Speisekarten daneben.', en: 'Bright cafe table with a water glass, cutlery rest, and a stack of closed menus nearby.' },
      songMood: 'light attentive table service',
      visualNotes: 'Casual Japanese cafe table, no menu yet, server approaching with several menu folders.',
    }),
  },
  {
    slug: 'kohi-o-hitotsu-onegaishimasu',
    title: { de: 'Einen Kaffee, bitte', en: 'One coffee, please' },
    situation: {
      de: 'Am Café-Tresen ist die Bestellanzeige leer; der Barista wartet auf dein einzelnes Getränk.',
      en: 'At a cafe counter, the order display is blank and the barista waits for your single drink order.',
    },
    pedagogicalGoal: 'コーヒーを mit dem allgemeinen Zählwort 一つ und お願いします als feste Einzelbestellung verwenden.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: 'すみません、 コーヒーを 一つ お願いします。', baseText: { de: 'Entschuldigung, einen Kaffee bitte.', en: 'Excuse me, one coffee please.' } },
      meaning: { de: 'Eine vollständige Bestellung für genau einen Kaffee.', en: 'A complete order for exactly one coffee.' },
      chunks: [
        { id: 'kohi-o-hitotsu-onegaishimasu-attention', targetText: 'すみません、', baseText: { de: 'Entschuldigung,', en: 'Excuse me,' } },
        { id: 'kohi-o-hitotsu-onegaishimasu-drink', targetText: 'コーヒーを', baseText: { de: 'einen Kaffee', en: 'a coffee' } },
        { id: 'kohi-o-hitotsu-onegaishimasu-count', targetText: '一つ', baseText: { de: 'ein Stück / einmal', en: 'one item' } },
        { id: 'kohi-o-hitotsu-onegaishimasu-request', targetText: 'お願いします。', baseText: { de: 'bitte.', en: 'please.' } },
      ],
      lessonItems: [
        { id: 'kohi-o-hitotsu-onegaishimasu-item-kohi', targetText: 'コーヒー', baseText: { de: 'Kaffee (kōhī)', en: 'coffee (kōhī)' }, acceptedAnswers: ['コーヒー'] },
        { id: 'kohi-o-hitotsu-onegaishimasu-item-kohiwo', targetText: 'コーヒーを', baseText: { de: 'Kaffee (kōhī o; mit Objektpartikel)', en: 'coffee (kōhī o; with object particle)' }, acceptedAnswers: ['コーヒーを'] },
        { id: 'kohi-o-hitotsu-onegaishimasu-item-hitotsu', targetText: '一つ', baseText: { de: 'ein Stück / einmal (hitotsu)', en: 'one item (hitotsu)' }, acceptedAnswers: ['一つ', 'ひとつ'] },
        { id: 'kohi-o-hitotsu-onegaishimasu-item-chumon', targetText: '注文', baseText: { de: 'Bestellung (chūmon)', en: 'order (chūmon)' }, acceptedAnswers: ['注文', 'ちゅうもん'] },
      ],
      buildChips: ['すみません、', 'コーヒーを', '一つ', 'お願いします。', 'コーヒーは', '二つ お願いします。'],
      typeRecall: {
        before: 'すみません、 ', answer: 'コーヒーを', after: ' 一つ お願いします。',
        acceptedAnswers: japaneseAccepted('コーヒーを'),
        fallbackChoices: ['コーヒーを', 'お茶を', '紅茶を', '水を'],
      },
      speakTarget: {
        baseCue: { de: 'Entschuldigung, einen Kaffee bitte.', en: 'Excuse me, one coffee please.' },
        targetPhrase: 'すみません、 コーヒーを 一つ お願いします。',
        acceptedAnswers: ['すみません、 コーヒーを 一つ お願いします。', 'すみません、 コーヒーを ひとつ おねがいします。'],
        requiredTokens: ['すみません、', 'コーヒーを', 'お願いします。'], optionalTokens: ['一つ'],
      },
      sceneCaption: { de: 'Der Barista steht vor einem leeren Bestellbildschirm, neben dem nur verschiedene Tassengrößen ausgestellt sind.', en: 'The barista stands before a blank order screen with only the available cup sizes on display.' },
      trophyWord: {
        word: 'コーヒー', meaning: { de: 'Kaffee', en: 'coffee' }, example: 'コーヒーは おいしい です。',
        whyThisWord: { de: 'コーヒー ist ein verlässliches Lehnwort an fast jedem Cafétresen und trägt in der Bestellung direkt die Objektpartikel を.', en: 'コーヒー is a reliable loanword at almost any cafe counter and takes the object particle を directly in the order.' },
      },
      placeholderCaption: { de: 'Moderner Cafétresen mit leerem Bestelldisplay, Tassenstapel und wartendem Barista.', en: 'Modern cafe counter with a blank order display, stacked cups, and a waiting barista.' },
      songMood: 'crisp single-drink order',
      visualNotes: 'Japanese coffee counter, one open transaction on the register, cup sizes visible but no drink selected.',
    }),
  },
  {
    slug: 'sato-nashide-onegaishimasu',
    title: { de: 'Ohne Zucker, bitte', en: 'No sugar, please' },
    situation: {
      de: 'Die Bedienung hält beim Kaffee Zucker und Milch bereit; du möchtest eine der Beigaben weglassen.',
      en: 'The server holds sugar and milk beside your coffee; you want one of the additions left out.',
    },
    pedagogicalGoal: '砂糖 なしで als feste Ohne-Angabe vor お願いします setzen.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: '砂糖 なしで お願いします。', baseText: { de: 'Ohne Zucker, bitte.', en: 'No sugar, please.' } },
      meaning: { de: 'Eine knappe Änderungsbitte, die Zucker ausdrücklich ausschließt.', en: 'A concise modification request that explicitly leaves out sugar.' },
      chunks: [
        { id: 'sato-nashide-onegaishimasu-sugar', targetText: '砂糖', baseText: { de: 'Zucker', en: 'sugar' } },
        { id: 'sato-nashide-onegaishimasu-without', targetText: 'なしで', baseText: { de: 'ohne', en: 'without' } },
        { id: 'sato-nashide-onegaishimasu-request', targetText: 'お願いします。', baseText: { de: 'bitte.', en: 'please.' } },
      ],
      lessonItems: [
        { id: 'sato-nashide-onegaishimasu-item-sato', targetText: '砂糖', baseText: { de: 'Zucker (satō)', en: 'sugar (satō)' }, acceptedAnswers: ['砂糖', 'さとう'] },
        { id: 'sato-nashide-onegaishimasu-item-nashide', targetText: 'なしで', baseText: { de: 'ohne (nashi de)', en: 'without (nashi de)' }, acceptedAnswers: ['なしで'] },
        { id: 'sato-nashide-onegaishimasu-item-miruku', targetText: 'ミルク', baseText: { de: 'Milch (miruku)', en: 'milk (miruku)' }, acceptedAnswers: ['ミルク'] },
        { id: 'sato-nashide-onegaishimasu-item-kori', targetText: '氷', baseText: { de: 'Eiswürfel (kōri)', en: 'ice (kōri)' }, acceptedAnswers: ['氷', 'こおり'] },
      ],
      buildChips: ['砂糖', 'なしで', 'お願いします。', 'ミルク なしで', '砂糖 ありで'],
      typeRecall: {
        before: '', answer: '砂糖', after: ' なしで お願いします。',
        acceptedAnswers: japaneseAccepted('砂糖', 'さとう'),
        fallbackChoices: ['砂糖', 'ミルク', '氷', 'レモン'],
      },
      speakTarget: {
        baseCue: { de: 'Ohne Zucker, bitte.', en: 'No sugar, please.' },
        targetPhrase: '砂糖 なしで お願いします。',
        acceptedAnswers: ['砂糖 なしで お願いします。', 'さとう なしで おねがいします。'],
        requiredTokens: ['砂糖', 'なしで', 'お願いします。'], optionalTokens: [],
      },
      sceneCaption: { de: 'Neben der frisch eingeschenkten Tasse hält die Bedienung zwei kleine Portionsbehälter zur Auswahl bereit.', en: 'Beside the freshly poured cup, the server holds two small portion containers for a choice.' },
      trophyWord: {
        word: '砂糖', meaning: { de: 'Zucker', en: 'sugar' }, example: '砂糖 なしで お願いします。',
        whyThisWord: { de: '砂糖 ist die konkrete Zutat, die du bei Kaffee und Tee mit なしで unkompliziert abwählen kannst.', en: '砂糖 is the concrete ingredient you can easily leave out of coffee or tea with なしで.' },
      },
      placeholderCaption: { de: 'Kaffeetasse mit zwei getrennten Portionsschälchen für Zucker und Milch auf einem kleinen Tablett.', en: 'Coffee cup with separate sugar and milk portions on a small tray.' },
      songMood: 'clean custom coffee request',
      visualNotes: 'Table-service coffee, two add-in choices clearly separated, hand paused before adding either one.',
    }),
  },
  {
    slug: 'korewa-karai-desuka',
    title: { de: 'Ist das scharf?', en: 'Is this spicy?' },
    situation: {
      de: 'In einem Ramen-Laden zeigt die Karte eine rote Brühe mit Chilischote, aber ohne verständliche Schärfeangabe.',
      en: 'At a ramen shop, the menu shows a red broth with a chili pepper but no spice label you can understand.',
    },
    pedagogicalGoal: 'これは als sichtbares Gerichtsthema mit 辛い ですか zu einer einfachen Eigenschaftsfrage verbinden.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: 'これは 辛い ですか。', baseText: { de: 'Ist das scharf?', en: 'Is this spicy?' } },
      meaning: { de: 'Eine Sicherheitsfrage zur Schärfe eines sichtbaren Gerichts.', en: 'A safety check about the spice level of a visible dish.' },
      chunks: [
        { id: 'korewa-karai-desuka-dish', targetText: 'これは', baseText: { de: 'dieses Gericht', en: 'this dish' } },
        { id: 'korewa-karai-desuka-spicy', targetText: '辛い', baseText: { de: 'scharf', en: 'spicy' } },
        { id: 'korewa-karai-desuka-question', targetText: 'ですか。', baseText: { de: 'ist es?', en: 'is it?' } },
      ],
      lessonItems: [
        { id: 'korewa-karai-desuka-item-korewa', targetText: 'これは', baseText: { de: 'dieses hier (kore wa; mit Themenpartikel)', en: 'this one (kore wa; with topic particle)' }, acceptedAnswers: ['これは'] },
        { id: 'korewa-karai-desuka-item-karai', targetText: '辛い', baseText: { de: 'scharf (karai)', en: 'spicy (karai)' }, acceptedAnswers: ['辛い', 'からい'] },
        { id: 'korewa-karai-desuka-item-amai', targetText: '甘い', baseText: { de: 'süß (amai)', en: 'sweet (amai)' }, acceptedAnswers: ['甘い', 'あまい'] },
        { id: 'korewa-karai-desuka-item-ramen', targetText: 'ラーメン', baseText: { de: 'Ramen (rāmen)', en: 'ramen (rāmen)' }, acceptedAnswers: ['ラーメン'] },
      ],
      buildChips: ['これは', '辛い', 'ですか。', 'これは 甘い', '熱い ですか。'],
      typeRecall: {
        before: 'これは ', answer: '辛い', after: ' ですか。',
        acceptedAnswers: japaneseAccepted('辛い', 'からい'),
        fallbackChoices: ['辛い', '甘い', '熱い', '冷たい'],
      },
      speakTarget: {
        baseCue: { de: 'Ist das scharf?', en: 'Is this spicy?' },
        targetPhrase: 'これは 辛い ですか。',
        acceptedAnswers: ['これは 辛い ですか。', 'これは からい ですか。'],
        requiredTokens: ['これは', '辛い', 'ですか。'], optionalTokens: [],
      },
      sceneCaption: { de: 'Auf der geöffneten Karte steht eine tiefrote Ramenschale neben einem kleinen Chilisymbol ohne lesbare Skala.', en: 'On the open menu, a deep-red ramen bowl appears beside a small chili symbol with no readable scale.' },
      trophyWord: {
        word: '辛い', meaning: { de: 'scharf', en: 'spicy' }, example: 'これは 辛い ですか。',
        whyThisWord: { de: '辛い ist die entscheidende Eigenschaft bei Chili-Gerichten und schützt vor einer unerwartet scharfen Bestellung.', en: '辛い is the key property for chili dishes and helps prevent an unexpectedly hot order.' },
      },
      placeholderCaption: { de: 'Geöffnete Ramen-Karte mit roter Brühe, Chilisymbol und nicht erklärter Schärfestufe.', en: 'Open ramen menu with red broth, a chili icon, and an unexplained spice level.' },
      songMood: 'curious cautious flavor check',
      visualNotes: 'Ramen menu close-up, vivid red broth and chili mark, staff present but no spice answer shown.',
    }),
  },
  {
    slug: 'chumonwa-ijo-desu',
    title: { de: 'Das ist alles', en: 'That is all' },
    situation: {
      de: 'Nach zwei notierten Gerichten hält die Bedienung den Stift noch über dem Bestellblock und wartet auf ein weiteres Element.',
      en: 'After writing down two dishes, the server keeps the pen above the order pad and waits for another item.',
    },
    pedagogicalGoal: '注文は zum Thema machen und mit 以上 です eine Bestellung eindeutig abschließen.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: '注文は 以上 です。', baseText: { de: 'Das ist alles für die Bestellung.', en: 'That is all for the order.' } },
      meaning: { de: 'Ein klarer Abschluss, wenn keine weiteren Gerichte dazukommen.', en: 'A clear ending when no more dishes need to be added.' },
      chunks: [
        { id: 'chumonwa-ijo-desu-order', targetText: '注文は', baseText: { de: 'was die Bestellung angeht', en: 'as for the order' } },
        { id: 'chumonwa-ijo-desu-finished', targetText: '以上', baseText: { de: 'das ist alles', en: 'that is all' } },
        { id: 'chumonwa-ijo-desu-polite', targetText: 'です。', baseText: { de: 'höflich.', en: 'politely.' } },
      ],
      lessonItems: [
        { id: 'chumonwa-ijo-desu-item-chumon', targetText: '注文', baseText: { de: 'Bestellung (chūmon)', en: 'order (chūmon)' }, acceptedAnswers: ['注文', 'ちゅうもん'] },
        { id: 'chumonwa-ijo-desu-item-chumonwa', targetText: '注文は', baseText: { de: 'Bestellung (chūmon wa; mit Themenpartikel)', en: 'order (chūmon wa; with topic particle)' }, acceptedAnswers: ['注文は', 'ちゅうもんは'] },
        { id: 'chumonwa-ijo-desu-item-ijo', targetText: '以上', baseText: { de: 'das ist alles (ijō)', en: 'that is all (ijō)' }, acceptedAnswers: ['以上', 'いじょう'] },
        { id: 'chumonwa-ijo-desu-item-tsuika', targetText: '追加', baseText: { de: 'Zusatz / Nachbestellung (tsuika)', en: 'addition / extra order (tsuika)' }, acceptedAnswers: ['追加', 'ついか'] },
      ],
      buildChips: ['注文は', '以上', 'です。', 'まだ', '追加 です。'],
      typeRecall: {
        before: '注文は ', answer: '以上', after: ' です。',
        acceptedAnswers: japaneseAccepted('以上', 'いじょう'),
        fallbackChoices: ['以上', '追加', '一つ', 'ラーメン'],
      },
      speakTarget: {
        baseCue: { de: 'Das ist alles für die Bestellung.', en: 'That is all for the order.' },
        targetPhrase: '注文は 以上 です。',
        acceptedAnswers: ['注文は 以上 です。', 'ちゅうもんは いじょう です。'],
        requiredTokens: ['注文は', '以上', 'です。'], optionalTokens: [],
      },
      sceneCaption: { de: 'Der Bestellblock zeigt zwei Zeilen, während der Stift über einer noch leeren dritten Zeile stehen bleibt.', en: 'The order pad shows two lines while the pen remains poised over an empty third line.' },
      trophyWord: {
        word: '以上', meaning: { de: 'das ist alles / darüber hinaus', en: 'that is all / above' }, example: '注文は 以上 です。',
        whyThisWord: { de: '以上 beendet eine Aufzählung eindeutig und verhindert, dass die Bedienung auf weitere Bestellwünsche warten muss.', en: '以上 closes a list unambiguously and keeps the server from waiting for additional order items.' },
      },
      placeholderCaption: { de: 'Bestellblock mit zwei ausgefüllten Zeilen, freier dritter Zeile und wartendem Stift.', en: 'Order pad with two completed lines, an empty third line, and a waiting pen.' },
      songMood: 'neat decisive order close',
      visualNotes: 'Server at table with order pad, two items recorded, pause clearly awaiting a final signal.',
    }),
  },
  {
    slug: 'korewa-mochikaeride-onegaishimasu',
    title: { de: 'Zum Mitnehmen, bitte', en: 'To go, please' },
    situation: {
      de: 'An der Bäckereikasse liegt dein Gebäck noch auf einem kleinen Tablett; die Verkäuferin hält eine Papiertüte daneben bereit.',
      en: 'At a bakery register, your pastry is still on a small tray while the clerk holds a paper bag beside it.',
    },
    pedagogicalGoal: 'Mit これは das sichtbare Produkt markieren und 持ち帰りで als Japan-typische Mitnahmeangabe verwenden.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: 'これは 持ち帰りで お願いします。', baseText: { de: 'Das hier zum Mitnehmen, bitte.', en: 'This one to go, please.' } },
      meaning: { de: 'Eine klare Verpackungsangabe für ein bereits ausgewähltes Produkt.', en: 'A clear packaging instruction for an item you have already chosen.' },
      chunks: [
        { id: 'korewa-mochikaeride-onegaishimasu-item', targetText: 'これは', baseText: { de: 'dieses hier', en: 'this one' } },
        { id: 'korewa-mochikaeride-onegaishimasu-takeout', targetText: '持ち帰りで', baseText: { de: 'zum Mitnehmen', en: 'to go' } },
        { id: 'korewa-mochikaeride-onegaishimasu-request', targetText: 'お願いします。', baseText: { de: 'bitte.', en: 'please.' } },
      ],
      lessonItems: [
        { id: 'korewa-mochikaeride-onegaishimasu-item-korewa', targetText: 'これは', baseText: { de: 'dieses hier (kore wa; mit Themenpartikel)', en: 'this one (kore wa; with topic particle)' }, acceptedAnswers: ['これは'] },
        { id: 'korewa-mochikaeride-onegaishimasu-item-mochikaeri', targetText: '持ち帰り', baseText: { de: 'Mitnahme (mochikaeri)', en: 'takeout (mochikaeri)' }, acceptedAnswers: ['持ち帰り', 'もちかえり'] },
        { id: 'korewa-mochikaeride-onegaishimasu-item-mochikaeride', targetText: '持ち帰りで', baseText: { de: 'zum Mitnehmen (mochikaeri de; mit Artpartikel)', en: 'to go (mochikaeri de; with manner particle)' }, acceptedAnswers: ['持ち帰りで', 'もちかえりで'] },
        { id: 'korewa-mochikaeride-onegaishimasu-item-tennai', targetText: '店内', baseText: { de: 'im Laden (tennai)', en: 'inside the shop (tennai)' }, acceptedAnswers: ['店内', 'てんない'] },
      ],
      buildChips: ['これは', '持ち帰りで', 'お願いします。', '店内で', '袋を お願いします。'],
      typeRecall: {
        before: 'これは ', answer: '持ち帰りで', after: ' お願いします。',
        acceptedAnswers: japaneseAccepted('持ち帰りで', 'もちかえりで'),
        fallbackChoices: ['持ち帰りで', '店内で', 'ここで', '外で'],
      },
      speakTarget: {
        baseCue: { de: 'Das hier zum Mitnehmen, bitte.', en: 'This one to go, please.' },
        targetPhrase: 'これは 持ち帰りで お願いします。',
        acceptedAnswers: ['これは 持ち帰りで お願いします。', 'これは もちかえりで おねがいします。'],
        requiredTokens: ['これは', '持ち帰りで', 'お願いします。'], optionalTokens: [],
      },
      sceneCaption: { de: 'Das ausgewählte Gebäck liegt zwischen einem Serviertablett und einer offenen Papiertüte, während die Verkäuferin wartet.', en: 'The chosen pastry sits between a serving tray and an open paper bag while the clerk waits.' },
      trophyWord: {
        word: '持ち帰り', meaning: { de: 'Mitnahme / zum Mitnehmen', en: 'takeout / to go' }, example: 'これは 持ち帰りで お願いします。',
        whyThisWord: { de: '持ち帰り ist die übliche Mitnahmeoption in Japan und grenzt sie klar vom Essen im Laden ab.', en: '持ち帰り is the usual takeout option in Japan and clearly distinguishes it from eating inside.' },
      },
      placeholderCaption: { de: 'Japanische Bäckereikasse mit Gebäcktablett, offener Papiertüte und zwei möglichen Verpackungswegen.', en: 'Japanese bakery register with a pastry tray, an open paper bag, and two possible serving paths.' },
      songMood: 'bright bakery takeaway choice',
      visualNotes: 'Bakery checkout, pastry centered between dine-in tray and takeaway bag, clerk awaiting instruction.',
    }),
  },
  {
    slug: 'totemo-oishii-desu',
    title: { de: 'Sehr lecker', en: 'Very delicious' },
    situation: {
      de: 'Der Koch blickt vom offenen Tresen zu deiner fast leeren Schale und wartet auf deine Reaktion.',
      en: 'The cook looks from the open counter to your nearly empty bowl and waits for your reaction.',
    },
    pedagogicalGoal: 'おいしい です mit とても zu einem warmen, höflichen Lob für das Essen verstärken.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: 'とても おいしい です。', baseText: { de: 'Es ist sehr lecker.', en: 'It’s really delicious.' } },
      meaning: { de: 'Ein direktes höfliches Kompliment nach einem gelungenen Gericht.', en: 'A direct polite compliment after enjoying a dish.' },
      chunks: [
        { id: 'totemo-oishii-desu-degree', targetText: 'とても', baseText: { de: 'sehr', en: 'very' } },
        { id: 'totemo-oishii-desu-taste', targetText: 'おいしい', baseText: { de: 'lecker', en: 'delicious' } },
        { id: 'totemo-oishii-desu-polite', targetText: 'です。', baseText: { de: 'ist es.', en: 'it is.' } },
      ],
      lessonItems: [
        { id: 'totemo-oishii-desu-item-totemo', targetText: 'とても', baseText: { de: 'sehr (totemo)', en: 'very (totemo)' }, acceptedAnswers: ['とても'] },
        { id: 'totemo-oishii-desu-item-oishii', targetText: 'おいしい', baseText: { de: 'lecker (oishii)', en: 'delicious (oishii)' }, acceptedAnswers: ['おいしい'] },
        { id: 'totemo-oishii-desu-item-ryori', targetText: '料理', baseText: { de: 'Gericht / Küche (ryōri)', en: 'dish / cuisine (ryōri)' }, acceptedAnswers: ['料理', 'りょうり'] },
        { id: 'totemo-oishii-desu-item-ramen', targetText: 'ラーメン', baseText: { de: 'Ramen (rāmen)', en: 'ramen (rāmen)' }, acceptedAnswers: ['ラーメン'] },
      ],
      buildChips: ['とても', 'おいしい', 'です。', '少し', '辛い です。'],
      typeRecall: {
        before: 'とても ', answer: 'おいしい', after: ' です。',
        acceptedAnswers: japaneseAccepted('おいしい'),
        fallbackChoices: ['おいしい', '新しい', '大きい', 'きれい'],
      },
      speakTarget: {
        baseCue: { de: 'Es ist sehr lecker.', en: 'It’s really delicious.' },
        targetPhrase: 'とても おいしい です。',
        acceptedAnswers: ['とても おいしい です。'],
        requiredTokens: ['とても', 'おいしい', 'です。'], optionalTokens: [],
      },
      sceneCaption: { de: 'Am offenen Küchentresen steht deine fast leere Schale im Blickfeld des Kochs, der kurz innehält.', en: 'At the open kitchen counter, your nearly empty bowl is in the cook’s view as they pause.' },
      trophyWord: {
        word: 'おいしい', meaning: { de: 'lecker', en: 'delicious' }, example: 'この 料理は おいしい です。',
        whyThisWord: { de: 'おいしい ist das unmittelbarste positive Essenswort und gibt Küche oder Service eine klare freundliche Rückmeldung.', en: 'おいしい is the most immediate positive food word and gives the kitchen or staff clear, friendly feedback.' },
      },
      placeholderCaption: { de: 'Offener Ramen-Tresen mit fast leerer Schale und aufmerksamem Koch im Hintergrund.', en: 'Open ramen counter with a nearly empty bowl and an attentive cook in the background.' },
      songMood: 'warm satisfied food praise',
      visualNotes: 'Open-kitchen ramen counter, finished meal evident, cook waiting for an authentic reaction.',
    }),
  },
  {
    slug: 'ii-tenki-desune',
    title: { de: 'Schönes Wetter', en: 'Nice weather' },
    situation: {
      de: 'Auf der Caféterrasse reißt nach dem Regen die Wolkendecke auf; die Person am Nachbartisch schaut ebenfalls zum Himmel.',
      en: 'On a cafe terrace, the clouds break after rain and the person at the next table also looks up at the sky.',
    },
    pedagogicalGoal: 'Mit いい 天気 und dem einmaligen bestätigenden ね eine leichte gemeinsame Beobachtung formulieren.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: 'いい 天気 ですね。', baseText: { de: 'Schönes Wetter, nicht wahr?', en: 'Nice weather, isn’t it?' } },
      meaning: { de: 'Ein natürlicher kleiner Gesprächseinstieg über das gemeinsam sichtbare Wetter.', en: 'A natural small conversation opener about the weather you both can see.' },
      chunks: [
        { id: 'ii-tenki-desune-weather', targetText: 'いい 天気', baseText: { de: 'schönes Wetter', en: 'nice weather' } },
        { id: 'ii-tenki-desune-shared', targetText: 'ですね。', baseText: { de: 'nicht wahr?', en: 'isn’t it?' } },
      ],
      lessonItems: [
        { id: 'ii-tenki-desune-item-ii', targetText: 'いい', baseText: { de: 'gut / schön (ii)', en: 'good / nice (ii)' }, acceptedAnswers: ['いい'] },
        { id: 'ii-tenki-desune-item-tenki', targetText: '天気', baseText: { de: 'Wetter (tenki)', en: 'weather (tenki)' }, acceptedAnswers: ['天気', 'てんき'] },
        { id: 'ii-tenki-desune-item-hare', targetText: '晴れ', baseText: { de: 'heiteres Wetter (hare)', en: 'clear weather (hare)' }, acceptedAnswers: ['晴れ', 'はれ'] },
        { id: 'ii-tenki-desune-item-ame', targetText: '雨', baseText: { de: 'Regen (ame)', en: 'rain (ame)' }, acceptedAnswers: ['雨', 'あめ'] },
      ],
      buildChips: ['いい 天気', 'ですね。', 'いい 景色', '雨 です。'],
      typeRecall: {
        before: 'いい ', answer: '天気', after: ' ですね。',
        acceptedAnswers: japaneseAccepted('天気', 'てんき'),
        fallbackChoices: ['天気', '景色', '店', '料理'],
      },
      speakTarget: {
        baseCue: { de: 'Schönes Wetter, nicht wahr?', en: 'Nice weather, isn’t it?' },
        targetPhrase: 'いい 天気 ですね。',
        acceptedAnswers: ['いい 天気 ですね。', 'いい てんき ですね。'],
        requiredTokens: ['いい', '天気', 'ですね。'], optionalTokens: [],
      },
      sceneCaption: { de: 'Über den noch nassen Terrassentischen öffnet sich der Himmel, und zwei Blicke treffen sich kurz oberhalb der Tassen.', en: 'Above the still-wet terrace tables, the sky opens and two glances briefly meet over the cups.' },
      trophyWord: {
        word: '天気', meaning: { de: 'Wetter', en: 'weather' }, example: '今日は いい 天気 です。',
        whyThisWord: { de: '天気 schafft eine sichere gemeinsame Beobachtung und passt besonders gut zu einer kurzen Begegnung im Freien.', en: '天気 creates a safe shared observation and works especially well for a brief encounter outdoors.' },
      },
      placeholderCaption: { de: 'Caféterrasse nach einem Schauer mit nassen Tischen, aufbrechenden Wolken und zwei Gästen.', en: 'Cafe terrace after a shower with wet tables, breaking clouds, and two guests.' },
      songMood: 'fresh after-rain small talk',
      visualNotes: 'Outdoor cafe after rain, light returning through clouds, subtle shared glance without a staged conversation.',
    }),
  },
  {
    slug: 'sumimasen-okaikei-onegaishimasu',
    title: { de: 'Die Rechnung, bitte', en: 'The bill, please' },
    situation: {
      de: 'Dein Tablett ist abgeräumt, und die Bedienung kommt mit einem kleinen Rechnungsbrett am Tisch vorbei.',
      en: 'Your tray has been cleared and the server passes the table carrying a small bill holder.',
    },
    pedagogicalGoal: 'お会計を als Japan-typischen Rechnungsanker mit einer höflichen Bitte am Tisch verwenden.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: 'すみません、 お会計を お願いします。', baseText: { de: 'Entschuldigung, die Rechnung bitte.', en: 'Excuse me, the bill please.' } },
      meaning: { de: 'Eine eindeutige Bitte, den Bezahlvorgang nach dem Essen zu beginnen.', en: 'An unambiguous request to begin paying after the meal.' },
      chunks: [
        { id: 'sumimasen-okaikei-onegaishimasu-attention', targetText: 'すみません、', baseText: { de: 'Entschuldigung,', en: 'Excuse me,' } },
        { id: 'sumimasen-okaikei-onegaishimasu-bill', targetText: 'お会計を', baseText: { de: 'die Rechnung', en: 'the bill' } },
        { id: 'sumimasen-okaikei-onegaishimasu-request', targetText: 'お願いします。', baseText: { de: 'bitte.', en: 'please.' } },
      ],
      lessonItems: [
        { id: 'sumimasen-okaikei-onegaishimasu-item-sumimasen', targetText: 'すみません', baseText: { de: 'Entschuldigung (sumimasen)', en: 'excuse me (sumimasen)' }, acceptedAnswers: ['すみません'] },
        { id: 'sumimasen-okaikei-onegaishimasu-item-okaikei', targetText: 'お会計', baseText: { de: 'Rechnung / Bezahlen (okaikei)', en: 'bill / checkout (okaikei)' }, acceptedAnswers: ['お会計', 'おかいけい'] },
        { id: 'sumimasen-okaikei-onegaishimasu-item-okaikeiwo', targetText: 'お会計を', baseText: { de: 'Rechnung (okaikei o; mit Objektpartikel)', en: 'bill (okaikei o; with object particle)' }, acceptedAnswers: ['お会計を', 'おかいけいを'] },
        { id: 'sumimasen-okaikei-onegaishimasu-item-reji', targetText: 'レジ', baseText: { de: 'Kasse (reji)', en: 'register (reji)' }, acceptedAnswers: ['レジ'] },
      ],
      buildChips: ['すみません、', 'お会計を', 'お願いします。', 'メニューを', '追加を お願いします。'],
      typeRecall: {
        before: 'すみません、 ', answer: 'お会計を', after: ' お願いします。',
        acceptedAnswers: japaneseAccepted('お会計を', 'おかいけいを'),
        fallbackChoices: ['お会計を', 'メニューを', 'ナプキンを', 'タオルを'],
      },
      speakTarget: {
        baseCue: { de: 'Entschuldigung, die Rechnung bitte.', en: 'Excuse me, the bill please.' },
        targetPhrase: 'すみません、 お会計を お願いします。',
        acceptedAnswers: ['すみません、 お会計を お願いします。', 'すみません、 おかいけいを おねがいします。'],
        requiredTokens: ['すみません、', 'お会計を', 'お願いします。'], optionalTokens: [],
      },
      sceneCaption: { de: 'Der leere Tisch ist abgewischt, während die Bedienung mit einem geschlossenen Rechnungsbrett in Reichweite vorbeikommt.', en: 'The empty table has been wiped as the server passes within reach carrying a closed bill holder.' },
      trophyWord: {
        word: 'お会計', meaning: { de: 'Rechnung / Bezahlen', en: 'bill / checkout' }, example: 'お会計を お願いします。',
        whyThisWord: { de: 'お会計 ist der natürliche Anker für die Rechnung und funktioniert im Restaurant ebenso wie an einer kleinen Kasse.', en: 'お会計 is the natural anchor for the bill and works in restaurants as well as at a small register.' },
      },
      placeholderCaption: { de: 'Aufgeräumter Restauranttisch mit vorbeigetragenem Rechnungsbrett und sichtbarer Kasse im Hintergrund.', en: 'Cleared restaurant table with a bill holder passing by and the register visible in the background.' },
      songMood: 'smooth end-of-meal close',
      visualNotes: 'Restaurant table after dining, bill holder nearby, register visible but payment not yet initiated.',
    }),
  },
]

export const JAPANESE_A1_PRACTICAL_4_LESSONS: GuidedLessonDefinition[] = makeJapanesePracticalLessons(
  GUIDED_TODAY_PATH_JAPANESE_FOUR_METADATA,
  japaneseA1Practical4Inputs,
  { de: 'Du hast Japanisch A1 Praxis 4 abgeschlossen.', en: 'You have completed Japanese A1 Practical 4.' },
)

export const GUIDED_TODAY_PATH_JAPANESE_FIVE_METADATA: GuidedPathMetadata = {
  id: 'japanese-a1-practical-5',
  title: 'Japanese A1 Practical 5',
  shortTitle: 'A1 Practical 5',
  subtitle: { de: 'Entschuldigungen, Kennenlernen und kleine Pläne', en: 'Apologies, introductions, and casual plans' },
  level: 'A1',
  baseLanguage: 'German',
  targetLanguage: 'Japanese',
  estimatedMinutes: 5,
}

const japaneseA1Practical5Inputs: JapaneseLessonInput[] = [
  {
    slug: 'kyo-wa-okurete-sumimasen',
    title: { de: 'Entschuldigung für die Verspätung', en: 'Sorry for being late' },
    situation: {
      de: 'Vor einem Café wartet deine neue Bekanntschaft bereits neben der Uhr; du kommst einige Minuten nach der vereinbarten Zeit an.',
      en: 'Outside a cafe, your new acquaintance is already waiting beside the clock when you arrive a few minutes after the agreed time.',
    },
    pedagogicalGoal: 'Die feste Entschuldigung 遅れて すみません mit 本当に aufrichtig verstärken.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: '本当に 遅れて すみません。', baseText: { de: 'Es tut mir wirklich leid, dass ich zu spät bin.', en: 'I am really sorry for being late.' } },
      meaning: { de: 'Eine direkte höfliche Entschuldigung beim verspäteten Eintreffen.', en: 'A direct polite apology when arriving late.' },
      chunks: [
        { id: 'kyo-wa-okurete-sumimasen-really', targetText: '本当に', baseText: { de: 'wirklich', en: 'really' } },
        { id: 'kyo-wa-okurete-sumimasen-late', targetText: '遅れて', baseText: { de: 'weil ich zu spät bin', en: 'for being late' } },
        { id: 'kyo-wa-okurete-sumimasen-apology', targetText: 'すみません。', baseText: { de: 'Entschuldigung.', en: 'I am sorry.' } },
      ],
      lessonItems: [
        { id: 'kyo-wa-okurete-sumimasen-item-kyo', targetText: '今日', baseText: { de: 'heute (kyō)', en: 'today (kyō)' }, acceptedAnswers: ['今日', 'きょう'] },
        { id: 'kyo-wa-okurete-sumimasen-item-hontoni', targetText: '本当に', baseText: { de: 'wirklich (hontō ni)', en: 'really (hontō ni)' }, acceptedAnswers: ['本当に', 'ほんとうに'] },
        { id: 'kyo-wa-okurete-sumimasen-item-okurete', targetText: '遅れて', baseText: { de: 'zu spät / verspätet (okurete)', en: 'late / delayed (okurete)' }, acceptedAnswers: ['遅れて', 'おくれて'] },
        { id: 'kyo-wa-okurete-sumimasen-item-machiawase', targetText: '待ち合わせ', baseText: { de: 'Verabredung / Treffpunkt (machiawase)', en: 'meeting arrangement (machiawase)' }, acceptedAnswers: ['待ち合わせ', 'まちあわせ'] },
      ],
      buildChips: ['本当に', '遅れて', 'すみません。', '早く', '明日 です。'],
      typeRecall: {
        before: '本当に ', answer: '遅れて', after: ' すみません。',
        acceptedAnswers: japaneseAccepted('遅れて', 'おくれて'),
        fallbackChoices: ['遅れて', '待って', '書いて', '見せて'],
      },
      speakTarget: {
        baseCue: { de: 'Es tut mir wirklich leid, dass ich zu spät bin.', en: 'I am really sorry for being late.' },
        targetPhrase: '本当に 遅れて すみません。',
        acceptedAnswers: ['本当に 遅れて すみません。', 'ほんとうに おくれて すみません。'],
        requiredTokens: ['本当に', '遅れて', 'すみません。'], optionalTokens: [],
      },
      sceneCaption: { de: 'Unter der Außenuhr steht die wartende Person mit zwei unberührten Cafébons, während du gerade den Platz erreichst.', en: 'Beneath the outdoor clock, the waiting person holds two unused cafe tickets as you reach the spot.' },
      trophyWord: {
        word: '遅れて', meaning: { de: 'zu spät / verspätet', en: 'late / delayed' }, example: '今日は 遅れて すみません。',
        whyThisWord: { de: '遅れて benennt den konkreten Anlass der Entschuldigung und macht deinen Respekt für die Wartezeit deutlich.', en: '遅れて names the concrete reason for the apology and shows respect for the other person’s waiting time.' },
      },
      placeholderCaption: { de: 'Cafévorplatz mit gut sichtbarer Uhr, wartender Person und zwei noch unbenutzten Bons.', en: 'Cafe forecourt with a visible clock, a waiting person, and two unused tickets.' },
      songMood: 'sincere gentle late arrival',
      visualNotes: 'Cafe meeting point, clock readable, acquaintance waiting calmly, traveler arriving with a clear need to apologize.',
    }),
  },
  {
    slug: 'namaewo-yoku-wasuremasu',
    title: { de: 'Namen oft vergessen', en: 'Often forgetting names' },
    situation: {
      de: 'Bei einem kleinen Sprachaustausch werden mehrere Namensschilder verteilt; du möchtest eine wiederkehrende Schwierigkeit ehrlich ansprechen.',
      en: 'At a small language exchange, several name tags are handed out and you want to admit a recurring difficulty honestly.',
    },
    pedagogicalGoal: '名前を als Objekt mit よく 忘れます zu einer einfachen Gewohnheitsaussage verbinden.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: '名前を よく 忘れます。', baseText: { de: 'Ich vergesse Namen oft.', en: 'I often forget names.' } },
      meaning: { de: 'Eine freundliche ehrliche Aussage über eine häufige Gedächtnislücke.', en: 'A friendly, honest statement about a frequent memory lapse.' },
      chunks: [
        { id: 'namaewo-yoku-wasuremasu-names', targetText: '名前を', baseText: { de: 'Namen', en: 'names' } },
        { id: 'namaewo-yoku-wasuremasu-often', targetText: 'よく', baseText: { de: 'oft', en: 'often' } },
        { id: 'namaewo-yoku-wasuremasu-forget', targetText: '忘れます。', baseText: { de: 'vergesse ich.', en: 'I forget.' } },
      ],
      lessonItems: [
        { id: 'namaewo-yoku-wasuremasu-item-namae', targetText: '名前', baseText: { de: 'Name (namae)', en: 'name (namae)' }, acceptedAnswers: ['名前', 'なまえ'] },
        { id: 'namaewo-yoku-wasuremasu-item-namaewo', targetText: '名前を', baseText: { de: 'Name (namae o; mit Objektpartikel)', en: 'name (namae o; with object particle)' }, acceptedAnswers: ['名前を', 'なまえを'] },
        { id: 'namaewo-yoku-wasuremasu-item-yoku', targetText: 'よく', baseText: { de: 'oft (yoku)', en: 'often (yoku)' }, acceptedAnswers: ['よく'] },
        { id: 'namaewo-yoku-wasuremasu-item-wasuremasu', targetText: '忘れます', baseText: { de: 'ich vergesse (wasuremasu)', en: 'I forget (wasuremasu)' }, acceptedAnswers: ['忘れます', 'わすれます'] },
      ],
      buildChips: ['名前を', 'よく', '忘れます。', '住所を', '覚えます。'],
      typeRecall: {
        before: '', answer: '名前を', after: ' よく 忘れます。',
        acceptedAnswers: japaneseAccepted('名前を', 'なまえを'),
        fallbackChoices: ['名前を', '予定を', '切符を', '番号を'],
      },
      speakTarget: {
        baseCue: { de: 'Ich vergesse Namen oft.', en: 'I often forget names.' },
        targetPhrase: '名前を よく 忘れます。',
        acceptedAnswers: ['名前を よく 忘れます。', 'なまえを よく わすれます。'],
        requiredTokens: ['名前を', 'よく', '忘れます。'], optionalTokens: [],
      },
      sceneCaption: { de: 'Auf dem Tisch liegen mehrere handgeschriebene Namensschilder, und eines wird dir gerade noch einmal gezeigt.', en: 'Several handwritten name tags lie on the table, and one is being shown to you again.' },
      trophyWord: {
        word: '忘れます', meaning: { de: 'ich vergesse', en: 'I forget' }, example: '名前を よく 忘れます。',
        whyThisWord: { de: '忘れます erlaubt eine einfache ehrliche Erklärung, wenn ein Name, eine Nummer oder ein kleiner Plan nicht hängen bleibt.', en: '忘れます gives you a simple honest explanation when a name, number, or small plan does not stick.' },
      },
      placeholderCaption: { de: 'Tisch eines Sprachaustauschs mit mehreren unterschiedlichen Namensschildern und offenen Notizkarten.', en: 'Language-exchange table with several distinct name tags and open note cards.' },
      songMood: 'light self-aware introduction',
      visualNotes: 'Friendly language exchange, multiple name tags in view, no embarrassment or comic exaggeration.',
    }),
  },
  {
    slug: 'onamaewa-nan-desuka',
    title: { de: 'Wie heißen Sie?', en: 'What is your name?' },
    situation: {
      de: 'Am Gemeinschaftstisch des Gästehauses setzt sich eine neue Person gegenüber, aber ihr Namensschild ist noch leer.',
      en: 'At the guesthouse communal table, a new person sits opposite you but their name tag is still blank.',
    },
    pedagogicalGoal: 'お名前は höflich zum Thema machen und mit 何 ですか nach dem Namen fragen.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: 'お名前は 何 ですか。', baseText: { de: 'Wie heißen Sie?', en: 'What is your name?' } },
      meaning: { de: 'Eine höfliche direkte Namensfrage bei einer ersten Begegnung.', en: 'A polite direct name question during a first meeting.' },
      chunks: [
        { id: 'onamaewa-nan-desuka-name', targetText: 'お名前は', baseText: { de: 'Ihr Name', en: 'your name' } },
        { id: 'onamaewa-nan-desuka-what', targetText: '何', baseText: { de: 'was', en: 'what' } },
        { id: 'onamaewa-nan-desuka-question', targetText: 'ですか。', baseText: { de: 'ist er?', en: 'is it?' } },
      ],
      lessonItems: [
        { id: 'onamaewa-nan-desuka-item-onamae', targetText: 'お名前', baseText: { de: 'Name, höflich (onamae)', en: 'name, politely (onamae)' }, acceptedAnswers: ['お名前', 'おなまえ'] },
        { id: 'onamaewa-nan-desuka-item-onamaewa', targetText: 'お名前は', baseText: { de: 'Ihr Name (onamae wa; mit Themenpartikel)', en: 'your name (onamae wa; with topic particle)' }, acceptedAnswers: ['お名前は', 'おなまえは'] },
        { id: 'onamaewa-nan-desuka-item-nan', targetText: '何', baseText: { de: 'was (nan)', en: 'what (nan)' }, acceptedAnswers: ['何', 'なん'] },
        { id: 'onamaewa-nan-desuka-item-myoji', targetText: '名字', baseText: { de: 'Familienname (myōji)', en: 'family name (myōji)' }, acceptedAnswers: ['名字', 'みょうじ'] },
      ],
      buildChips: ['お名前は', '何', 'ですか。', 'ご住所は', 'どこ ですか。'],
      typeRecall: {
        before: '', answer: 'お名前は', after: ' 何 ですか。',
        acceptedAnswers: japaneseAccepted('お名前は', 'おなまえは'),
        fallbackChoices: ['お名前は', 'ご住所は', 'お仕事は', '電話は'],
      },
      speakTarget: {
        baseCue: { de: 'Wie heißen Sie?', en: 'What is your name?' },
        targetPhrase: 'お名前は 何 ですか。',
        acceptedAnswers: ['お名前は 何 ですか。', 'おなまえは なん ですか。'],
        requiredTokens: ['お名前は', '何', 'ですか。'], optionalTokens: [],
      },
      sceneCaption: { de: 'Die neue Person sitzt am Gemeinschaftstisch vor einem leeren Namensschild und einem noch unbenutzten Stift.', en: 'The new person sits at the communal table with a blank name tag and an unused pen.' },
      trophyWord: {
        word: 'お名前', meaning: { de: 'Name, höflich', en: 'name, politely' }, example: 'お名前は 何 ですか。',
        whyThisWord: { de: 'お名前 ist die höfliche Form für den Namen einer anderen Person und passt zu einer respektvollen ersten Begegnung.', en: 'お名前 is the polite form for another person’s name and suits a respectful first meeting.' },
      },
      placeholderCaption: { de: 'Gemeinschaftstisch im Gästehaus mit leerem Namensschild, Stift und zwei Teetassen.', en: 'Guesthouse communal table with a blank name tag, pen, and two cups of tea.' },
      songMood: 'open friendly name exchange',
      visualNotes: 'Guesthouse common room, blank name badge prominent, two people just beginning an introduction.',
    }),
  },
  {
    slug: 'hajimemashite-yoroshiku-onegaishimasu',
    title: { de: 'Freut mich, Sie kennenzulernen', en: 'Nice to meet you' },
    situation: {
      de: 'Nach dem Austausch der Namen wendet sich die neue Person dir vollständig zu; der erste formelle Begrüßungsmoment ist noch offen.',
      en: 'After exchanging names, the new person turns fully toward you and the first formal greeting moment is still open.',
    },
    pedagogicalGoal: 'Die feste Erstbegegnungsformel はじめまして、 よろしく お願いします als zusammengehörige höfliche Einheit sprechen.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: 'はじめまして、 よろしく お願いします。', baseText: { de: 'Freut mich, Sie kennenzulernen.', en: 'Nice to meet you.' } },
      meaning: { de: 'Die klassische höfliche Formel, mit der eine neue Bekanntschaft beginnt.', en: 'The classic polite formula that begins a new acquaintance.' },
      chunks: [
        { id: 'hajimemashite-yoroshiku-onegaishimasu-first', targetText: 'はじめまして、', baseText: { de: 'bei unserer ersten Begegnung,', en: 'on meeting you for the first time,' } },
        { id: 'hajimemashite-yoroshiku-onegaishimasu-well', targetText: 'よろしく', baseText: { de: 'auf gute Zusammenarbeit', en: 'kindly / favorably' } },
        { id: 'hajimemashite-yoroshiku-onegaishimasu-request', targetText: 'お願いします。', baseText: { de: 'bitte.', en: 'please.' } },
      ],
      lessonItems: [
        { id: 'hajimemashite-yoroshiku-onegaishimasu-item-hajimemashite', targetText: 'はじめまして', baseText: { de: 'freut mich, Sie kennenzulernen (hajimemashite)', en: 'nice to meet you (hajimemashite)' }, acceptedAnswers: ['はじめまして'] },
        { id: 'hajimemashite-yoroshiku-onegaishimasu-item-yoroshiku', targetText: 'よろしく', baseText: { de: 'bitte freundlich / auf gute Beziehungen (yoroshiku)', en: 'kindly / with goodwill (yoroshiku)' }, acceptedAnswers: ['よろしく'] },
        { id: 'hajimemashite-yoroshiku-onegaishimasu-item-onegai', targetText: 'お願い', baseText: { de: 'Bitte / Wunsch (onegai)', en: 'request / favor (onegai)' }, acceptedAnswers: ['お願い', 'おねがい'] },
        { id: 'hajimemashite-yoroshiku-onegaishimasu-item-aisatsu', targetText: '挨拶', baseText: { de: 'Begrüßung (aisatsu)', en: 'greeting (aisatsu)' }, acceptedAnswers: ['挨拶', 'あいさつ'] },
      ],
      buildChips: ['はじめまして、', 'よろしく', 'お願いします。', 'こんにちは。', 'ありがとうございます。'],
      typeRecall: {
        before: 'はじめまして、 ', answer: 'よろしく', after: ' お願いします。',
        acceptedAnswers: japaneseAccepted('よろしく'),
        fallbackChoices: ['よろしく', 'どうぞ', '今日は', '少し'],
      },
      speakTarget: {
        baseCue: { de: 'Freut mich, Sie kennenzulernen.', en: 'Nice to meet you.' },
        targetPhrase: 'はじめまして、 よろしく お願いします。',
        acceptedAnswers: ['はじめまして、 よろしく お願いします。', 'はじめまして、 よろしく おねがいします。'],
        requiredTokens: ['はじめまして、', 'よろしく', 'お願いします。'], optionalTokens: [],
      },
      sceneCaption: { de: 'Zwischen zwei neuen Bekannten liegt nur das ausgefüllte Namensschild, während beide für die erste Begrüßung innehaben.', en: 'Only the completed name tag lies between two new acquaintances as both pause for the first greeting.' },
      trophyWord: {
        word: 'はじめまして', meaning: { de: 'freut mich, Sie kennenzulernen', en: 'nice to meet you' }, example: 'はじめまして、 よろしく お願いします。',
        whyThisWord: { de: 'はじめまして gehört ausschließlich an den Anfang einer neuen Bekanntschaft und signalisiert den Anlass sofort.', en: 'はじめまして belongs specifically at the start of a new acquaintance and signals the moment immediately.' },
      },
      placeholderCaption: { de: 'Ruhiger Gemeinschaftstisch mit ausgefülltem Namensschild und zwei Personen in einer respektvollen ersten Pause.', en: 'Quiet communal table with a completed name tag and two people in a respectful first pause.' },
      songMood: 'warm formal first meeting',
      visualNotes: 'Two new acquaintances at a shared table, gentle posture and eye contact, greeting not yet spoken.',
    }),
  },
  {
    slug: 'sumimasen-dochirakara-desuka',
    title: { de: 'Woher kommen Sie?', en: 'Where are you from?' },
    situation: {
      de: 'Beim Sprachaustausch zeigt die andere Person neugierig auf die Länderaufkleber an deinem Notizbuch; du möchtest dieselbe Frage zurückgeben.',
      en: 'At the language exchange, the other person points curiously at the country stickers on your notebook and you want to return the question.',
    },
    pedagogicalGoal: 'Mit どちらから höflich nach dem Herkunftsort fragen und die Frage durch すみません weich eröffnen.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: 'すみません、 どちらから ですか。', baseText: { de: 'Entschuldigung, woher kommen Sie?', en: 'Excuse me, where are you from?' } },
      meaning: { de: 'Eine höfliche Herkunftsfrage, ohne ein bestimmtes Land vorzugeben.', en: 'A polite origin question without suggesting a particular country.' },
      chunks: [
        { id: 'sumimasen-dochirakara-desuka-attention', targetText: 'すみません、', baseText: { de: 'Entschuldigung,', en: 'Excuse me,' } },
        { id: 'sumimasen-dochirakara-desuka-origin', targetText: 'どちらから', baseText: { de: 'woher', en: 'from where' } },
        { id: 'sumimasen-dochirakara-desuka-question', targetText: 'ですか。', baseText: { de: 'kommen Sie?', en: 'are you from?' } },
      ],
      lessonItems: [
        { id: 'sumimasen-dochirakara-desuka-item-sumimasen', targetText: 'すみません', baseText: { de: 'Entschuldigung (sumimasen)', en: 'excuse me (sumimasen)' }, acceptedAnswers: ['すみません'] },
        { id: 'sumimasen-dochirakara-desuka-item-dochira', targetText: 'どちら', baseText: { de: 'welche Richtung / wo, höflich (dochira)', en: 'which direction / where, politely (dochira)' }, acceptedAnswers: ['どちら'] },
        { id: 'sumimasen-dochirakara-desuka-item-dochirakara', targetText: 'どちらから', baseText: { de: 'woher (dochira kara; mit Herkunftspartikel)', en: 'from where (dochira kara; with origin particle)' }, acceptedAnswers: ['どちらから'] },
        { id: 'sumimasen-dochirakara-desuka-item-shusshin', targetText: '出身', baseText: { de: 'Herkunft (shusshin)', en: 'place of origin (shusshin)' }, acceptedAnswers: ['出身', 'しゅっしん'] },
      ],
      buildChips: ['すみません、', 'どちらから', 'ですか。', 'どこまで', 'ドイツ人 です。'],
      typeRecall: {
        before: 'すみません、 ', answer: 'どちらから', after: ' ですか。',
        acceptedAnswers: japaneseAccepted('どちらから'),
        fallbackChoices: ['どちらから', '東京から', '大阪から', '京都から'],
      },
      speakTarget: {
        baseCue: { de: 'Entschuldigung, woher kommen Sie?', en: 'Excuse me, where are you from?' },
        targetPhrase: 'すみません、 どちらから ですか。',
        acceptedAnswers: ['すみません、 どちらから ですか。'],
        requiredTokens: ['すみません、', 'どちらから', 'ですか。'], optionalTokens: [],
      },
      sceneCaption: { de: 'Ein Finger ruht neben mehreren Länderaufklebern auf deinem Notizbuch, während das Gespräch für eine Gegenfrage offenbleibt.', en: 'A finger rests beside several country stickers on your notebook while the conversation leaves room for a return question.' },
      trophyWord: {
        word: 'どちら', meaning: { de: 'welche Richtung / wo, höflich', en: 'which direction / where, politely' }, example: 'どちらから ですか。',
        whyThisWord: { de: 'どちら klingt höflicher als どこ und passt deshalb gut zu einer persönlichen Frage bei einer neuen Bekanntschaft.', en: 'どちら sounds more polite than どこ and therefore suits a personal question with a new acquaintance.' },
      },
      placeholderCaption: { de: 'Notizbuch mit mehreren Länderaufklebern zwischen zwei Personen beim Sprachaustausch.', en: 'Notebook with several country stickers between two people at a language exchange.' },
      songMood: 'curious respectful origin question',
      visualNotes: 'Language-exchange table, country stickers as context, open body language and no country emphasized as the answer.',
    }),
  },
  {
    slug: 'watashiwa-doitsujin-desu',
    title: { de: 'Ich komme aus Deutschland', en: 'I am from Germany' },
    situation: {
      de: 'Deine neue Bekanntschaft blickt vom Länderaufkleber zu dir und wartet auf eine kurze Vorstellung deiner Herkunft.',
      en: 'Your new acquaintance looks from the country sticker to you and waits for a short statement of your origin.',
    },
    pedagogicalGoal: 'Mit 私は das eigene Thema setzen und ドイツ人 です als gegenwartsbezogene Herkunftsaussage verwenden.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: '私は ドイツ人 です。', baseText: { de: 'Ich komme aus Deutschland.', en: 'I am German.' } },
      meaning: { de: 'Eine einfache Herkunftsaussage ohne verbotene Vergangenheitsform.', en: 'A simple origin statement without using a banned past form.' },
      chunks: [
        { id: 'watashiwa-doitsujin-desu-self', targetText: '私は', baseText: { de: 'ich', en: 'I' } },
        { id: 'watashiwa-doitsujin-desu-nationality', targetText: 'ドイツ人', baseText: { de: 'deutsche Person', en: 'German person' } },
        { id: 'watashiwa-doitsujin-desu-polite', targetText: 'です。', baseText: { de: 'bin ich.', en: 'I am.' } },
      ],
      lessonItems: [
        { id: 'watashiwa-doitsujin-desu-item-watashi', targetText: '私', baseText: { de: 'ich (watashi)', en: 'I / me (watashi)' }, acceptedAnswers: ['私', 'わたし'] },
        { id: 'watashiwa-doitsujin-desu-item-watashiwa', targetText: '私は', baseText: { de: 'ich (watashi wa; mit Themenpartikel)', en: 'I (watashi wa; with topic particle)' }, acceptedAnswers: ['私は', 'わたしは'] },
        { id: 'watashiwa-doitsujin-desu-item-doitsu', targetText: 'ドイツ', baseText: { de: 'Deutschland (Doitsu)', en: 'Germany (Doitsu)' }, acceptedAnswers: ['ドイツ'] },
        { id: 'watashiwa-doitsujin-desu-item-doitsujin', targetText: 'ドイツ人', baseText: { de: 'deutsche Person (Doitsu-jin)', en: 'German person (Doitsu-jin)' }, acceptedAnswers: ['ドイツ人', 'ドイツじん'] },
      ],
      buildChips: ['私は', 'ドイツ人', 'です。', '日本人', 'ドイツから'],
      typeRecall: {
        before: '私は ', answer: 'ドイツ人', after: ' です。',
        acceptedAnswers: japaneseAccepted('ドイツ人', 'ドイツじん'),
        fallbackChoices: ['ドイツ人', '日本人', 'アメリカ人', 'フランス人'],
      },
      speakTarget: {
        baseCue: { de: 'Ich komme aus Deutschland.', en: 'I am German.' },
        targetPhrase: '私は ドイツ人 です。',
        acceptedAnswers: ['私は ドイツ人 です。', 'わたしは ドイツじん です。'],
        requiredTokens: ['私は', 'ドイツ人', 'です。'], optionalTokens: [],
      },
      sceneCaption: { de: 'Der Deutschland-Aufkleber auf deinem Notizbuch ist sichtbar, und die neue Bekanntschaft wartet mit fragendem Blick.', en: 'The Germany sticker on your notebook is visible while the new acquaintance waits with a questioning look.' },
      trophyWord: {
        word: 'ドイツ人', meaning: { de: 'deutsche Person', en: 'German person' }, example: '私は ドイツ人 です。',
        whyThisWord: { de: 'ドイツ人 nennt die Herkunft als gegenwärtige Identität und vermeidet dafür jede Erzählung über eine vergangene Anreise.', en: 'ドイツ人 states origin as a present identity and avoids any past-tense story about arriving.' },
      },
      placeholderCaption: { de: 'Sprachaustausch mit sichtbarem Deutschland-Aufkleber und einem offenen Moment für die eigene Vorstellung.', en: 'Language exchange with a visible Germany sticker and an open moment for self-introduction.' },
      songMood: 'clear friendly self-introduction',
      visualNotes: 'Notebook sticker establishes Germany, learner ready to answer, companion attentive without speaking.',
    }),
  },
  {
    slug: 'konban-jikanga-arimasuka',
    title: { de: 'Heute Abend Zeit?', en: 'Free tonight?' },
    situation: {
      de: 'Nach dem Sprachaustausch zeigt deine Bekanntschaft auf einen Veranstaltungshinweis für den Abend; ihr Kalender liegt noch geschlossen daneben.',
      en: 'After the language exchange, your acquaintance points to an event notice for the evening while their calendar remains closed beside it.',
    },
    pedagogicalGoal: '今晩 als Zeitrahmen setzen und mit 時間が ありますか höflich nach verfügbarer Zeit fragen.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: '今晩、 時間が ありますか。', baseText: { de: 'Haben Sie heute Abend Zeit?', en: 'Do you have time tonight?' } },
      meaning: { de: 'Eine einfache höfliche Verfügbarkeitsfrage für denselben Abend.', en: 'A simple polite availability question for the same evening.' },
      chunks: [
        { id: 'konban-jikanga-arimasuka-tonight', targetText: '今晩、', baseText: { de: 'heute Abend,', en: 'tonight,' } },
        { id: 'konban-jikanga-arimasuka-time', targetText: '時間が', baseText: { de: 'Zeit', en: 'time' } },
        { id: 'konban-jikanga-arimasuka-have', targetText: 'ありますか。', baseText: { de: 'haben Sie?', en: 'do you have?' } },
      ],
      lessonItems: [
        { id: 'konban-jikanga-arimasuka-item-konban', targetText: '今晩', baseText: { de: 'heute Abend (konban)', en: 'tonight (konban)' }, acceptedAnswers: ['今晩', 'こんばん'] },
        { id: 'konban-jikanga-arimasuka-item-jikan', targetText: '時間', baseText: { de: 'Zeit (jikan)', en: 'time (jikan)' }, acceptedAnswers: ['時間', 'じかん'] },
        { id: 'konban-jikanga-arimasuka-item-jikanga', targetText: '時間が', baseText: { de: 'Zeit (jikan ga; mit Subjektpartikel)', en: 'time (jikan ga; with subject particle)' }, acceptedAnswers: ['時間が', 'じかんが'] },
        { id: 'konban-jikanga-arimasuka-item-yoru', targetText: '夜', baseText: { de: 'Abend / Nacht (yoru)', en: 'evening / night (yoru)' }, acceptedAnswers: ['夜', 'よる'] },
      ],
      buildChips: ['今晩、', '時間が', 'ありますか。', '予約が', '大丈夫 ですか。'],
      typeRecall: {
        before: '今晩、 ', answer: '時間が', after: ' ありますか。',
        acceptedAnswers: japaneseAccepted('時間が', 'じかんが'),
        fallbackChoices: ['時間が', '予定が', '仕事が', '予約が'],
      },
      speakTarget: {
        baseCue: { de: 'Haben Sie heute Abend Zeit?', en: 'Do you have time tonight?' },
        targetPhrase: '今晩、 時間が ありますか。',
        acceptedAnswers: ['今晩、 時間が ありますか。', 'こんばん、 じかんが ありますか。'],
        requiredTokens: ['今晩、', '時間が', 'ありますか。'], optionalTokens: [],
      },
      sceneCaption: { de: 'Ein kleiner Veranstaltungshinweis für den Abend liegt neben einem geschlossenen Kalender und zwei noch offenen Teetassen.', en: 'A small evening event notice lies beside a closed calendar and two unfinished cups of tea.' },
      trophyWord: {
        word: '今晩', meaning: { de: 'heute Abend', en: 'tonight' }, example: '今晩、 時間が ありますか。',
        whyThisWord: { de: '今晩 grenzt einen Plan klar auf den heutigen Abend ein, ohne dass du eine genaue Uhrzeit nennen musst.', en: '今晩 narrows a plan to this evening without requiring you to name an exact time.' },
      },
      placeholderCaption: { de: 'Abendlicher Veranstaltungshinweis neben geschlossenem Kalender auf einem Gemeinschaftstisch.', en: 'Evening event notice beside a closed calendar on a communal table.' },
      songMood: 'hopeful low-pressure invitation',
      visualNotes: 'Language-exchange table winding down, evening flyer and closed planner suggest a possible plan without resolving availability.',
    }),
  },
  {
    slug: 'konban-kafede-aimasho',
    title: { de: 'Treffen wir uns im Café', en: 'Let us meet at the cafe' },
    situation: {
      de: 'Auf dem Handy sind für heute Abend mehrere Treffpunkte markiert; das Café liegt für euch beide günstig.',
      en: 'Several meeting places are marked on the phone for tonight, and the cafe is convenient for both of you.',
    },
    pedagogicalGoal: 'カフェで als Treffpunkt mit der erlaubten Überlebensform 会いましょう zu einem gemeinsamen Plan verbinden.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: '今晩、 カフェで 会いましょう。', baseText: { de: 'Treffen wir uns heute Abend im Café.', en: 'Let us meet at the cafe tonight.' } },
      meaning: { de: 'Ein kurzer gemeinsamer Vorschlag mit Zeit und Treffpunkt.', en: 'A short shared proposal with both time and meeting place.' },
      chunks: [
        { id: 'konban-kafede-aimasho-tonight', targetText: '今晩、', baseText: { de: 'heute Abend,', en: 'tonight,' } },
        { id: 'konban-kafede-aimasho-cafe', targetText: 'カフェで', baseText: { de: 'im Café', en: 'at the cafe' } },
        { id: 'konban-kafede-aimasho-meet', targetText: '会いましょう。', baseText: { de: 'treffen wir uns.', en: 'let us meet.' } },
      ],
      lessonItems: [
        { id: 'konban-kafede-aimasho-item-konban', targetText: '今晩', baseText: { de: 'heute Abend (konban)', en: 'tonight (konban)' }, acceptedAnswers: ['今晩', 'こんばん'] },
        { id: 'konban-kafede-aimasho-item-kafe', targetText: 'カフェ', baseText: { de: 'Café (kafe)', en: 'cafe (kafe)' }, acceptedAnswers: ['カフェ'] },
        { id: 'konban-kafede-aimasho-item-kafede', targetText: 'カフェで', baseText: { de: 'im Café (kafe de; mit Ortspartikel)', en: 'at the cafe (kafe de; with location particle)' }, acceptedAnswers: ['カフェで'] },
        { id: 'konban-kafede-aimasho-item-aimasho', targetText: '会いましょう', baseText: { de: 'treffen wir uns (aimashō)', en: 'let us meet (aimashō)' }, acceptedAnswers: ['会いましょう', 'あいましょう'] },
      ],
      buildChips: ['今晩、', 'カフェで', '会いましょう。', 'ホテルで', '待ちます。'],
      typeRecall: {
        before: '今晩、 ', answer: 'カフェで', after: ' 会いましょう。',
        acceptedAnswers: japaneseAccepted('カフェで'),
        fallbackChoices: ['カフェで', '公園で', 'ホテルで', '改札で'],
      },
      speakTarget: {
        baseCue: { de: 'Treffen wir uns heute Abend im Café.', en: 'Let us meet at the cafe tonight.' },
        targetPhrase: '今晩、 カフェで 会いましょう。',
        acceptedAnswers: ['今晩、 カフェで 会いましょう。', 'こんばん、 カフェで あいましょう。'],
        requiredTokens: ['今晩、', 'カフェで', '会いましょう。'], optionalTokens: [],
      },
      sceneCaption: { de: 'Die Kartenansicht zeigt drei mögliche Treffpunkte, während das Café genau zwischen euren beiden Routen liegt.', en: 'The map view shows three possible meeting points, with the cafe positioned between your two routes.' },
      trophyWord: {
        word: 'カフェ', meaning: { de: 'Café', en: 'cafe' }, example: 'カフェで 会いましょう。',
        whyThisWord: { de: 'カフェ ist ein leicht erkennbarer, neutraler Treffpunkt und funktioniert gut für einen unkomplizierten ersten Plan.', en: 'カフェ is an easy-to-recognize neutral meeting place and works well for a simple first plan.' },
      },
      placeholderCaption: { de: 'Handykarte mit drei Treffpunkten und einem zentral gelegenen Café zwischen zwei Routen.', en: 'Phone map with three meeting points and a centrally located cafe between two routes.' },
      songMood: 'bright easy evening plan',
      visualNotes: 'Map-based planning moment, cafe pin central but not yet selected by the interface, both routes visible.',
    }),
  },
  {
    slug: 'tabun-ashita-desu',
    title: { de: 'Vielleicht morgen', en: 'Maybe tomorrow' },
    situation: {
      de: 'Der heutige Abend wird knapp; auf dem Tisch liegen ein Kalender und ein Flyer, aber der nächste Termin ist noch nicht festgelegt.',
      en: 'Tonight is becoming difficult; a calendar and flyer lie on the table, but the next time has not been fixed.',
    },
    pedagogicalGoal: 'Mit たぶん Unsicherheit markieren und 明日 です als sehr einfachen Zeitvorschlag geben.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: 'たぶん 明日 です。', baseText: { de: 'Vielleicht morgen.', en: 'Maybe tomorrow.' } },
      meaning: { de: 'Ein vorsichtiger Zeitvorschlag, wenn der Plan noch nicht sicher ist.', en: 'A tentative time suggestion when the plan is not certain yet.' },
      chunks: [
        { id: 'tabun-ashita-desu-maybe', targetText: 'たぶん', baseText: { de: 'vielleicht', en: 'maybe' } },
        { id: 'tabun-ashita-desu-tomorrow', targetText: '明日', baseText: { de: 'morgen', en: 'tomorrow' } },
        { id: 'tabun-ashita-desu-polite', targetText: 'です。', baseText: { de: 'ist es.', en: 'it is.' } },
      ],
      lessonItems: [
        { id: 'tabun-ashita-desu-item-tabun', targetText: 'たぶん', baseText: { de: 'vielleicht / wahrscheinlich (tabun)', en: 'maybe / probably (tabun)' }, acceptedAnswers: ['たぶん'] },
        { id: 'tabun-ashita-desu-item-ashita', targetText: '明日', baseText: { de: 'morgen (ashita)', en: 'tomorrow (ashita)' }, acceptedAnswers: ['明日', 'あした'] },
        { id: 'tabun-ashita-desu-item-kyo', targetText: '今日', baseText: { de: 'heute (kyō)', en: 'today (kyō)' }, acceptedAnswers: ['今日', 'きょう'] },
        { id: 'tabun-ashita-desu-item-yotei', targetText: '予定', baseText: { de: 'Plan / Termin (yotei)', en: 'plan / schedule (yotei)' }, acceptedAnswers: ['予定', 'よてい'] },
      ],
      buildChips: ['たぶん', '明日', 'です。', '今日', '大丈夫 です。'],
      typeRecall: {
        before: 'たぶん ', answer: '明日', after: ' です。',
        acceptedAnswers: japaneseAccepted('明日', 'あした'),
        fallbackChoices: ['明日', '今日', '今晩', '来週'],
      },
      speakTarget: {
        baseCue: { de: 'Vielleicht morgen.', en: 'Maybe tomorrow.' },
        targetPhrase: 'たぶん 明日 です。',
        acceptedAnswers: ['たぶん 明日 です。', 'たぶん あした です。'],
        requiredTokens: ['たぶん', '明日', 'です。'], optionalTokens: [],
      },
      sceneCaption: { de: 'Zwischen Flyer und Kalender bleibt der heutige Abend sichtbar überfüllt, während der folgende Tag noch frei aussieht.', en: 'Between the flyer and calendar, tonight looks visibly crowded while the following day still appears open.' },
      trophyWord: {
        word: 'たぶん', meaning: { de: 'vielleicht / wahrscheinlich', en: 'maybe / probably' }, example: 'たぶん 明日 です。',
        whyThisWord: { de: 'たぶん hält einen Vorschlag bewusst unverbindlich, wenn du den Termin noch prüfen musst.', en: 'たぶん deliberately keeps a suggestion tentative when you still need to check the timing.' },
      },
      placeholderCaption: { de: 'Offener Kalender mit dichtem heutigen Abend und freierem Folgetag neben einem Veranstaltungsflyer.', en: 'Open calendar with a crowded evening and a freer following day beside an event flyer.' },
      songMood: 'soft tentative rescheduling',
      visualNotes: 'Calendar close-up, tonight crowded and tomorrow open, social plan still unresolved.',
    }),
  },
  {
    slug: 'ashita-mata-aimasho',
    title: { de: 'Bis morgen', en: 'See you tomorrow' },
    situation: {
      de: 'Am Ausgang des Gästehauses sind eure morgigen Treffdaten im Kalender markiert; nun trennt ihr euch für den Abend.',
      en: 'At the guesthouse exit, tomorrow’s meeting is marked in the calendar and you are about to part for the evening.',
    },
    pedagogicalGoal: '明日 als festen nächsten Zeitpunkt setzen und mit der zweiten erlaubten Form 会いましょう einen warmen Abschied bilden.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: '明日、 また 会いましょう。', baseText: { de: 'Sehen wir uns morgen wieder.', en: 'Let us meet again tomorrow.' } },
      meaning: { de: 'Ein freundlicher Abschied mit bereits erkennbarem nächsten Treffen.', en: 'A friendly farewell with the next meeting already in view.' },
      chunks: [
        { id: 'ashita-mata-aimasho-tomorrow', targetText: '明日、', baseText: { de: 'morgen,', en: 'tomorrow,' } },
        { id: 'ashita-mata-aimasho-again', targetText: 'また', baseText: { de: 'wieder', en: 'again' } },
        { id: 'ashita-mata-aimasho-meet', targetText: '会いましょう。', baseText: { de: 'sehen wir uns.', en: 'let us meet.' } },
      ],
      lessonItems: [
        { id: 'ashita-mata-aimasho-item-ashita', targetText: '明日', baseText: { de: 'morgen (ashita)', en: 'tomorrow (ashita)' }, acceptedAnswers: ['明日', 'あした'] },
        { id: 'ashita-mata-aimasho-item-mata', targetText: 'また', baseText: { de: 'wieder / bis dann (mata)', en: 'again / see you (mata)' }, acceptedAnswers: ['また'] },
        { id: 'ashita-mata-aimasho-item-aimasho', targetText: '会いましょう', baseText: { de: 'treffen wir uns (aimashō)', en: 'let us meet (aimashō)' }, acceptedAnswers: ['会いましょう', 'あいましょう'] },
        { id: 'ashita-mata-aimasho-item-jikan', targetText: '時間', baseText: { de: 'Zeit (jikan)', en: 'time (jikan)' }, acceptedAnswers: ['時間', 'じかん'] },
      ],
      buildChips: ['明日、', 'また', '会いましょう。', '今晩、', 'お願いします。'],
      typeRecall: {
        before: '', answer: '明日', after: '、 また 会いましょう。',
        acceptedAnswers: japaneseAccepted('明日', 'あした'),
        fallbackChoices: ['明日', '来月', '土曜日', '日曜日'],
      },
      speakTarget: {
        baseCue: { de: 'Sehen wir uns morgen wieder.', en: 'Let us meet again tomorrow.' },
        targetPhrase: '明日、 また 会いましょう。',
        acceptedAnswers: ['明日、 また 会いましょう。', 'あした、 また あいましょう。'],
        requiredTokens: ['明日、', 'また', '会いましょう。'], optionalTokens: [],
      },
      sceneCaption: { de: 'An der Tür zeigt der Kalender eine markierte Zeile für den nächsten Tag, während beide bereits ihre Taschen aufnehmen.', en: 'At the door, the calendar shows a marked line for the next day as both people pick up their bags.' },
      trophyWord: {
        word: '明日', meaning: { de: 'morgen', en: 'tomorrow' }, example: '明日、 また 会いましょう。',
        whyThisWord: { de: '明日 macht aus einem offenen Abschied einen konkreten nächsten Kontakt, ohne eine Uhrzeit wiederholen zu müssen.', en: '明日 turns an open farewell into a concrete next contact without repeating an exact time.' },
      },
      placeholderCaption: { de: 'Gästehaustür mit markiertem Kalender für den nächsten Tag und zwei bereitgenommenen Taschen.', en: 'Guesthouse doorway with tomorrow marked on a calendar and two bags being picked up.' },
      songMood: 'warm tomorrow farewell',
      visualNotes: 'Guesthouse exit, next-day calendar mark visible, both acquaintances preparing to leave with a clear future meeting.',
    }),
  },
]

export const JAPANESE_A1_PRACTICAL_5_LESSONS: GuidedLessonDefinition[] = makeJapanesePracticalLessons(
  GUIDED_TODAY_PATH_JAPANESE_FIVE_METADATA,
  japaneseA1Practical5Inputs,
  { de: 'Du hast Japanisch A1 Praxis 5 abgeschlossen.', en: 'You have completed Japanese A1 Practical 5.' },
)

export const GUIDED_TODAY_PATH_JAPANESE_SIX_METADATA: GuidedPathMetadata = {
  id: 'japanese-a1-practical-6',
  title: 'Japanese A1 Practical 6',
  shortTitle: 'A1 Practical 6',
  subtitle: { de: 'Gesundheit, Apotheke und einfache Bedürfnisse', en: 'Health, pharmacy, and simple needs' },
  level: 'A1',
  baseLanguage: 'German',
  targetLanguage: 'Japanese',
  estimatedMinutes: 5,
}

const japaneseA1Practical6Inputs: JapaneseLessonInput[] = [
  {
    slug: 'kibunga-warui-desu',
    title: { de: 'Mir ist nicht gut', en: 'I feel sick' },
    situation: {
      de: 'In der Hotellobby musst du dich plötzlich setzen; die Person am Empfang bemerkt deine blasse Miene und wartet auf eine Erklärung.',
      en: 'In the hotel lobby, you suddenly need to sit down; the receptionist notices that you look pale and waits for an explanation.',
    },
    pedagogicalGoal: '気分が als momentanes Befinden mit 悪い です zu einer kurzen höflichen Gesundheitsmeldung verbinden.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: '気分が 悪い です。', baseText: { de: 'Mir ist nicht gut.', en: 'I feel sick.' } },
      meaning: { de: 'Eine allgemeine Meldung, dass dein aktuelles körperliches Befinden schlecht ist.', en: 'A general statement that you are physically feeling unwell right now.' },
      chunks: [
        { id: 'kibunga-warui-desu-condition', targetText: '気分が', baseText: { de: 'mein Befinden', en: 'my condition' } },
        { id: 'kibunga-warui-desu-bad', targetText: '悪い', baseText: { de: 'schlecht', en: 'bad' } },
        { id: 'kibunga-warui-desu-polite', targetText: 'です。', baseText: { de: 'ist.', en: 'is.' } },
      ],
      lessonItems: [
        { id: 'kibunga-warui-desu-item-kibun', targetText: '気分', baseText: { de: 'Befinden / Gefühl (kibun)', en: 'condition / feeling (kibun)' }, acceptedAnswers: ['気分', 'きぶん'] },
        { id: 'kibunga-warui-desu-item-kibunga', targetText: '気分が', baseText: { de: 'Befinden (kibun ga; mit Subjektpartikel)', en: 'condition (kibun ga; with subject particle)' }, acceptedAnswers: ['気分が', 'きぶんが'] },
        { id: 'kibunga-warui-desu-item-warui', targetText: '悪い', baseText: { de: 'schlecht (warui)', en: 'bad (warui)' }, acceptedAnswers: ['悪い', 'わるい'] },
        { id: 'kibunga-warui-desu-item-kyukei', targetText: '休憩', baseText: { de: 'Pause / Erholung (kyūkei)', en: 'break / rest (kyūkei)' }, acceptedAnswers: ['休憩', 'きゅうけい'] },
      ],
      buildChips: ['気分が', '悪い', 'です。', '天気が', '元気 です。'],
      typeRecall: {
        before: '', answer: '気分が', after: ' 悪い です。',
        acceptedAnswers: japaneseAccepted('気分が', 'きぶんが'),
        fallbackChoices: ['気分が', '頭が', 'お腹が', 'のどが'],
      },
      speakTarget: {
        baseCue: { de: 'Mir ist nicht gut.', en: 'I feel sick.' },
        targetPhrase: '気分が 悪い です。',
        acceptedAnswers: ['気分が 悪い です。', 'きぶんが わるい です。'],
        requiredTokens: ['気分が', '悪い', 'です。'], optionalTokens: [],
      },
      sceneCaption: { de: 'Neben dem Lobbysessel steht dein Gepäck, während die Empfangsperson deinen plötzlichen Halt aufmerksam bemerkt.', en: 'Your luggage stands beside the lobby chair while the receptionist notices your sudden need to stop.' },
      trophyWord: {
        word: '気分', meaning: { de: 'Befinden / Gefühl', en: 'condition / feeling' }, example: '気分が 悪い です。',
        whyThisWord: { de: '気分 beschreibt das allgemeine momentane Befinden und ist nützlich, wenn du noch kein einzelnes Symptom benennen kannst.', en: '気分 describes your general current condition and is useful when you cannot yet name a specific symptom.' },
      },
      placeholderCaption: { de: 'Ruhige Hotellobby mit Sessel, abgestelltem Gepäck und aufmerksamem Empfangstresen.', en: 'Quiet hotel lobby with a chair, set-down luggage, and an attentive reception desk.' },
      songMood: 'calm serious health signal',
      visualNotes: 'Hotel lobby, traveler seated unexpectedly, receptionist attentive, concern without medical drama.',
    }),
  },
  {
    slug: 'chikakuni-yakkyokuwa-arimasuka',
    title: { de: 'Eine Apotheke in der Nähe', en: 'A pharmacy nearby' },
    situation: {
      de: 'Vor dem Hotel zeigt die Straßenkarte mehrere Geschäfte, aber kein Apothekensymbol ist eindeutig zu erkennen.',
      en: 'Outside the hotel, the street map shows several shops but no pharmacy symbol is easy to identify.',
    },
    pedagogicalGoal: '近くに als Suchbereich setzen und mit 薬局は ありますか nach einer vorhandenen Apotheke fragen.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: '近くに 薬局は ありますか。', baseText: { de: 'Gibt es in der Nähe eine Apotheke?', en: 'Is there a pharmacy nearby?' } },
      meaning: { de: 'Eine praktische Ortsfrage nach einer Apotheke im nahen Umfeld.', en: 'A practical location question about a pharmacy in the nearby area.' },
      chunks: [
        { id: 'chikakuni-yakkyokuwa-arimasuka-nearby', targetText: '近くに', baseText: { de: 'in der Nähe', en: 'nearby' } },
        { id: 'chikakuni-yakkyokuwa-arimasuka-pharmacy', targetText: '薬局は', baseText: { de: 'eine Apotheke', en: 'a pharmacy' } },
        { id: 'chikakuni-yakkyokuwa-arimasuka-exists', targetText: 'ありますか。', baseText: { de: 'gibt es eine?', en: 'is there one?' } },
      ],
      lessonItems: [
        { id: 'chikakuni-yakkyokuwa-arimasuka-item-chikaku', targetText: '近く', baseText: { de: 'Nähe (chikaku)', en: 'nearby area (chikaku)' }, acceptedAnswers: ['近く', 'ちかく'] },
        { id: 'chikakuni-yakkyokuwa-arimasuka-item-chikakuni', targetText: '近くに', baseText: { de: 'in der Nähe (chikaku ni; mit Ortspartikel)', en: 'nearby (chikaku ni; with location particle)' }, acceptedAnswers: ['近くに', 'ちかくに'] },
        { id: 'chikakuni-yakkyokuwa-arimasuka-item-yakkyoku', targetText: '薬局', baseText: { de: 'Apotheke (yakkyoku)', en: 'pharmacy (yakkyoku)' }, acceptedAnswers: ['薬局', 'やっきょく'] },
        { id: 'chikakuni-yakkyokuwa-arimasuka-item-yakkyokuwa', targetText: '薬局は', baseText: { de: 'Apotheke (yakkyoku wa; mit Themenpartikel)', en: 'pharmacy (yakkyoku wa; with topic particle)' }, acceptedAnswers: ['薬局は', 'やっきょくは'] },
      ],
      buildChips: ['近くに', '薬局は', 'ありますか。', '病院は', '近い ですか。'],
      typeRecall: {
        before: '近くに ', answer: '薬局は', after: ' ありますか。',
        acceptedAnswers: japaneseAccepted('薬局は', 'やっきょくは'),
        fallbackChoices: ['薬局は', '病院は', 'ホテルは', 'コンビニは'],
      },
      speakTarget: {
        baseCue: { de: 'Gibt es in der Nähe eine Apotheke?', en: 'Is there a pharmacy nearby?' },
        targetPhrase: '近くに 薬局は ありますか。',
        acceptedAnswers: ['近くに 薬局は ありますか。', 'ちかくに やっきょくは ありますか。'],
        requiredTokens: ['近くに', '薬局は', 'ありますか。'], optionalTokens: [],
      },
      sceneCaption: { de: 'Auf der Straßenkarte drängen sich mehrere Ladensymbole, während das gesuchte Gesundheitssymbol nirgends klar hervorsticht.', en: 'Several shop symbols crowd the street map while the needed health symbol does not stand out clearly.' },
      trophyWord: {
        word: '薬局', meaning: { de: 'Apotheke', en: 'pharmacy' }, example: '近くに 薬局は ありますか。',
        whyThisWord: { de: '薬局 bezeichnet die Apotheke und grenzt deine Suche von einem Krankenhaus oder gewöhnlichen Laden ab.', en: '薬局 means pharmacy and distinguishes your search from a hospital or an ordinary shop.' },
      },
      placeholderCaption: { de: 'Dichte japanische Straßenkarte mit vielen Ladensymbolen und einem schwer erkennbaren Gesundheitsziel.', en: 'Dense Japanese street map with many shop symbols and a hard-to-identify health destination.' },
      songMood: 'focused nearby help search',
      visualNotes: 'Street map outside hotel, many retail pins, pharmacy not visually resolved so asking remains necessary.',
    }),
  },
  {
    slug: 'kusuriga-hoshii-desu',
    title: { de: 'Ich brauche Medizin', en: 'I need medicine' },
    situation: {
      de: 'In der Apotheke steht die Mitarbeiterin vor mehreren Regalen und wartet darauf, welche Art von Hilfe du suchst.',
      en: 'In the pharmacy, the staff member stands before several shelves and waits to learn what kind of help you need.',
    },
    pedagogicalGoal: '薬が mit ほしい です als höflichen einfachen Wunsch nach Medizin ausdrücken.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: '薬が ほしい です。', baseText: { de: 'Ich brauche Medizin.', en: 'I want medicine.' } },
      meaning: { de: 'Eine allgemeine Bedarfsangabe, bevor du dein Symptom genauer zeigst.', en: 'A general statement of need before you identify the symptom more precisely.' },
      chunks: [
        { id: 'kusuriga-hoshii-desu-medicine', targetText: '薬が', baseText: { de: 'Medizin', en: 'medicine' } },
        { id: 'kusuriga-hoshii-desu-want', targetText: 'ほしい です。', baseText: { de: 'möchte ich.', en: 'I want.' } },
      ],
      lessonItems: [
        { id: 'kusuriga-hoshii-desu-item-kusuri', targetText: '薬', baseText: { de: 'Medizin / Medikament (kusuri)', en: 'medicine (kusuri)' }, acceptedAnswers: ['薬', 'くすり'] },
        { id: 'kusuriga-hoshii-desu-item-kusuriga', targetText: '薬が', baseText: { de: 'Medizin (kusuri ga; mit Subjektpartikel)', en: 'medicine (kusuri ga; with subject particle)' }, acceptedAnswers: ['薬が', 'くすりが'] },
        { id: 'kusuriga-hoshii-desu-item-hoshii', targetText: 'ほしい', baseText: { de: 'gewünscht / möchte (hoshii)', en: 'wanted / want (hoshii)' }, acceptedAnswers: ['ほしい'] },
        { id: 'kusuriga-hoshii-desu-item-kaze', targetText: '風邪', baseText: { de: 'Erkältung (kaze)', en: 'cold (kaze)' }, acceptedAnswers: ['風邪', 'かぜ'] },
      ],
      buildChips: ['薬が', 'ほしい です。', '水が', 'あります。'],
      typeRecall: {
        before: '', answer: '薬が', after: ' ほしい です。',
        acceptedAnswers: japaneseAccepted('薬が', 'くすりが'),
        fallbackChoices: ['薬が', '水が', '時間が', '部屋が'],
      },
      speakTarget: {
        baseCue: { de: 'Ich brauche Medizin.', en: 'I want medicine.' },
        targetPhrase: '薬が ほしい です。',
        acceptedAnswers: ['薬が ほしい です。', 'くすりが ほしい です。'],
        requiredTokens: ['薬が', 'ほしい', 'です。'], optionalTokens: [],
      },
      sceneCaption: { de: 'Hinter der Beratungstheke stehen mehrere unterschiedlich markierte Medikamentenregale, während die Mitarbeiterin aufmerksam wartet.', en: 'Several differently labeled medicine shelves stand behind the consultation counter while the staff member waits attentively.' },
      trophyWord: {
        word: '薬', meaning: { de: 'Medizin / Medikament', en: 'medicine' }, example: '薬が ほしい です。',
        whyThisWord: { de: '薬 ist der grundlegende Produktanker in Apotheke und Drogerie, bevor ein bestimmtes Mittel ausgewählt wird.', en: '薬 is the basic product anchor in a pharmacy or drugstore before a specific remedy is selected.' },
      },
      placeholderCaption: { de: 'Apotheken-Beratungstheke vor mehreren klar getrennten Medikamentenregalen.', en: 'Pharmacy consultation counter in front of several clearly separated medicine shelves.' },
      songMood: 'plain practical pharmacy need',
      visualNotes: 'Japanese pharmacy counter, staff ready to help, medicine categories visible but no product chosen.',
    }),
  },
  {
    slug: 'kokoga-itai-desu',
    title: { de: 'Hier tut es weh', en: 'It hurts here' },
    situation: {
      de: 'An der Apothekentheke liegt eine Körperskizze; die Mitarbeiterin bittet dich mit einer offenen Handbewegung, die Stelle zu zeigen.',
      en: 'At the pharmacy counter, a body diagram lies open and the staff member gestures for you to indicate the area.',
    },
    pedagogicalGoal: 'ここが als gezeigte Körperstelle mit 痛い です zu einer unmittelbaren Schmerzaussage verbinden.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: 'ここが 痛い です。', baseText: { de: 'Hier tut es weh.', en: 'It hurts here.' } },
      meaning: { de: 'Eine zeigegestützte Aussage, wenn dir das genaue Körperwort fehlt.', en: 'A pointing-supported statement when you do not know the exact body-part word.' },
      chunks: [
        { id: 'kokoga-itai-desu-place', targetText: 'ここが', baseText: { de: 'diese Stelle hier', en: 'this place here' } },
        { id: 'kokoga-itai-desu-pain', targetText: '痛い', baseText: { de: 'schmerzhaft', en: 'painful' } },
        { id: 'kokoga-itai-desu-polite', targetText: 'です。', baseText: { de: 'ist.', en: 'is.' } },
      ],
      lessonItems: [
        { id: 'kokoga-itai-desu-item-koko', targetText: 'ここ', baseText: { de: 'hier (koko)', en: 'here (koko)' }, acceptedAnswers: ['ここ'] },
        { id: 'kokoga-itai-desu-item-kokoga', targetText: 'ここが', baseText: { de: 'diese Stelle (koko ga; mit Subjektpartikel)', en: 'this place (koko ga; with subject particle)' }, acceptedAnswers: ['ここが'] },
        { id: 'kokoga-itai-desu-item-itai', targetText: '痛い', baseText: { de: 'schmerzhaft / tut weh (itai)', en: 'painful / hurts (itai)' }, acceptedAnswers: ['痛い', 'いたい'] },
        { id: 'kokoga-itai-desu-item-karada', targetText: '体', baseText: { de: 'Körper (karada)', en: 'body (karada)' }, acceptedAnswers: ['体', 'からだ'] },
      ],
      buildChips: ['ここが', '痛い', 'です。', 'そこが', 'そこは 痛い です。'],
      typeRecall: {
        before: '', answer: 'ここが', after: ' 痛い です。',
        acceptedAnswers: japaneseAccepted('ここが'),
        fallbackChoices: ['ここが', '右手が', '左手が', '背中が'],
      },
      speakTarget: {
        baseCue: { de: 'Hier tut es weh.', en: 'It hurts here.' },
        targetPhrase: 'ここが 痛い です。',
        acceptedAnswers: ['ここが 痛い です。', 'ここが いたい です。'],
        requiredTokens: ['ここが', '痛い', 'です。'], optionalTokens: [],
      },
      sceneCaption: { de: 'Eine einfache Körperskizze liegt zwischen euch, während die Mitarbeiterin mit offener Hand auf mehrere mögliche Stellen weist.', en: 'A simple body diagram lies between you while the staff member gestures openly toward several possible areas.' },
      trophyWord: {
        word: 'ここ', meaning: { de: 'hier', en: 'here' }, example: 'ここが 痛い です。',
        whyThisWord: { de: 'ここ ersetzt ein unbekanntes Körperwort, wenn du gleichzeitig auf die schmerzende Stelle zeigen kannst.', en: 'ここ replaces an unknown body-part word when you can point to the painful area at the same time.' },
      },
      placeholderCaption: { de: 'Apothekentheke mit geöffneter Körperskizze und mehreren noch unmarkierten Bereichen.', en: 'Pharmacy counter with an open body diagram and several areas still unmarked.' },
      songMood: 'clear pointed symptom report',
      visualNotes: 'Pharmacy consultation, body chart and open-hand prompt, exact pain location deliberately unresolved.',
    }),
  },
  {
    slug: 'atamaga-itai-desu',
    title: { de: 'Kopfschmerzen', en: 'A headache' },
    situation: {
      de: 'Vor dem Regal für Schmerzmittel zeigt die Mitarbeiterin auf Symbole für Kopf, Hals und Bauch; du musst das richtige Symptom benennen.',
      en: 'By the pain-relief shelf, the staff member points to icons for the head, throat, and stomach and you need to identify the symptom.',
    },
    pedagogicalGoal: '頭が als konkrete Körperstelle mit 痛い です zu einer einfachen Kopfschmerzaussage machen.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: '頭が 痛い です。', baseText: { de: 'Ich habe Kopfschmerzen.', en: 'My head hurts.' } },
      meaning: { de: 'Eine genaue kurze Aussage für Kopfschmerzen in Apotheke oder Praxis.', en: 'A precise short statement for a headache in a pharmacy or clinic.' },
      chunks: [
        { id: 'atamaga-itai-desu-head', targetText: '頭が', baseText: { de: 'mein Kopf', en: 'my head' } },
        { id: 'atamaga-itai-desu-pain', targetText: '痛い です。', baseText: { de: 'tut weh.', en: 'hurts.' } },
      ],
      lessonItems: [
        { id: 'atamaga-itai-desu-item-atama', targetText: '頭', baseText: { de: 'Kopf (atama)', en: 'head (atama)' }, acceptedAnswers: ['頭', 'あたま'] },
        { id: 'atamaga-itai-desu-item-atamaga', targetText: '頭が', baseText: { de: 'Kopf (atama ga; mit Subjektpartikel)', en: 'head (atama ga; with subject particle)' }, acceptedAnswers: ['頭が', 'あたまが'] },
        { id: 'atamaga-itai-desu-item-itai', targetText: '痛い', baseText: { de: 'schmerzhaft / tut weh (itai)', en: 'painful / hurts (itai)' }, acceptedAnswers: ['痛い', 'いたい'] },
        { id: 'atamaga-itai-desu-item-zutsu', targetText: '頭痛', baseText: { de: 'Kopfschmerz (zutsū)', en: 'headache (zutsū)' }, acceptedAnswers: ['頭痛', 'ずつう'] },
      ],
      buildChips: ['頭が', '痛い です。', 'お腹が', '悪い です。'],
      typeRecall: {
        before: '', answer: '頭が', after: ' 痛い です。',
        acceptedAnswers: japaneseAccepted('頭が', 'あたまが'),
        fallbackChoices: ['頭が', '耳が', '目が', '歯が'],
      },
      speakTarget: {
        baseCue: { de: 'Ich habe Kopfschmerzen.', en: 'My head hurts.' },
        targetPhrase: '頭が 痛い です。',
        acceptedAnswers: ['頭が 痛い です。', 'あたまが いたい です。'],
        requiredTokens: ['頭が', '痛い', 'です。'], optionalTokens: [],
      },
      sceneCaption: { de: 'Drei Körpersymbole stehen nebeneinander am Regal, und die Mitarbeiterin hält ihre Hand zwischen ihnen offen.', en: 'Three body icons sit side by side on the shelf while the staff member holds an open hand between them.' },
      trophyWord: {
        word: '頭', meaning: { de: 'Kopf', en: 'head' }, example: '頭が 痛い です。',
        whyThisWord: { de: '頭 benennt die Schmerzstelle eindeutig und führt in der Apotheke schneller zum passenden Regal oder zur richtigen Frage.', en: '頭 identifies the pain location clearly and guides the pharmacy conversation toward the right shelf or follow-up question.' },
      },
      placeholderCaption: { de: 'Schmerzmittelregal mit getrennten Symbolen für Kopf, Hals und Bauch.', en: 'Pain-relief shelf with separate icons for the head, throat, and stomach.' },
      songMood: 'precise simple symptom naming',
      visualNotes: 'Drugstore pain-relief aisle, three body-part icons equally visible, staff waiting for the learner to identify one.',
    }),
  },
  {
    slug: 'sumimasen-mizuwo-onegaishimasu',
    title: { de: 'Wasser, bitte', en: 'Water, please' },
    situation: {
      de: 'Im Wartebereich der Apotheke steht ein Wasserspender hinter dem Tresen; vor dir liegt nur ein leerer Becher.',
      en: 'In the pharmacy waiting area, a water dispenser stands behind the counter and only an empty cup is in front of you.',
    },
    pedagogicalGoal: '水を mit すみません und お願いします zu einer höflichen unmittelbaren Bitte machen.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: 'すみません、 水を お願いします。', baseText: { de: 'Entschuldigung, Wasser bitte.', en: 'Excuse me, water please.' } },
      meaning: { de: 'Eine klare Bitte um Wasser in einem gesundheitlichen oder alltäglichen Moment.', en: 'A clear request for water in a health-related or everyday moment.' },
      chunks: [
        { id: 'sumimasen-mizuwo-onegaishimasu-attention', targetText: 'すみません、', baseText: { de: 'Entschuldigung,', en: 'Excuse me,' } },
        { id: 'sumimasen-mizuwo-onegaishimasu-water', targetText: '水を', baseText: { de: 'Wasser', en: 'water' } },
        { id: 'sumimasen-mizuwo-onegaishimasu-request', targetText: 'お願いします。', baseText: { de: 'bitte.', en: 'please.' } },
      ],
      lessonItems: [
        { id: 'sumimasen-mizuwo-onegaishimasu-item-sumimasen', targetText: 'すみません', baseText: { de: 'Entschuldigung (sumimasen)', en: 'excuse me (sumimasen)' }, acceptedAnswers: ['すみません'] },
        { id: 'sumimasen-mizuwo-onegaishimasu-item-mizu', targetText: '水', baseText: { de: 'Wasser (mizu)', en: 'water (mizu)' }, acceptedAnswers: ['水', 'みず'] },
        { id: 'sumimasen-mizuwo-onegaishimasu-item-mizuwo', targetText: '水を', baseText: { de: 'Wasser (mizu o; mit Objektpartikel)', en: 'water (mizu o; with object particle)' }, acceptedAnswers: ['水を', 'みずを'] },
        { id: 'sumimasen-mizuwo-onegaishimasu-item-koppu', targetText: 'コップ', baseText: { de: 'Becher / Glas (koppu)', en: 'cup / glass (koppu)' }, acceptedAnswers: ['コップ'] },
      ],
      buildChips: ['すみません、', '水を', 'お願いします。', 'お茶を', '薬を お願いします。'],
      typeRecall: {
        before: 'すみません、 ', answer: '水を', after: ' お願いします。',
        acceptedAnswers: japaneseAccepted('水を', 'みずを'),
        fallbackChoices: ['水を', 'ジュースを', '薬を', 'コップを'],
      },
      speakTarget: {
        baseCue: { de: 'Entschuldigung, Wasser bitte.', en: 'Excuse me, water please.' },
        targetPhrase: 'すみません、 水を お願いします。',
        acceptedAnswers: ['すみません、 水を お願いします。', 'すみません、 みずを おねがいします。'],
        requiredTokens: ['すみません、', '水を', 'お願いします。'], optionalTokens: [],
      },
      sceneCaption: { de: 'Ein leerer Becher steht auf dem kleinen Wartetisch, während der Wasserspender hinter dem besetzten Tresen sichtbar bleibt.', en: 'An empty cup sits on the small waiting table while the water dispenser remains visible behind the staffed counter.' },
      trophyWord: {
        word: '水', meaning: { de: 'Wasser', en: 'water' }, example: '水を お願いします。',
        whyThisWord: { de: '水 ist eines der wichtigsten unmittelbaren Bedürfniswörter und wird mit を direkt zum Gegenstand deiner Bitte.', en: '水 is one of the most important immediate-need words and becomes the direct object of your request with を.' },
      },
      placeholderCaption: { de: 'Apotheken-Wartebereich mit leerem Becher und sichtbarem Wasserspender hinter dem Tresen.', en: 'Pharmacy waiting area with an empty cup and a visible water dispenser behind the counter.' },
      songMood: 'gentle immediate comfort request',
      visualNotes: 'Quiet pharmacy waiting corner, empty cup foregrounded, water source visible but out of reach.',
    }),
  },
  {
    slug: 'chikakuni-oishasanwa-imasuka',
    title: { de: 'Ist ein Arzt in der Nähe?', en: 'Is there a doctor nearby?' },
    situation: {
      de: 'Die Apotheke kann dein Anliegen nicht direkt lösen; die Mitarbeiterin öffnet eine Karte mit mehreren medizinischen Einrichtungen.',
      en: 'The pharmacy cannot directly resolve your concern, so the staff member opens a map with several medical facilities.',
    },
    pedagogicalGoal: '近くに als Bereich setzen und mit お医者さんは いますか nach einer Person in der Nähe fragen.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: '近くに お医者さんは いますか。', baseText: { de: 'Ist ein Arzt in der Nähe?', en: 'Is there a doctor nearby?' } },
      meaning: { de: 'Eine höfliche Frage nach ärztlicher Hilfe im nahen Umfeld.', en: 'A polite question about medical help in the nearby area.' },
      chunks: [
        { id: 'chikakuni-oishasanwa-imasuka-nearby', targetText: '近くに', baseText: { de: 'in der Nähe', en: 'nearby' } },
        { id: 'chikakuni-oishasanwa-imasuka-doctor', targetText: 'お医者さんは', baseText: { de: 'ein Arzt', en: 'a doctor' } },
        { id: 'chikakuni-oishasanwa-imasuka-exists', targetText: 'いますか。', baseText: { de: 'ist jemand da?', en: 'is there one?' } },
      ],
      lessonItems: [
        { id: 'chikakuni-oishasanwa-imasuka-item-chikaku', targetText: '近く', baseText: { de: 'Nähe (chikaku)', en: 'nearby area (chikaku)' }, acceptedAnswers: ['近く', 'ちかく'] },
        { id: 'chikakuni-oishasanwa-imasuka-item-oishasan', targetText: 'お医者さん', baseText: { de: 'Arzt / Ärztin (oisha-san)', en: 'doctor (oisha-san)' }, acceptedAnswers: ['お医者さん', 'おいしゃさん'] },
        { id: 'chikakuni-oishasanwa-imasuka-item-oishasanwa', targetText: 'お医者さんは', baseText: { de: 'Arzt oder Ärztin (oisha-san wa; mit Themenpartikel)', en: 'doctor (oisha-san wa; with topic particle)' }, acceptedAnswers: ['お医者さんは', 'おいしゃさんは'] },
        { id: 'chikakuni-oishasanwa-imasuka-item-byoin', targetText: '病院', baseText: { de: 'Krankenhaus / Klinik (byōin)', en: 'hospital / clinic (byōin)' }, acceptedAnswers: ['病院', 'びょういん'] },
      ],
      buildChips: ['近くに', 'お医者さんは', 'いますか。', '店員さんは', 'ありますか。'],
      typeRecall: {
        before: '近くに ', answer: 'お医者さんは', after: ' いますか。',
        acceptedAnswers: japaneseAccepted('お医者さんは', 'おいしゃさんは'),
        fallbackChoices: ['お医者さんは', '店員さんは', '駅員さんは', '先生は'],
      },
      speakTarget: {
        baseCue: { de: 'Ist ein Arzt in der Nähe?', en: 'Is there a doctor nearby?' },
        targetPhrase: '近くに お医者さんは いますか。',
        acceptedAnswers: ['近くに お医者さんは いますか。', 'ちかくに おいしゃさんは いますか。'],
        requiredTokens: ['近くに', 'お医者さんは', 'いますか。'], optionalTokens: [],
      },
      sceneCaption: { de: 'Auf der geöffneten Karte sind mehrere medizinische Symbole verteilt, während die Mitarbeiterin auf das umliegende Viertel zeigt.', en: 'Several medical symbols are spread across the open map while the staff member gestures toward the surrounding neighborhood.' },
      trophyWord: {
        word: 'お医者さん', meaning: { de: 'Arzt / Ärztin', en: 'doctor' }, example: 'お医者さんは いますか。',
        whyThisWord: { de: 'お医者さん fragt nach der medizinischen Person selbst; deshalb verbindet es sich bei Existenz mit います statt あります.', en: 'お医者さん asks about the medical professional as a person, so existence is expressed with います rather than あります.' },
      },
      placeholderCaption: { de: 'Geöffnete Viertelkarte auf der Apothekentheke mit mehreren verteilten medizinischen Symbolen.', en: 'Open neighborhood map on the pharmacy counter with several medical symbols spread across it.' },
      songMood: 'steady search for medical help',
      visualNotes: 'Pharmacy counter map, several possible medical facilities, staff indicating the area without selecting one.',
    }),
  },
  {
    slug: 'watashiwa-arerugiga-arimasu',
    title: { de: 'Ich habe eine Allergie', en: 'I have an allergy' },
    situation: {
      de: 'Vor der Medikamentenauswahl zeigt die Apothekerin auf ein Formular mit mehreren Verträglichkeitsfeldern; deines ist noch leer.',
      en: 'Before choosing medicine, the pharmacist points to a form with several tolerance fields and yours is still blank.',
    },
    pedagogicalGoal: 'Mit 私は das eigene Gesundheitsprofil setzen und アレルギーが あります als wichtige Sicherheitsangabe verwenden.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: '私は アレルギーが あります。', baseText: { de: 'Ich habe eine Allergie.', en: 'I have an allergy.' } },
      meaning: { de: 'Eine grundlegende Sicherheitsinformation vor Medikamenten oder Essen.', en: 'A basic safety statement before medicine or food.' },
      chunks: [
        { id: 'watashiwa-arerugiga-arimasu-self', targetText: '私は', baseText: { de: 'ich', en: 'I' } },
        { id: 'watashiwa-arerugiga-arimasu-allergy', targetText: 'アレルギーが', baseText: { de: 'eine Allergie', en: 'an allergy' } },
        { id: 'watashiwa-arerugiga-arimasu-have', targetText: 'あります。', baseText: { de: 'habe ich.', en: 'I have.' } },
      ],
      lessonItems: [
        { id: 'watashiwa-arerugiga-arimasu-item-watashi', targetText: '私', baseText: { de: 'ich (watashi)', en: 'I / me (watashi)' }, acceptedAnswers: ['私', 'わたし'] },
        { id: 'watashiwa-arerugiga-arimasu-item-watashiwa', targetText: '私は', baseText: { de: 'ich (watashi wa; mit Themenpartikel)', en: 'I (watashi wa; with topic particle)' }, acceptedAnswers: ['私は', 'わたしは'] },
        { id: 'watashiwa-arerugiga-arimasu-item-arerugi', targetText: 'アレルギー', baseText: { de: 'Allergie (arerugī)', en: 'allergy (arerugī)' }, acceptedAnswers: ['アレルギー'] },
        { id: 'watashiwa-arerugiga-arimasu-item-arerugiga', targetText: 'アレルギーが', baseText: { de: 'Allergie (arerugī ga; mit Subjektpartikel)', en: 'allergy (arerugī ga; with subject particle)' }, acceptedAnswers: ['アレルギーが'] },
      ],
      buildChips: ['私は', 'アレルギーが', 'あります。', '薬が', 'ありません。'],
      typeRecall: {
        before: '私は ', answer: 'アレルギーが', after: ' あります。',
        acceptedAnswers: japaneseAccepted('アレルギーが'),
        fallbackChoices: ['アレルギーが', '熱が', 'せきが', '保険が'],
      },
      speakTarget: {
        baseCue: { de: 'Ich habe eine Allergie.', en: 'I have an allergy.' },
        targetPhrase: '私は アレルギーが あります。',
        acceptedAnswers: ['私は アレルギーが あります。', 'わたしは アレルギーが あります。'],
        requiredTokens: ['私は', 'アレルギーが', 'あります。'], optionalTokens: [],
      },
      sceneCaption: { de: 'Auf dem Verträglichkeitsformular bleibt ein markiertes Gesundheitsfeld leer, während die Apothekerin mit dem Stift daneben wartet.', en: 'A marked health field remains blank on the tolerance form while the pharmacist waits beside it with a pen.' },
      trophyWord: {
        word: 'アレルギー', meaning: { de: 'Allergie', en: 'allergy' }, example: 'アレルギーが あります。',
        whyThisWord: { de: 'アレルギー ist ein international erkennbares Sicherheitswort und sollte vor Medikamenten oder unbekannten Zutaten früh genannt werden.', en: 'アレルギー is an internationally recognizable safety word and should be stated early before medicine or unfamiliar ingredients.' },
      },
      placeholderCaption: { de: 'Apothekenformular mit leerem Verträglichkeitsfeld, Stift und mehreren noch ungeöffneten Medikamentenpackungen.', en: 'Pharmacy form with a blank tolerance field, a pen, and several unopened medicine packages.' },
      songMood: 'careful clear safety disclosure',
      visualNotes: 'Pharmacist consultation, allergy field visually prominent, unopened medicine remains unselected.',
    }),
  },
  {
    slug: 'dareka-yonde-kudasai',
    title: { de: 'Bitte jemanden rufen', en: 'Please call someone' },
    situation: {
      de: 'Im Flur des Gästehauses braucht eine Person Unterstützung; die Rezeption ist um die Ecke, aber gerade niemand steht bei euch.',
      en: 'In the guesthouse corridor, someone needs assistance; reception is around the corner but no staff member is currently with you.',
    },
    pedagogicalGoal: 'Die ausdrücklich erlaubte feste Bitte 呼んで ください mit 誰か als offener Personenangabe verwenden.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: '誰か 呼んで ください。', baseText: { de: 'Bitte rufen Sie jemanden.', en: 'Please call someone.' } },
      meaning: { de: 'Eine dringliche, aber weiterhin höfliche Bitte, Unterstützung zu holen.', en: 'An urgent but still polite request to get another person’s help.' },
      chunks: [
        { id: 'dareka-yonde-kudasai-someone', targetText: '誰か', baseText: { de: 'jemanden', en: 'someone' } },
        { id: 'dareka-yonde-kudasai-call', targetText: '呼んで ください。', baseText: { de: 'rufen Sie bitte.', en: 'please call.' } },
      ],
      lessonItems: [
        { id: 'dareka-yonde-kudasai-item-dareka', targetText: '誰か', baseText: { de: 'jemand (dareka)', en: 'someone (dareka)' }, acceptedAnswers: ['誰か', 'だれか'] },
        { id: 'dareka-yonde-kudasai-item-yonde', targetText: '呼んで', baseText: { de: 'rufen Sie (yonde)', en: 'call (yonde)' }, acceptedAnswers: ['呼んで', 'よんで'] },
        { id: 'dareka-yonde-kudasai-item-teninsan', targetText: '店員さん', baseText: { de: 'Ladenpersonal (ten’in-san)', en: 'shop staff member (ten’in-san)' }, acceptedAnswers: ['店員さん', 'てんいんさん'] },
        { id: 'dareka-yonde-kudasai-item-denwa', targetText: '電話', baseText: { de: 'Telefon / Anruf (denwa)', en: 'telephone / call (denwa)' }, acceptedAnswers: ['電話', 'でんわ'] },
      ],
      buildChips: ['誰か', '呼んで ください。', 'どこか', '待って ください。'],
      typeRecall: {
        before: '', answer: '誰か', after: ' 呼んで ください。',
        acceptedAnswers: japaneseAccepted('誰か', 'だれか'),
        fallbackChoices: ['誰か', 'どこか', '何か', 'いつ'],
      },
      speakTarget: {
        baseCue: { de: 'Bitte rufen Sie jemanden.', en: 'Please call someone.' },
        targetPhrase: '誰か 呼んで ください。',
        acceptedAnswers: ['誰か 呼んで ください。', 'だれか よんで ください。', '誰か 呼んで 下さい。'],
        requiredTokens: ['誰か', '呼んで', 'ください。'], optionalTokens: [],
      },
      sceneCaption: { de: 'Der leere Korridor führt um eine Ecke zur Rezeption, während neben dir sichtbar sofortige Unterstützung nötig ist.', en: 'The empty corridor turns toward reception while someone beside you visibly needs immediate assistance.' },
      trophyWord: {
        word: '誰か', meaning: { de: 'jemand', en: 'someone' }, example: '誰か 呼んで ください。',
        whyThisWord: { de: '誰か hält die Person offen und ist deshalb nützlich, wenn du nicht weißt, ob Personal, Arzt oder Begleitung erreichbar ist.', en: '誰か leaves the person unspecified, which helps when you do not know whether staff, a doctor, or a companion is available.' },
      },
      placeholderCaption: { de: 'Leerer Gästehausflur mit Wegweiser zur Rezeption um die Ecke und einer akuten Hilfesituation im Vordergrund.', en: 'Empty guesthouse corridor with a reception sign around the corner and an immediate need for help in the foreground.' },
      songMood: 'urgent controlled request for help',
      visualNotes: 'Guesthouse corridor, reception direction visible but no helper present, urgency clear without graphic distress.',
    }),
  },
  {
    slug: 'mo-daijobu-desu-arigato',
    title: { de: 'Jetzt geht es wieder', en: 'I am okay now' },
    situation: {
      de: 'Nach einer Pause steht Wasser neben dir; die besorgte Mitarbeiterin bleibt in der Nähe und prüft mit einem Blick dein Befinden.',
      en: 'After a rest, water sits beside you and the concerned staff member remains nearby, checking how you are doing.',
    },
    pedagogicalGoal: 'もう mit 大丈夫 です zu einer aktuellen Entwarnung verbinden und anschließend höflich danken.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: 'もう 大丈夫 です。 ありがとうございます。', baseText: { de: 'Jetzt geht es wieder. Vielen Dank.', en: 'I am okay now. Thank you very much.' } },
      meaning: { de: 'Eine beruhigende Rückmeldung mit Dank, nachdem Unterstützung geholfen hat.', en: 'A reassuring update with thanks after assistance has helped.' },
      chunks: [
        { id: 'mo-daijobu-desu-arigato-now', targetText: 'もう', baseText: { de: 'jetzt schon', en: 'now / already' } },
        { id: 'mo-daijobu-desu-arigato-okay', targetText: '大丈夫 です。', baseText: { de: 'ist alles in Ordnung.', en: 'I am okay.' } },
        { id: 'mo-daijobu-desu-arigato-thanks', targetText: 'ありがとうございます。', baseText: { de: 'vielen Dank.', en: 'thank you very much.' } },
      ],
      lessonItems: [
        { id: 'mo-daijobu-desu-arigato-item-mo', targetText: 'もう', baseText: { de: 'schon / jetzt (mō)', en: 'already / now (mō)' }, acceptedAnswers: ['もう'] },
        { id: 'mo-daijobu-desu-arigato-item-daijobu', targetText: '大丈夫', baseText: { de: 'in Ordnung / okay (daijōbu)', en: 'all right / okay (daijōbu)' }, acceptedAnswers: ['大丈夫', 'だいじょうぶ'] },
        { id: 'mo-daijobu-desu-arigato-item-arigato', targetText: 'ありがとうございます', baseText: { de: 'vielen Dank (arigatō gozaimasu)', en: 'thank you very much (arigatō gozaimasu)' }, acceptedAnswers: ['ありがとうございます'] },
        { id: 'mo-daijobu-desu-arigato-item-kibun', targetText: '気分', baseText: { de: 'Befinden / Gefühl (kibun)', en: 'condition / feeling (kibun)' }, acceptedAnswers: ['気分', 'きぶん'] },
      ],
      buildChips: ['もう', '大丈夫 です。', 'ありがとうございます。', '今は', 'すみません。'],
      typeRecall: {
        before: 'もう ', answer: '大丈夫', after: ' です。 ありがとうございます。',
        acceptedAnswers: japaneseAccepted('大丈夫', 'だいじょうぶ'),
        fallbackChoices: ['大丈夫', '必要', '病気', '予約'],
      },
      speakTarget: {
        baseCue: { de: 'Jetzt geht es wieder. Vielen Dank.', en: 'I am okay now. Thank you very much.' },
        targetPhrase: 'もう 大丈夫 です。 ありがとうございます。',
        acceptedAnswers: ['もう 大丈夫 です。 ありがとうございます。', 'もう だいじょうぶ です。 ありがとうございます。'],
        requiredTokens: ['もう', '大丈夫', 'ありがとうございます。'], optionalTokens: ['です。'],
      },
      sceneCaption: { de: 'Neben dem Sitz stehen Wasser und ein zusammengefaltetes Handtuch, während die Mitarbeiterin mit etwas Abstand aufmerksam bleibt.', en: 'Water and a folded towel sit beside the chair while the staff member remains attentive at a respectful distance.' },
      trophyWord: {
        word: '大丈夫', meaning: { de: 'in Ordnung / okay', en: 'all right / okay' }, example: 'もう 大丈夫 です。',
        whyThisWord: { de: '大丈夫 gibt nach einer schwierigen Situation eine klare Entwarnung und hilft der anderen Person, ihre Sorge einzuordnen.', en: '大丈夫 gives a clear all-clear after a difficult moment and helps the other person understand that the concern has eased.' },
      },
      placeholderCaption: { de: 'Ruhiger Warteplatz mit Wasser, gefaltetem Handtuch und aufmerksamem Personal in respektvoller Entfernung.', en: 'Quiet waiting seat with water, a folded towel, and attentive staff at a respectful distance.' },
      songMood: 'relieved grateful recovery',
      visualNotes: 'Calm recovery moment, water and towel as evidence of care, staff still checking without crowding.',
    }),
  },
]

export const JAPANESE_A1_PRACTICAL_6_LESSONS: GuidedLessonDefinition[] = makeJapanesePracticalLessons(
  GUIDED_TODAY_PATH_JAPANESE_SIX_METADATA,
  japaneseA1Practical6Inputs,
  { de: 'Du hast Japanisch A1 Praxis 6 abgeschlossen.', en: 'You have completed Japanese A1 Practical 6.' },
)

export const GUIDED_TODAY_PATH_JAPANESE_SEVEN_METADATA: GuidedPathMetadata = {
  id: 'japanese-a1-practical-7',
  title: 'Japanese A1 Practical 7',
  shortTitle: 'A1 Practical 7',
  subtitle: { de: 'Fahrkarten, Bahnsteige und Wege', en: 'Tickets, platforms, and getting around' },
  level: 'A1',
  baseLanguage: 'German',
  targetLanguage: 'Japanese',
  estimatedMinutes: 5,
}

const japaneseA1Practical7Inputs: JapaneseLessonInput[] = [
  {
    slug: 'shinkansenwa-ofukude-onegaishimasu',
    title: { de: 'Hin und zurück', en: 'Round trip' },
    situation: {
      de: 'Am Schalter für den Shinkansen fragt die Mitarbeiterin, ob du nur hinfahren oder auch zurückfahren möchtest.',
      en: 'At the Shinkansen ticket counter, the clerk asks whether you are traveling one way or returning as well.',
    },
    pedagogicalGoal: '往復で als feste Fahrkartenwahl mit お願いします zu einer höflichen Bestellung verbinden.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: '新幹線は 往復で お願いします。', baseText: { de: 'Für den Shinkansen bitte hin und zurück.', en: 'A round trip on the Shinkansen, please.' } },
      meaning: { de: 'Eine knappe Bestellung für eine Hin- und Rückfahrt mit dem Hochgeschwindigkeitszug.', en: 'A concise request for an outbound and return journey on the bullet train.' },
      chunks: [
        { id: 'shinkansenwa-ofukude-onegaishimasu-train', targetText: '新幹線は', baseText: { de: 'für den Shinkansen', en: 'for the Shinkansen' } },
        { id: 'shinkansenwa-ofukude-onegaishimasu-return', targetText: '往復で', baseText: { de: 'hin und zurück', en: 'as a round trip' } },
        { id: 'shinkansenwa-ofukude-onegaishimasu-request', targetText: 'お願いします。', baseText: { de: 'bitte.', en: 'please.' } },
      ],
      lessonItems: [
        { id: 'shinkansenwa-ofukude-onegaishimasu-item-ofuku', targetText: '往復', baseText: { de: 'Hin- und Rückfahrt (ōfuku)', en: 'round trip (ōfuku)' }, acceptedAnswers: ['往復', 'おうふく'] },
        { id: 'shinkansenwa-ofukude-onegaishimasu-item-ofukude', targetText: '往復で', baseText: { de: 'hin und zurück (ōfuku de; mit Auswahlpartikel)', en: 'as a round trip (ōfuku de; with choice particle)' }, acceptedAnswers: ['往復で', 'おうふくで'] },
        { id: 'shinkansenwa-ofukude-onegaishimasu-item-shinkansen', targetText: '新幹線', baseText: { de: 'Hochgeschwindigkeitszug (shinkansen)', en: 'bullet train (shinkansen)' }, acceptedAnswers: ['新幹線', 'しんかんせん'] },
        { id: 'shinkansenwa-ofukude-onegaishimasu-item-katamichi', targetText: '片道', baseText: { de: 'einfache Fahrt (katamichi)', en: 'one-way trip (katamichi)' }, acceptedAnswers: ['片道', 'かたみち'] },
      ],
      buildChips: ['新幹線は', '往復で', 'お願いします。', '片道で', '自由席を'],
      typeRecall: {
        before: '新幹線は ', answer: '往復で', after: ' お願いします。',
        acceptedAnswers: japaneseAccepted('往復で', 'おうふくで'),
        fallbackChoices: ['往復で', '片道で', '現金で', '改札で'],
      },
      speakTarget: {
        baseCue: { de: 'Für den Shinkansen bitte hin und zurück.', en: 'A round trip on the Shinkansen, please.' },
        targetPhrase: '新幹線は 往復で お願いします。',
        acceptedAnswers: ['新幹線は 往復で お願いします。', 'しんかんせんは おうふくで おねがいします。'],
        requiredTokens: ['新幹線は', '往復で', 'お願いします。'], optionalTokens: [],
      },
      sceneCaption: { de: 'Auf dem Schalterdisplay stehen zwei Tarifspalten, während der Cursor noch zwischen ihnen wartet.', en: 'Two fare columns sit on the counter display while the cursor still waits between them.' },
      trophyWord: {
        word: '往復', meaning: { de: 'Hin- und Rückfahrt', en: 'round trip' }, example: '新幹線は 往復で お願いします。',
        whyThisWord: { de: '往復 deckt beide Reiserichtungen mit einem einzigen nützlichen Fahrkartenwort ab.', en: '往復 covers both directions of a journey with one useful ticket-counter word.' },
      },
      placeholderCaption: { de: 'Shinkansen-Schalter mit zwei klar getrennten Tarifspalten und noch leerem Auswahlfeld.', en: 'Shinkansen counter with two clearly separated fare columns and an unselected choice field.' },
      songMood: 'crisp confident ticket choice',
      visualNotes: 'Japanese rail ticket counter, one-way and return columns visible, clerk waiting without revealing the selected fare.',
    }),
  },
  {
    slug: 'sumimasen-ekiwa-doko-desuka',
    title: { de: 'Wo ist der Bahnhof?', en: 'Where is the station?' },
    situation: {
      de: 'Vor einem großen Einkaufsgebäude siehst du mehrere Wegweiser, aber keinen eindeutigen Hinweis zum Bahnhof.',
      en: 'Outside a large shopping building, you see several direction signs but no clear sign for the station.',
    },
    pedagogicalGoal: '駅は als gesuchten Ort markieren und mit どこ ですか höflich nach seiner Lage fragen.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: 'すみません、 駅は どこ ですか。', baseText: { de: 'Entschuldigung, wo ist der Bahnhof?', en: 'Excuse me, where is the station?' } },
      meaning: { de: 'Eine direkte höfliche Wegfrage nach dem örtlichen Bahnhof.', en: 'A direct polite directions question for the local station.' },
      chunks: [
        { id: 'sumimasen-ekiwa-doko-desuka-attention', targetText: 'すみません、', baseText: { de: 'Entschuldigung,', en: 'Excuse me,' } },
        { id: 'sumimasen-ekiwa-doko-desuka-station', targetText: '駅は', baseText: { de: 'der Bahnhof', en: 'the station' } },
        { id: 'sumimasen-ekiwa-doko-desuka-where', targetText: 'どこ ですか。', baseText: { de: 'wo ist er?', en: 'where is it?' } },
      ],
      lessonItems: [
        { id: 'sumimasen-ekiwa-doko-desuka-item-sumimasen', targetText: 'すみません', baseText: { de: 'Entschuldigung (sumimasen)', en: 'excuse me (sumimasen)' }, acceptedAnswers: ['すみません'] },
        { id: 'sumimasen-ekiwa-doko-desuka-item-eki', targetText: '駅', baseText: { de: 'Bahnhof (eki)', en: 'station (eki)' }, acceptedAnswers: ['駅', 'えき'] },
        { id: 'sumimasen-ekiwa-doko-desuka-item-ekiwa', targetText: '駅は', baseText: { de: 'Bahnhof (eki wa; mit Themenpartikel)', en: 'station (eki wa; with topic particle)' }, acceptedAnswers: ['駅は', 'えきは'] },
        { id: 'sumimasen-ekiwa-doko-desuka-item-kaisatsu', targetText: '改札', baseText: { de: 'Bahnsteigsperre (kaisatsu)', en: 'ticket gate (kaisatsu)' }, acceptedAnswers: ['改札', 'かいさつ'] },
      ],
      buildChips: ['すみません、', '駅は', 'どこ ですか。', '入口は', 'あちら です。'],
      typeRecall: {
        before: 'すみません、 ', answer: '駅は', after: ' どこ ですか。',
        acceptedAnswers: japaneseAccepted('駅は', 'えきは'),
        fallbackChoices: ['駅は', '改札は', '出口は', 'バス停は'],
      },
      speakTarget: {
        baseCue: { de: 'Entschuldigung, wo ist der Bahnhof?', en: 'Excuse me, where is the station?' },
        targetPhrase: 'すみません、 駅は どこ ですか。',
        acceptedAnswers: ['すみません、 駅は どこ ですか。', 'すみません、 えきは どこ ですか。'],
        requiredTokens: ['すみません、', '駅は', 'どこ'], optionalTokens: ['ですか。'],
      },
      sceneCaption: { de: 'Mehrere Pfeile führen vom Vorplatz in verschiedene Richtungen, doch das gesuchte Bahnsymbol fehlt.', en: 'Several arrows lead away from the plaza in different directions, but the needed rail symbol is missing.' },
      trophyWord: {
        word: '駅', meaning: { de: 'Bahnhof', en: 'station' }, example: '駅は あそこ です。',
        whyThisWord: { de: '駅 ist der zentrale Ortsanker für Zugfahrten, Umstiege und viele Wegfragen in Japan.', en: '駅 is the central location word for train journeys, transfers, and many directions questions in Japan.' },
      },
      placeholderCaption: { de: 'Belebter Bahnhofsvorplatz mit mehreren Pfeilen, Ladenlogos und einem fehlenden Bahnhinweis.', en: 'Busy station-area plaza with several arrows, shop logos, and no obvious rail direction.' },
      songMood: 'open city wayfinding question',
      visualNotes: 'Urban Japanese plaza, several competing signs, traveler scanning for a station marker that remains unresolved.',
    }),
  },
  {
    slug: 'shinkansenwa-nanjini-demasu',
    title: { de: 'Wann fährt er ab?', en: 'What time does it leave?' },
    situation: {
      de: 'An der Abfahrtstafel blinken mehrere Shinkansen-Verbindungen, und dein Ziel erscheint in mehr als einer Zeile.',
      en: 'Several Shinkansen services flash on the departure board, and your destination appears on more than one row.',
    },
    pedagogicalGoal: '何時に als Zeitpunkt mit 出ますか zu einer kurzen Abfahrtsfrage verbinden.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: '次の 新幹線は 何時に 出ますか。', baseText: { de: 'Um wie viel Uhr fährt der nächste Shinkansen ab?', en: 'What time does the next Shinkansen leave?' } },
      meaning: { de: 'Eine klare Frage nach der Abfahrtszeit des Hochgeschwindigkeitszugs.', en: 'A clear question about the bullet train’s departure time.' },
      chunks: [
        { id: 'shinkansenwa-nanjini-demasu-train', targetText: '次の 新幹線は', baseText: { de: 'der nächste Shinkansen', en: 'the next Shinkansen' } },
        { id: 'shinkansenwa-nanjini-demasu-time', targetText: '何時に', baseText: { de: 'um wie viel Uhr', en: 'at what time' } },
        { id: 'shinkansenwa-nanjini-demasu-leave', targetText: '出ますか。', baseText: { de: 'fährt er ab?', en: 'does it leave?' } },
      ],
      lessonItems: [
        { id: 'shinkansenwa-nanjini-demasu-item-shinkansenwa', targetText: '新幹線は', baseText: { de: 'Shinkansen (shinkansen wa; mit Themenpartikel)', en: 'bullet train (shinkansen wa; with topic particle)' }, acceptedAnswers: ['新幹線は', 'しんかんせんは'] },
        { id: 'shinkansenwa-nanjini-demasu-item-nanji', targetText: '何時', baseText: { de: 'welche Uhrzeit (nanji)', en: 'what time (nanji)' }, acceptedAnswers: ['何時', 'なんじ'] },
        { id: 'shinkansenwa-nanjini-demasu-item-nanjini', targetText: '何時に', baseText: { de: 'um wie viel Uhr (nanji ni; mit Zeitpartikel)', en: 'at what time (nanji ni; with time particle)' }, acceptedAnswers: ['何時に', 'なんじに'] },
        { id: 'shinkansenwa-nanjini-demasu-item-demasu', targetText: '出ます', baseText: { de: 'fährt ab / verlässt (demasu)', en: 'leaves / departs (demasu)' }, acceptedAnswers: ['出ます', 'でます'] },
      ],
      buildChips: ['次の 新幹線は', '何時に', '出ますか。', '何番ですか。', '着きますか。'],
      typeRecall: {
        before: '次の 新幹線は ', answer: '何時に', after: ' 出ますか。',
        acceptedAnswers: japaneseAccepted('何時に', 'なんじに'),
        fallbackChoices: ['何時に', '朝に', '夜に', '土曜日に'],
      },
      speakTarget: {
        baseCue: { de: 'Um wie viel Uhr fährt der nächste Shinkansen ab?', en: 'What time does the next Shinkansen leave?' },
        targetPhrase: '次の 新幹線は 何時に 出ますか。',
        acceptedAnswers: ['次の 新幹線は 何時に 出ますか。', 'つぎの しんかんせんは なんじに でますか。'],
        requiredTokens: ['新幹線は', '何時に', '出ますか。'], optionalTokens: [],
      },
      sceneCaption: { de: 'Die Abfahrtstafel zeigt mehrere passende Zeilen mit unterschiedlichen Uhrzeiten und Zugnummern.', en: 'The departure board shows several matching rows with different times and train numbers.' },
      trophyWord: {
        word: '新幹線', meaning: { de: 'Hochgeschwindigkeitszug', en: 'bullet train' }, example: '新幹線は この ホーム です。',
        whyThisWord: { de: '新幹線 benennt Japans Hochgeschwindigkeitszug eindeutig und hilft am Schalter wie auf der Anzeigetafel.', en: '新幹線 identifies Japan’s bullet train clearly at both the ticket counter and the departure board.' },
      },
      placeholderCaption: { de: 'Elektronische Abfahrtstafel mit mehreren Shinkansen-Zeilen und unterschiedlichen Uhrzeiten.', en: 'Electronic departure board with several Shinkansen rows and different departure times.' },
      songMood: 'bright departure board focus',
      visualNotes: 'Shinkansen concourse, multiple departures for one destination, no row highlighted as the answer.',
    }),
  },
  {
    slug: 'kono-homude-ii-desuka',
    title: { de: 'Der richtige Bahnsteig', en: 'The right platform' },
    situation: {
      de: 'Oben an der Treppe teilen sich zwei Shinkansen-Bahnsteige; auf beiden stehen Züge mit ähnlichen Zielanzeigen.',
      en: 'At the top of the stairs, two Shinkansen platforms split apart, with similar destination displays on both.',
    },
    pedagogicalGoal: 'この ホームで als konkrete Wahl mit いい ですか höflich bestätigen lassen.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: 'この ホームで いい ですか。', baseText: { de: 'Ist dieser Bahnsteig richtig?', en: 'Is this platform okay?' } },
      meaning: { de: 'Eine kurze Kontrollfrage, bevor du an einem Bahnsteig wartest oder einsteigst.', en: 'A short confirmation before waiting or boarding at a platform.' },
      chunks: [
        { id: 'kono-homude-ii-desuka-platform', targetText: 'この ホームで', baseText: { de: 'an diesem Bahnsteig', en: 'at this platform' } },
        { id: 'kono-homude-ii-desuka-check', targetText: 'いい ですか。', baseText: { de: 'ist es richtig?', en: 'is it okay?' } },
      ],
      lessonItems: [
        { id: 'kono-homude-ii-desuka-item-kono', targetText: 'この', baseText: { de: 'dieser / diese (kono)', en: 'this (kono)' }, acceptedAnswers: ['この'] },
        { id: 'kono-homude-ii-desuka-item-homu', targetText: 'ホーム', baseText: { de: 'Bahnsteig (hōmu)', en: 'platform (hōmu)' }, acceptedAnswers: ['ホーム'] },
        { id: 'kono-homude-ii-desuka-item-homude', targetText: 'ホームで', baseText: { de: 'am Bahnsteig (hōmu de; mit Ortspartikel)', en: 'at the platform (hōmu de; with location particle)' }, acceptedAnswers: ['ホームで'] },
        { id: 'kono-homude-ii-desuka-item-annai', targetText: '案内', baseText: { de: 'Hinweis / Auskunft (annai)', en: 'guidance / information (annai)' }, acceptedAnswers: ['案内', 'あんない'] },
      ],
      buildChips: ['この ホームで', 'いい ですか。', 'あの ホームで', 'どこ ですか。'],
      typeRecall: {
        before: 'この ', answer: 'ホームで', after: ' いい ですか。',
        acceptedAnswers: japaneseAccepted('ホームで'),
        fallbackChoices: ['ホームで', '券売機で', '車内で', '東口で'],
      },
      speakTarget: {
        baseCue: { de: 'Ist dieser Bahnsteig richtig?', en: 'Is this platform okay?' },
        targetPhrase: 'この ホームで いい ですか。',
        acceptedAnswers: ['この ホームで いい ですか。'],
        requiredTokens: ['この', 'ホームで', 'いい'], optionalTokens: ['ですか。'],
      },
      sceneCaption: { de: 'Zwei Bahnsteigschilder hängen nebeneinander über der Treppe, und beide Zielanzeigen wirken beinahe gleich.', en: 'Two platform signs hang side by side above the stairs, and both destination displays look nearly identical.' },
      trophyWord: {
        word: 'ホーム', meaning: { de: 'Bahnsteig', en: 'platform' }, example: 'ホームは あちら です。',
        whyThisWord: { de: 'ホーム ist das übliche Bahnwort für den Bahnsteig und steht auf Schildern in großen wie kleinen Stationen.', en: 'ホーム is the usual rail word for a platform and appears on signs in stations large and small.' },
      },
      placeholderCaption: { de: 'Geteilte Treppe zu zwei fast gleich beschilderten Shinkansen-Bahnsteigen.', en: 'Split staircase leading to two almost identically signed Shinkansen platforms.' },
      songMood: 'careful platform confirmation',
      visualNotes: 'Station staircase fork, two platform signs equally prominent, traveler pausing before choosing a side.',
    }),
  },
  {
    slug: 'takushi-noribawa-doko-desuka',
    title: { de: 'Zum Taxistand', en: 'To the taxi stand' },
    situation: {
      de: 'Hinter der Bahnhofssperre zeigen Schilder zu Bus, Mietwagen und Abholung, aber der Taxistand ist nicht markiert.',
      en: 'Beyond the ticket gates, signs point to buses, rentals, and pickup, but the taxi stand is not marked.',
    },
    pedagogicalGoal: 'タクシー乗り場は als zusammengesetzten Zielort mit どこ ですか erfragen.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: 'タクシー乗り場は どこ ですか。', baseText: { de: 'Wo ist der Taxistand?', en: 'Where is the taxi stand?' } },
      meaning: { de: 'Eine praktische Ortsfrage, wenn du nach der Zugfahrt ein Taxi brauchst.', en: 'A practical location question when you need a taxi after the train.' },
      chunks: [
        { id: 'takushi-noribawa-doko-desuka-stand', targetText: 'タクシー乗り場は', baseText: { de: 'der Taxistand', en: 'the taxi stand' } },
        { id: 'takushi-noribawa-doko-desuka-location', targetText: 'どこ ですか。', baseText: { de: 'wo ist er?', en: 'where is it?' } },
      ],
      lessonItems: [
        { id: 'takushi-noribawa-doko-desuka-item-takushi', targetText: 'タクシー', baseText: { de: 'Taxi (takushī)', en: 'taxi (takushī)' }, acceptedAnswers: ['タクシー'] },
        { id: 'takushi-noribawa-doko-desuka-item-noriba', targetText: '乗り場', baseText: { de: 'Halte- / Einstiegsplatz (noriba)', en: 'boarding stand (noriba)' }, acceptedAnswers: ['乗り場', 'のりば'] },
        { id: 'takushi-noribawa-doko-desuka-item-takushinoribawa', targetText: 'タクシー乗り場は', baseText: { de: 'Taxistand (takushī noriba wa; mit Themenpartikel)', en: 'taxi stand (takushī noriba wa; with topic particle)' }, acceptedAnswers: ['タクシー乗り場は', 'タクシーのりばは'] },
        { id: 'takushi-noribawa-doko-desuka-item-soto', targetText: '外', baseText: { de: 'draußen (soto)', en: 'outside (soto)' }, acceptedAnswers: ['外', 'そと'] },
      ],
      buildChips: ['タクシー乗り場は', 'どこ ですか。', 'バス乗り場は', 'あそこ です。'],
      typeRecall: {
        before: '', answer: 'タクシー乗り場は', after: ' どこ ですか。',
        acceptedAnswers: japaneseAccepted('タクシー乗り場は', 'タクシーのりばは'),
        fallbackChoices: ['タクシー乗り場は', 'バス乗り場は', '売店は', '案内所は'],
      },
      speakTarget: {
        baseCue: { de: 'Wo ist der Taxistand?', en: 'Where is the taxi stand?' },
        targetPhrase: 'タクシー乗り場は どこ ですか。',
        acceptedAnswers: ['タクシー乗り場は どこ ですか。', 'タクシーのりばは どこ ですか。'],
        requiredTokens: ['タクシー乗り場は', 'どこ', 'ですか。'], optionalTokens: [],
      },
      sceneCaption: { de: 'Im Ausgangsbereich verteilen sich mehrere Verkehrssymbole, doch eines der üblichen Piktogramme fehlt.', en: 'Several transport symbols spread across the exit area, but one of the usual pictograms is absent.' },
      trophyWord: {
        word: 'タクシー乗り場', meaning: { de: 'Taxistand', en: 'taxi stand' }, example: 'タクシー乗り場は 外 です。',
        whyThisWord: { de: 'タクシー乗り場 bezeichnet nicht nur das Fahrzeug, sondern genau den Ort, an dem die Warteschlange beginnt.', en: 'タクシー乗り場 names not just the vehicle but the exact place where the taxi queue begins.' },
      },
      placeholderCaption: { de: 'Bahnhofsausgang mit Symbolen für Bus, Mietwagen und Abholung, aber ohne sichtbares Taxizeichen.', en: 'Station exit with symbols for buses, rentals, and pickup but no visible taxi marker.' },
      songMood: 'lively station exit search',
      visualNotes: 'Japanese station exit concourse, multiple transport pictograms, taxi direction deliberately missing.',
    }),
  },
  {
    slug: 'ekino-higashiguchimade-onegaishimasu',
    title: { de: 'Zum Ostausgang, bitte', en: 'To the east exit, please' },
    situation: {
      de: 'Im Taxi zeigt deine Karte zwei weit auseinanderliegende Bahnhofsausgänge; dein Treffpunkt liegt auf der Ostseite.',
      en: 'In the taxi, your map shows two station exits far apart, and your meeting point is on the east side.',
    },
    pedagogicalGoal: '駅の 東口まで als genaues Fahrziel mit お願いします nennen.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: '駅の 東口まで お願いします。', baseText: { de: 'Zum Ostausgang des Bahnhofs, bitte.', en: 'To the station’s east exit, please.' } },
      meaning: { de: 'Eine genaue Taxi-Zielangabe, die den richtigen Bahnhofsausgang festlegt.', en: 'A precise taxi destination that identifies the correct station exit.' },
      chunks: [
        { id: 'ekino-higashiguchimade-onegaishimasu-destination', targetText: '駅の 東口まで', baseText: { de: 'bis zum Ostausgang des Bahnhofs', en: 'as far as the station’s east exit' } },
        { id: 'ekino-higashiguchimade-onegaishimasu-request', targetText: 'お願いします。', baseText: { de: 'bitte.', en: 'please.' } },
      ],
      lessonItems: [
        { id: 'ekino-higashiguchimade-onegaishimasu-item-ekino', targetText: '駅の', baseText: { de: 'des Bahnhofs (eki no; mit Zugehörigkeitspartikel)', en: 'the station’s (eki no; with possessive particle)' }, acceptedAnswers: ['駅の', 'えきの'] },
        { id: 'ekino-higashiguchimade-onegaishimasu-item-higashiguchi', targetText: '東口', baseText: { de: 'Ostausgang (higashiguchi)', en: 'east exit (higashiguchi)' }, acceptedAnswers: ['東口', 'ひがしぐち'] },
        { id: 'ekino-higashiguchimade-onegaishimasu-item-higashiguchimade', targetText: '東口まで', baseText: { de: 'bis zum Ostausgang (higashiguchi made; mit Zielpartikel)', en: 'to the east exit (higashiguchi made; with destination particle)' }, acceptedAnswers: ['東口まで', 'ひがしぐちまで'] },
        { id: 'ekino-higashiguchimade-onegaishimasu-item-nishiguchi', targetText: '西口', baseText: { de: 'Westausgang (nishiguchi)', en: 'west exit (nishiguchi)' }, acceptedAnswers: ['西口', 'にしぐち'] },
      ],
      buildChips: ['駅の 東口まで', 'お願いします。', '駅の 西口まで', 'ここで'],
      typeRecall: {
        before: '駅の ', answer: '東口まで', after: ' お願いします。',
        acceptedAnswers: japaneseAccepted('東口まで', 'ひがしぐちまで'),
        fallbackChoices: ['東口まで', '西口まで', '改札まで', '空港まで'],
      },
      speakTarget: {
        baseCue: { de: 'Zum Ostausgang des Bahnhofs, bitte.', en: 'To the station’s east exit, please.' },
        targetPhrase: '駅の 東口まで お願いします。',
        acceptedAnswers: ['駅の 東口まで お願いします。', 'えきの ひがしぐちまで おねがいします。'],
        requiredTokens: ['駅の', '東口まで', 'お願いします。'], optionalTokens: [],
      },
      sceneCaption: { de: 'Auf der Taxikarte liegen zwei Bahnhofsausgänge an gegenüberliegenden Seiten, während der Fahrer auf die Zielangabe wartet.', en: 'The taxi map places two station exits on opposite sides while the driver waits for the destination.' },
      trophyWord: {
        word: '東口', meaning: { de: 'Ostausgang', en: 'east exit' }, example: '東口は あちら です。',
        whyThisWord: { de: '東口 verhindert lange Umwege an großen Bahnhöfen, deren Ausgänge mehrere Straßenblöcke auseinanderliegen können.', en: '東口 prevents long detours at large stations whose exits can be several blocks apart.' },
      },
      placeholderCaption: { de: 'Taxinavigation mit einem Bahnhof, zwei weit getrennten Ausgängen und noch offenem Zielpunkt.', en: 'Taxi navigation showing one station, two widely separated exits, and no destination selected yet.' },
      songMood: 'precise taxi destination',
      visualNotes: 'Taxi dashboard map, east and west station exits clearly separated, driver attentive to the passenger’s choice.',
    }),
  },
  {
    slug: 'kono-konbinide-tomete-kudasai',
    title: { de: 'Hier bitte anhalten', en: 'Please stop here' },
    situation: {
      de: 'Das Taxi nähert sich einem hellen Konbini an einer sicheren Haltebucht; dahinter beginnt bereits die nächste Kreuzung.',
      en: 'The taxi approaches a bright convenience store beside a safe pull-in, with the next intersection just beyond it.',
    },
    pedagogicalGoal: 'Die feste Bitte 止めて ください mit einem gut sichtbaren Haltepunkt in あの コンビニで verbinden.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: 'あの コンビニで 止めて ください。', baseText: { de: 'Bitte halten Sie bei dem Konbini dort.', en: 'Please stop at that convenience store.' } },
      meaning: { de: 'Eine höfliche Bitte an den Fahrer, an einem klar erkennbaren sicheren Punkt anzuhalten.', en: 'A polite request for the driver to stop at a clearly visible safe landmark.' },
      chunks: [
        { id: 'kono-konbinide-tomete-kudasai-landmark', targetText: 'あの コンビニで', baseText: { de: 'bei dem Konbini dort', en: 'at that convenience store' } },
        { id: 'kono-konbinide-tomete-kudasai-stop', targetText: '止めて ください。', baseText: { de: 'halten Sie bitte.', en: 'please stop.' } },
      ],
      lessonItems: [
        { id: 'kono-konbinide-tomete-kudasai-item-konbini', targetText: 'コンビニ', baseText: { de: 'Konbini / Convenience-Store (konbini)', en: 'convenience store (konbini)' }, acceptedAnswers: ['コンビニ'] },
        { id: 'kono-konbinide-tomete-kudasai-item-konbinide', targetText: 'コンビニで', baseText: { de: 'beim Konbini (konbini de; mit Ortspartikel)', en: 'at the convenience store (konbini de; with location particle)' }, acceptedAnswers: ['コンビニで'] },
        { id: 'kono-konbinide-tomete-kudasai-item-tomete', targetText: '止めて', baseText: { de: 'anhalten (tomete)', en: 'stop (tomete)' }, acceptedAnswers: ['止めて', 'とめて'] },
        { id: 'kono-konbinide-tomete-kudasai-item-untenshu', targetText: '運転手さん', baseText: { de: 'Fahrer / Fahrerin (untenshu-san)', en: 'driver (untenshu-san)' }, acceptedAnswers: ['運転手さん', 'うんてんしゅさん'] },
      ],
      buildChips: ['あの コンビニで', '止めて ください。', '次の 信号で', '駅前で 待ちます。'],
      typeRecall: {
        before: 'あの ', answer: 'コンビニで', after: ' 止めて ください。',
        acceptedAnswers: japaneseAccepted('コンビニで'),
        fallbackChoices: ['コンビニで', '信号で', '交差点で', '駅前で'],
      },
      speakTarget: {
        baseCue: { de: 'Bitte halten Sie bei dem Konbini dort.', en: 'Please stop at that convenience store.' },
        targetPhrase: 'あの コンビニで 止めて ください。',
        acceptedAnswers: ['あの コンビニで 止めて ください。', 'あの コンビニで とめて ください。', 'あの コンビニで 止めて 下さい。'],
        requiredTokens: ['あの', 'コンビニで', '止めて'], optionalTokens: ['ください。'],
      },
      sceneCaption: { de: 'Vor dem beleuchteten Laden liegt eine freie Haltebucht, während die Kreuzung dahinter schnell näherkommt.', en: 'An open pull-in sits before the lit store while the intersection beyond it approaches quickly.' },
      trophyWord: {
        word: 'コンビニ', meaning: { de: 'Convenience-Store', en: 'convenience store' }, example: 'コンビニは あそこ です。',
        whyThisWord: { de: 'コンビニ ist ein leicht sichtbarer Alltagsort und eignet sich als eindeutiger Orientierungspunkt für Fahrer.', en: 'コンビニ is an easy-to-spot everyday place and works as a clear landmark for a driver.' },
      },
      placeholderCaption: { de: 'Beleuchteter Konbini neben einer freien Haltebucht kurz vor einer Kreuzung.', en: 'Bright convenience store beside an open pull-in just before an intersection.' },
      songMood: 'timely courteous taxi stop',
      visualNotes: 'Night taxi view, convenience-store facade approaching, safe stopping space visible and driver in foreground.',
    }),
  },
  {
    slug: 'shinkansende-kyotoni-ikimasu',
    title: { de: 'Mit dem Shinkansen nach Kyoto', en: 'Taking the Shinkansen to Kyoto' },
    situation: {
      de: 'Am Informationsschalter zeigt die Mitarbeiterin auf Symbole für Bus, Regionalzug und Shinkansen nach Kyoto.',
      en: 'At the information counter, the staff member points to symbols for a bus, local train, and Shinkansen to Kyoto.',
    },
    pedagogicalGoal: '新幹線で als Verkehrsmittel und 京都に als Ziel mit 行きます verbinden.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: '新幹線で 京都に 行きます。', baseText: { de: 'Ich fahre mit dem Shinkansen nach Kyoto.', en: 'I am going to Kyoto by Shinkansen.' } },
      meaning: { de: 'Eine einfache Aussage über Verkehrsmittel und Reiseziel.', en: 'A simple statement combining transport and destination.' },
      chunks: [
        { id: 'shinkansende-kyotoni-ikimasu-transport', targetText: '新幹線で', baseText: { de: 'mit dem Shinkansen', en: 'by Shinkansen' } },
        { id: 'shinkansende-kyotoni-ikimasu-destination', targetText: '京都に', baseText: { de: 'nach Kyoto', en: 'to Kyoto' } },
        { id: 'shinkansende-kyotoni-ikimasu-go', targetText: '行きます。', baseText: { de: 'fahre ich.', en: 'I am going.' } },
      ],
      lessonItems: [
        { id: 'shinkansende-kyotoni-ikimasu-item-shinkansende', targetText: '新幹線で', baseText: { de: 'mit dem Shinkansen (shinkansen de; mit Mittelpartikel)', en: 'by Shinkansen (shinkansen de; with means particle)' }, acceptedAnswers: ['新幹線で', 'しんかんせんで'] },
        { id: 'shinkansende-kyotoni-ikimasu-item-kyoto', targetText: '京都', baseText: { de: 'Kyoto (Kyōto)', en: 'Kyoto (Kyōto)' }, acceptedAnswers: ['京都', 'きょうと'] },
        { id: 'shinkansende-kyotoni-ikimasu-item-kyotoni', targetText: '京都に', baseText: { de: 'nach Kyoto (Kyōto ni; mit Zielpartikel)', en: 'to Kyoto (Kyōto ni; with destination particle)' }, acceptedAnswers: ['京都に', 'きょうとに'] },
        { id: 'shinkansende-kyotoni-ikimasu-item-ikimasu', targetText: '行きます', baseText: { de: 'ich fahre / gehe (ikimasu)', en: 'I go / will go (ikimasu)' }, acceptedAnswers: ['行きます', 'いきます'] },
      ],
      buildChips: ['新幹線で', '京都に', '行きます。', '大阪に', '降ります。'],
      typeRecall: {
        before: '新幹線で ', answer: '京都に', after: ' 行きます。',
        acceptedAnswers: japaneseAccepted('京都に', 'きょうとに'),
        fallbackChoices: ['京都に', '大阪に', '東京に', '奈良に'],
      },
      speakTarget: {
        baseCue: { de: 'Ich fahre mit dem Shinkansen nach Kyoto.', en: 'I am going to Kyoto by Shinkansen.' },
        targetPhrase: '新幹線で 京都に 行きます。',
        acceptedAnswers: ['新幹線で 京都に 行きます。', 'しんかんせんで きょうとに いきます。'],
        requiredTokens: ['新幹線で', '京都に', '行きます。'], optionalTokens: [],
      },
      sceneCaption: { de: 'Drei Verkehrssymbole stehen unter derselben Zielzeile, während der Finger der Mitarbeiterin zwischen ihnen bleibt.', en: 'Three transport symbols sit beneath the same destination row while the staff member’s finger remains between them.' },
      trophyWord: {
        word: '行きます', meaning: { de: 'ich gehe / fahre', en: 'I go / will go' }, example: '新幹線で 京都に 行きます。',
        whyThisWord: { de: '行きます ist das höfliche grundlegende Bewegungswort, mit dem du dein nächstes Ziel klar nennst.', en: '行きます is the basic polite movement word for clearly stating your next destination.' },
      },
      placeholderCaption: { de: 'Informationsanzeige mit Bus-, Regionalzug- und Shinkansen-Symbol unter einer Kyoto-Zeile.', en: 'Information display with bus, local-train, and Shinkansen symbols beneath a Kyoto row.' },
      songMood: 'forward moving rail plan',
      visualNotes: 'Station information desk, three transit options for Kyoto, learner needs to state the chosen mode.',
    }),
  },
  {
    slug: 'kyotomade-donokurai-kakarimasuka',
    title: { de: 'Wie lange bis Kyoto?', en: 'How long to Kyoto?' },
    situation: {
      de: 'Vor der Fahrt zeigt der Reiseplan nur Abfahrts- und Ankunftsspalten, während die Gesamtdauer verdeckt ist.',
      en: 'Before the journey, the itinerary shows departure and arrival columns while the total duration is hidden.',
    },
    pedagogicalGoal: 'どのくらい mit かかりますか als feste Frage nach der Reisedauer verwenden.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: '京都まで どのくらい かかりますか。', baseText: { de: 'Wie lange dauert es bis Kyoto?', en: 'How long does it take to Kyoto?' } },
      meaning: { de: 'Eine kurze Frage nach der Dauer einer Strecke bis zum Ziel.', en: 'A short question about the length of a journey to the destination.' },
      chunks: [
        { id: 'kyotomade-donokurai-kakarimasuka-destination', targetText: '京都まで', baseText: { de: 'bis Kyoto', en: 'as far as Kyoto' } },
        { id: 'kyotomade-donokurai-kakarimasuka-how-long', targetText: 'どのくらい', baseText: { de: 'wie lange', en: 'how long' } },
        { id: 'kyotomade-donokurai-kakarimasuka-take', targetText: 'かかりますか。', baseText: { de: 'dauert es?', en: 'does it take?' } },
      ],
      lessonItems: [
        { id: 'kyotomade-donokurai-kakarimasuka-item-kyotomade', targetText: '京都まで', baseText: { de: 'bis Kyoto (Kyōto made; mit Grenzpartikel)', en: 'to Kyoto (Kyōto made; with endpoint particle)' }, acceptedAnswers: ['京都まで', 'きょうとまで'] },
        { id: 'kyotomade-donokurai-kakarimasuka-item-donokurai', targetText: 'どのくらい', baseText: { de: 'wie lange / wie viel (dono kurai)', en: 'how long / how much (dono kurai)' }, acceptedAnswers: ['どのくらい'] },
        { id: 'kyotomade-donokurai-kakarimasuka-item-jikan', targetText: '時間', baseText: { de: 'Zeit / Stunden (jikan)', en: 'time / hours (jikan)' }, acceptedAnswers: ['時間', 'じかん'] },
        { id: 'kyotomade-donokurai-kakarimasuka-item-kakarimasu', targetText: 'かかります', baseText: { de: 'dauert / kostet (kakarimasu)', en: 'takes / costs (kakarimasu)' }, acceptedAnswers: ['かかります'] },
      ],
      buildChips: ['京都まで', 'どのくらい', 'かかりますか。', '何時に', '行きますか。'],
      typeRecall: {
        before: '京都まで ', answer: 'どのくらい', after: ' かかりますか。',
        acceptedAnswers: japaneseAccepted('どのくらい'),
        fallbackChoices: ['どのくらい', '何時に', 'どの ホーム', '往復で'],
      },
      speakTarget: {
        baseCue: { de: 'Wie lange dauert es bis Kyoto?', en: 'How long does it take to Kyoto?' },
        targetPhrase: '京都まで どのくらい かかりますか。',
        acceptedAnswers: ['京都まで どのくらい かかりますか。', 'きょうとまで どのくらい かかりますか。'],
        requiredTokens: ['京都まで', 'どのくらい', 'かかりますか。'], optionalTokens: [],
      },
      sceneCaption: { de: 'Auf dem Reiseplan sind Start und Ziel lesbar, doch das Feld für die Gesamtdauer bleibt hinter einem Hinweisfenster verborgen.', en: 'The itinerary shows the start and destination, but a notice window covers the total-duration field.' },
      trophyWord: {
        word: 'どのくらい', meaning: { de: 'wie lange / wie viel', en: 'how long / how much' }, example: '駅まで どのくらい かかりますか。',
        whyThisWord: { de: 'どのくらい öffnet eine nützliche Größenfrage und funktioniert besonders gut für Reisezeit und Entfernung.', en: 'どのくらい opens a useful question about amount and works especially well for journey time and distance.' },
      },
      placeholderCaption: { de: 'Digitaler Reiseplan mit sichtbaren Start- und Zielspalten, aber verdeckter Gesamtdauer.', en: 'Digital itinerary with visible departure and arrival columns but a covered total duration.' },
      songMood: 'curious journey timing',
      visualNotes: 'Rail itinerary screen, duration deliberately obscured, departure and destination still readable for context.',
    }),
  },
  {
    slug: 'kono-ekide-orimasu',
    title: { de: 'Hier steige ich aus', en: 'I get off here' },
    situation: {
      de: 'Im Regionalzug erscheint dein Stationsname auf dem Display; deine Sitznachbarin blickt fragend zu dir und deinem Gepäck.',
      en: 'On the local train, your station name appears on the display and the passenger beside you glances at you and your luggage.',
    },
    pedagogicalGoal: 'この 駅で als Ausstiegsort mit dem höflichen Bewegungsverb 降ります verbinden.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: 'この 駅で 降ります。', baseText: { de: 'An diesem Bahnhof steige ich aus.', en: 'I get off at this station.' } },
      meaning: { de: 'Eine klare Aussage, dass diese Station dein Ausstieg ist.', en: 'A clear statement that this station is where you get off.' },
      chunks: [
        { id: 'kono-ekide-orimasu-station', targetText: 'この 駅で', baseText: { de: 'an diesem Bahnhof', en: 'at this station' } },
        { id: 'kono-ekide-orimasu-exit', targetText: '降ります。', baseText: { de: 'steige ich aus.', en: 'I get off.' } },
      ],
      lessonItems: [
        { id: 'kono-ekide-orimasu-item-kono', targetText: 'この', baseText: { de: 'dieser / diese (kono)', en: 'this (kono)' }, acceptedAnswers: ['この'] },
        { id: 'kono-ekide-orimasu-item-ekide', targetText: '駅で', baseText: { de: 'am Bahnhof (eki de; mit Ortspartikel)', en: 'at the station (eki de; with location particle)' }, acceptedAnswers: ['駅で', 'えきで'] },
        { id: 'kono-ekide-orimasu-item-orimasu', targetText: '降ります', baseText: { de: 'ich steige aus (orimasu)', en: 'I get off (orimasu)' }, acceptedAnswers: ['降ります', 'おります'] },
        { id: 'kono-ekide-orimasu-item-deguchi', targetText: '出口', baseText: { de: 'Ausgang (deguchi)', en: 'exit (deguchi)' }, acceptedAnswers: ['出口', 'でぐち'] },
      ],
      buildChips: ['この 駅で', '降ります。', '次の 駅で', '行きます。'],
      typeRecall: {
        before: 'この ', answer: '駅で', after: ' 降ります。',
        acceptedAnswers: japaneseAccepted('駅で', 'えきで'),
        fallbackChoices: ['駅で', '次で', '京都で', 'ホームで'],
      },
      speakTarget: {
        baseCue: { de: 'An diesem Bahnhof steige ich aus.', en: 'I get off at this station.' },
        targetPhrase: 'この 駅で 降ります。',
        acceptedAnswers: ['この 駅で 降ります。', 'この えきで おります。'],
        requiredTokens: ['この', '駅で', '降ります。'], optionalTokens: [],
      },
      sceneCaption: { de: 'Das Wagen-Display zeigt einen Stationsnamen, während offene Karte und blinkende Türleuchte eine schnelle Entscheidung verlangen.', en: 'The carriage display shows a station name while the open map and blinking door light demand a quick decision.' },
      trophyWord: {
        word: '降ります', meaning: { de: 'ich steige aus', en: 'I get off' }, example: 'この 駅で 降ります。',
        whyThisWord: { de: '降ります ist das höfliche Schlüsselverb für den Ausstieg aus Zug, Bus oder Taxi.', en: '降ります is the key polite verb for getting out of a train, bus, or taxi.' },
      },
      placeholderCaption: { de: 'Regionalzug-Display, geöffnete Karte und blinkende Türleuchte kurz vor dem Halt.', en: 'Local-train display, open map, and blinking door light just before the stop.' },
      songMood: 'assured arrival moment',
      visualNotes: 'Inside a Japanese local train, station display and phone map align, doors not yet open.',
    }),
  },
]

export const JAPANESE_A1_PRACTICAL_7_LESSONS: GuidedLessonDefinition[] = makeJapanesePracticalLessons(
  GUIDED_TODAY_PATH_JAPANESE_SEVEN_METADATA,
  japaneseA1Practical7Inputs,
  { de: 'Du hast Japanisch A1 Praxis 7 abgeschlossen.', en: 'You have completed Japanese A1 Practical 7.' },
)

export const GUIDED_TODAY_PATH_JAPANESE_EIGHT_METADATA: GuidedPathMetadata = {
  id: 'japanese-a1-practical-8',
  title: 'Japanese A1 Practical 8',
  shortTitle: 'A1 Practical 8',
  subtitle: { de: 'Zimmer, Empfang und Gästewünsche', en: 'Rooms, reception, and guest needs' },
  level: 'A1',
  baseLanguage: 'German',
  targetLanguage: 'Japanese',
  estimatedMinutes: 5,
}

const japaneseA1Practical8Inputs: JapaneseLessonInput[] = [
  {
    slug: 'ima-chekkuinwo-onegaishimasu',
    title: { de: 'Einchecken', en: 'Checking in' },
    situation: {
      de: 'Am Empfang des Ryokans liegt das Ankunftsbuch offen, und die Mitarbeiterin wartet mit einem Stift auf dein Anliegen.',
      en: 'At the ryokan reception desk, the arrival book is open and the staff member waits with a pen for your request.',
    },
    pedagogicalGoal: 'チェックインを als konkreten Empfangsvorgang mit すみません und お願いします höflich anstoßen.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: 'すみません、 チェックインを お願いします。', baseText: { de: 'Entschuldigung, ich möchte einchecken.', en: 'Excuse me, I would like to check in.' } },
      meaning: { de: 'Eine klare Ankunftsphrase am Empfang eines Hotels oder Ryokans.', en: 'A clear arrival phrase at a hotel or ryokan reception desk.' },
      chunks: [
        { id: 'ima-chekkuinwo-onegaishimasu-attention', targetText: 'すみません、', baseText: { de: 'Entschuldigung,', en: 'Excuse me,' } },
        { id: 'ima-chekkuinwo-onegaishimasu-checkin', targetText: 'チェックインを', baseText: { de: 'den Check-in', en: 'check-in' } },
        { id: 'ima-chekkuinwo-onegaishimasu-request', targetText: 'お願いします。', baseText: { de: 'bitte.', en: 'please.' } },
      ],
      lessonItems: [
        { id: 'ima-chekkuinwo-onegaishimasu-item-ima', targetText: '今', baseText: { de: 'jetzt (ima)', en: 'now (ima)' }, acceptedAnswers: ['今', 'いま'] },
        { id: 'ima-chekkuinwo-onegaishimasu-item-chekkuin', targetText: 'チェックイン', baseText: { de: 'Check-in (chekkuin)', en: 'check-in (chekkuin)' }, acceptedAnswers: ['チェックイン'] },
        { id: 'ima-chekkuinwo-onegaishimasu-item-chekkuinwo', targetText: 'チェックインを', baseText: { de: 'Check-in (chekkuin o; mit Objektpartikel)', en: 'check-in (chekkuin o; with object particle)' }, acceptedAnswers: ['チェックインを'] },
        { id: 'ima-chekkuinwo-onegaishimasu-item-uketsuke', targetText: '受付', baseText: { de: 'Empfang / Rezeption (uketsuke)', en: 'reception desk (uketsuke)' }, acceptedAnswers: ['受付', 'うけつけ'] },
      ],
      buildChips: ['すみません、', 'チェックインを', 'お願いします。', 'チェックアウトを', '部屋は ありますか。'],
      typeRecall: {
        before: 'すみません、 ', answer: 'チェックインを', after: ' お願いします。',
        acceptedAnswers: japaneseAccepted('チェックインを'),
        fallbackChoices: ['チェックインを', 'チェックアウトを', '鍵を', '荷物を'],
      },
      speakTarget: {
        baseCue: { de: 'Entschuldigung, ich möchte einchecken.', en: 'Excuse me, I would like to check in.' },
        targetPhrase: 'すみません、 チェックインを お願いします。',
        acceptedAnswers: ['すみません、 チェックインを お願いします。', 'すみません、 チェックインを おねがいします。'],
        requiredTokens: ['すみません、', 'チェックインを', 'お願いします。'], optionalTokens: [],
      },
      sceneCaption: { de: 'Das offene Ankunftsbuch zeigt mehrere Namenszeilen, während der Stift noch über dem leeren Empfangsfeld ruht.', en: 'The open arrival book shows several name rows while the pen still rests above the blank reception field.' },
      trophyWord: {
        word: 'チェックイン', meaning: { de: 'Check-in', en: 'check-in' }, example: '今、 チェックインを お願いします。',
        whyThisWord: { de: 'チェックイン ist am japanischen Empfang sofort verständlich und benennt genau den Vorgang deiner Ankunft.', en: 'チェックイン is immediately understood at a Japanese reception desk and names the exact arrival process.' },
      },
      placeholderCaption: { de: 'Ryokan-Empfang mit offenem Ankunftsbuch, Stift und noch unbearbeitetem Gästefeld.', en: 'Ryokan reception desk with an open arrival book, pen, and an unprocessed guest row.' },
      songMood: 'welcoming arrival at reception',
      visualNotes: 'Traditional-modern ryokan desk, arrival ledger open, staff attentive, no room key handed over yet.',
    }),
  },
  {
    slug: 'konya-heyawa-arimasuka',
    title: { de: 'Ein Zimmer für heute Nacht', en: 'A room for tonight' },
    situation: {
      de: 'Spät am Abend zeigt die Tafel am Ryokan mehrere Zimmertypen, aber keine freien oder belegten Markierungen.',
      en: 'Late in the evening, the ryokan board shows several room types but no vacancy markings.',
    },
    pedagogicalGoal: '今夜 als Zeitraum setzen und mit 部屋は ありますか nach einem verfügbaren Zimmer fragen.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: '今夜、 部屋は ありますか。', baseText: { de: 'Gibt es für heute Nacht ein Zimmer?', en: 'Is there a room for tonight?' } },
      meaning: { de: 'Eine höfliche spontane Frage nach einer Übernachtungsmöglichkeit.', en: 'A polite walk-in question about a place to stay overnight.' },
      chunks: [
        { id: 'konya-heyawa-arimasuka-tonight', targetText: '今夜、', baseText: { de: 'heute Nacht,', en: 'tonight,' } },
        { id: 'konya-heyawa-arimasuka-room', targetText: '部屋は', baseText: { de: 'ein Zimmer', en: 'a room' } },
        { id: 'konya-heyawa-arimasuka-available', targetText: 'ありますか。', baseText: { de: 'gibt es eines?', en: 'is there one?' } },
      ],
      lessonItems: [
        { id: 'konya-heyawa-arimasuka-item-konya', targetText: '今夜', baseText: { de: 'heute Nacht (kon’ya)', en: 'tonight (kon’ya)' }, acceptedAnswers: ['今夜', 'こんや'] },
        { id: 'konya-heyawa-arimasuka-item-heya', targetText: '部屋', baseText: { de: 'Zimmer (heya)', en: 'room (heya)' }, acceptedAnswers: ['部屋', 'へや'] },
        { id: 'konya-heyawa-arimasuka-item-heyawa', targetText: '部屋は', baseText: { de: 'Zimmer (heya wa; mit Themenpartikel)', en: 'room (heya wa; with topic particle)' }, acceptedAnswers: ['部屋は', 'へやは'] },
        { id: 'konya-heyawa-arimasuka-item-kushitsu', targetText: '空室', baseText: { de: 'freies Zimmer (kūshitsu)', en: 'vacant room (kūshitsu)' }, acceptedAnswers: ['空室', 'くうしつ'] },
      ],
      buildChips: ['今夜、', '部屋は', 'ありますか。', '朝は', '鍵は どこ ですか。'],
      typeRecall: {
        before: '今夜、 ', answer: '部屋は', after: ' ありますか。',
        acceptedAnswers: japaneseAccepted('部屋は', 'へやは'),
        fallbackChoices: ['部屋は', 'お風呂は', '朝ごはんは', '受付は'],
      },
      speakTarget: {
        baseCue: { de: 'Gibt es für heute Nacht ein Zimmer?', en: 'Is there a room for tonight?' },
        targetPhrase: '今夜、 部屋は ありますか。',
        acceptedAnswers: ['今夜、 部屋は ありますか。', 'こんや、 へやは ありますか。'],
        requiredTokens: ['今夜、', '部屋は', 'ありますか。'], optionalTokens: [],
      },
      sceneCaption: { de: 'Auf der Abendstafel stehen mehrere Zimmertypen, doch die Belegungsspalte ist noch abgedeckt.', en: 'Several room types appear on the evening board, but the availability column remains covered.' },
      trophyWord: {
        word: '部屋', meaning: { de: 'Zimmer', en: 'room' }, example: '部屋は こちら です。',
        whyThisWord: { de: '部屋 ist der grundlegende Unterkunftsanker für Verfügbarkeit, Lage und alle späteren Gästewünsche.', en: '部屋 is the basic lodging word for availability, location, and later guest requests.' },
      },
      placeholderCaption: { de: 'Abendliche Ryokan-Tafel mit mehreren Zimmertypen und verdeckter Belegungsspalte.', en: 'Evening ryokan board with several room types and a covered availability column.' },
      songMood: 'hopeful late room inquiry',
      visualNotes: 'Ryokan entrance at night, room board visible, vacancy status intentionally unreadable.',
    }),
  },
  {
    slug: 'kono-heyawa-nangai-desuka',
    title: { de: 'In welchem Stock?', en: 'Which floor?' },
    situation: {
      de: 'Mit dem Zimmerzettel in der Hand bleibst du vor dem Aufzug stehen und wendest dich noch einmal zur Rezeption um.',
      en: 'Room slip in hand, you pause at the elevator and turn back toward the reception desk.',
    },
    pedagogicalGoal: 'この 部屋は als Thema setzen und mit 何階 ですか nach dem Stockwerk fragen.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: 'この 部屋は 何階 ですか。', baseText: { de: 'In welchem Stock ist dieses Zimmer?', en: 'What floor is this room on?' } },
      meaning: { de: 'Eine kurze Frage nach dem Stockwerk deines Zimmers.', en: 'A short question about the floor where your room is located.' },
      chunks: [
        { id: 'kono-heyawa-nangai-desuka-room', targetText: 'この 部屋は', baseText: { de: 'dieses Zimmer', en: 'this room' } },
        { id: 'kono-heyawa-nangai-desuka-floor', targetText: '何階 ですか。', baseText: { de: 'in welchem Stock ist es?', en: 'what floor is it on?' } },
      ],
      lessonItems: [
        { id: 'kono-heyawa-nangai-desuka-item-kono', targetText: 'この', baseText: { de: 'dieser / diese (kono)', en: 'this (kono)' }, acceptedAnswers: ['この'] },
        { id: 'kono-heyawa-nangai-desuka-item-heyawa', targetText: '部屋は', baseText: { de: 'Zimmer (heya wa; mit Themenpartikel)', en: 'room (heya wa; with topic particle)' }, acceptedAnswers: ['部屋は', 'へやは'] },
        { id: 'kono-heyawa-nangai-desuka-item-nangai', targetText: '何階', baseText: { de: 'welcher Stock (nangai)', en: 'what floor (nangai)' }, acceptedAnswers: ['何階', 'なんがい'] },
        { id: 'kono-heyawa-nangai-desuka-item-erebeta', targetText: 'エレベーター', baseText: { de: 'Aufzug (erebētā)', en: 'elevator (erebētā)' }, acceptedAnswers: ['エレベーター'] },
      ],
      buildChips: ['この 部屋は', '何階 ですか。', 'お風呂は', '何時 ですか。'],
      typeRecall: {
        before: 'この 部屋は ', answer: '何階', after: ' ですか。',
        acceptedAnswers: japaneseAccepted('何階', 'なんがい'),
        fallbackChoices: ['何階', '何時', 'どの 部屋', 'どこ'],
      },
      speakTarget: {
        baseCue: { de: 'In welchem Stock ist dieses Zimmer?', en: 'What floor is this room on?' },
        targetPhrase: 'この 部屋は 何階 ですか。',
        acceptedAnswers: ['この 部屋は 何階 ですか。', 'この へやは なんがい ですか。'],
        requiredTokens: ['この', '部屋は', '何階'], optionalTokens: ['ですか。'],
      },
      sceneCaption: { de: 'Der Zimmerzettel zeigt eine Nummer ohne Stockwerk, während im Aufzug alle Tasten gleich dunkel bleiben.', en: 'The room slip shows a number without a floor, while every elevator button remains equally dark.' },
      trophyWord: {
        word: '何階', meaning: { de: 'welcher Stock', en: 'what floor' }, example: 'お風呂は 何階 ですか。',
        whyThisWord: { de: '何階 verbindet die Frage nach einer Zahl direkt mit dem Stockwerk und ist in mehrstöckigen Unterkünften unverzichtbar.', en: '何階 ties a number question directly to a floor and is essential in multi-storey lodging.' },
      },
      placeholderCaption: { de: 'Aufzug mit unbeleuchteten Stockwerktasten und einem Zimmerzettel ohne Etagenangabe.', en: 'Elevator with unlit floor buttons and a room slip that lacks a floor indication.' },
      songMood: 'light elevator orientation',
      visualNotes: 'Ryokan elevator panel, room slip foregrounded, no floor button selected or illuminated.',
    }),
  },
  {
    slug: 'heyano-kagiwo-onegaishimasu',
    title: { de: 'Den Zimmerschlüssel, bitte', en: 'The room key, please' },
    situation: {
      de: 'Am Empfang liegen mehrere beschriftete Schlüsselfächer, und die Mitarbeiterin schaut auf deinen Zimmerzettel.',
      en: 'Several labeled key slots sit behind reception, and the staff member looks at your room slip.',
    },
    pedagogicalGoal: '部屋の 鍵を als eindeutig zugehörigen Gegenstand mit お願いします erbitten.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: '部屋の 鍵を お願いします。', baseText: { de: 'Den Schlüssel für mein Zimmer, bitte.', en: 'My room key, please.' } },
      meaning: { de: 'Eine eindeutige Bitte um den Schlüssel, der zu deinem Zimmer gehört.', en: 'A clear request for the key that belongs to your room.' },
      chunks: [
        { id: 'heyano-kagiwo-onegaishimasu-key', targetText: '部屋の 鍵を', baseText: { de: 'den Zimmerschlüssel', en: 'the room key' } },
        { id: 'heyano-kagiwo-onegaishimasu-request', targetText: 'お願いします。', baseText: { de: 'bitte.', en: 'please.' } },
      ],
      lessonItems: [
        { id: 'heyano-kagiwo-onegaishimasu-item-heyano', targetText: '部屋の', baseText: { de: 'des Zimmers (heya no; mit Zugehörigkeitspartikel)', en: 'the room’s (heya no; with possessive particle)' }, acceptedAnswers: ['部屋の', 'へやの'] },
        { id: 'heyano-kagiwo-onegaishimasu-item-kagi', targetText: '鍵', baseText: { de: 'Schlüssel (kagi)', en: 'key (kagi)' }, acceptedAnswers: ['鍵', 'かぎ'] },
        { id: 'heyano-kagiwo-onegaishimasu-item-kagiwo', targetText: '鍵を', baseText: { de: 'Schlüssel (kagi o; mit Objektpartikel)', en: 'key (kagi o; with object particle)' }, acceptedAnswers: ['鍵を', 'かぎを'] },
        { id: 'heyano-kagiwo-onegaishimasu-item-kadoki', targetText: 'カードキー', baseText: { de: 'Schlüsselkarte (kādo kī)', en: 'key card (kādo kī)' }, acceptedAnswers: ['カードキー'] },
      ],
      buildChips: ['部屋の 鍵を', 'お願いします。', 'カードキーを', 'パスワードを'],
      typeRecall: {
        before: '部屋の ', answer: '鍵を', after: ' お願いします。',
        acceptedAnswers: japaneseAccepted('鍵を', 'かぎを'),
        fallbackChoices: ['鍵を', 'タオルを', 'アラームを', '朝ごはんを'],
      },
      speakTarget: {
        baseCue: { de: 'Den Schlüssel für mein Zimmer, bitte.', en: 'My room key, please.' },
        targetPhrase: '部屋の 鍵を お願いします。',
        acceptedAnswers: ['部屋の 鍵を お願いします。', 'へやの かぎを おねがいします。'],
        requiredTokens: ['部屋の', '鍵を', 'お願いします。'], optionalTokens: [],
      },
      sceneCaption: { de: 'Hinter dem Tresen sind mehrere Schlüsselfächer gefüllt, während dein Zimmerzettel neben der Hand der Mitarbeiterin liegt.', en: 'Several key slots are filled behind the desk while your room slip rests beside the staff member’s hand.' },
      trophyWord: {
        word: '鍵', meaning: { de: 'Schlüssel', en: 'key' }, example: '部屋の 鍵を お願いします。',
        whyThisWord: { de: '鍵 ist der konkrete Gegenstand für Zimmerzugang und lässt sich mit 部屋の eindeutig zuordnen.', en: '鍵 is the concrete object for room access and pairs with 部屋の to identify it clearly.' },
      },
      placeholderCaption: { de: 'Empfangstresen vor mehreren gefüllten Schlüsselfächern und einem einzelnen Zimmerzettel.', en: 'Reception counter before several filled key slots and one room slip.' },
      songMood: 'neat key handover request',
      visualNotes: 'Reception key cubbies, room slip visible, staff has not yet selected a key.',
    }),
  },
  {
    slug: 'sumimasen-pasuwadowo-onegaishimasu',
    title: { de: 'Das Passwort, bitte', en: 'The password, please' },
    situation: {
      de: 'An der Rezeption zeigst du dein Handy mit dem gesicherten Hausnetzwerk; auf den Informationskarten fehlt der Zugangscode.',
      en: 'At reception, you show your phone with the secured network while the information cards lack the access code.',
    },
    pedagogicalGoal: 'パスワードを als konkreten digitalen Zugang mit すみません und お願いします erfragen.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: 'すみません、 ワイファイの パスワードを お願いします。', baseText: { de: 'Entschuldigung, das WLAN-Passwort bitte.', en: 'Excuse me, the Wi-Fi password please.' } },
      meaning: { de: 'Eine kurze höfliche Bitte um den Netzwerkzugangscode.', en: 'A short polite request for the network access code.' },
      chunks: [
        { id: 'sumimasen-pasuwadowo-onegaishimasu-attention', targetText: 'すみません、', baseText: { de: 'Entschuldigung,', en: 'Excuse me,' } },
        { id: 'sumimasen-pasuwadowo-onegaishimasu-password', targetText: 'ワイファイの パスワードを', baseText: { de: 'das WLAN-Passwort', en: 'the Wi-Fi password' } },
        { id: 'sumimasen-pasuwadowo-onegaishimasu-request', targetText: 'お願いします。', baseText: { de: 'bitte.', en: 'please.' } },
      ],
      lessonItems: [
        { id: 'sumimasen-pasuwadowo-onegaishimasu-item-waifai', targetText: 'ワイファイ', baseText: { de: 'WLAN (waifai)', en: 'Wi-Fi (waifai)' }, acceptedAnswers: ['ワイファイ'] },
        { id: 'sumimasen-pasuwadowo-onegaishimasu-item-pasuwado', targetText: 'パスワード', baseText: { de: 'Passwort (pasuwādo)', en: 'password (pasuwādo)' }, acceptedAnswers: ['パスワード'] },
        { id: 'sumimasen-pasuwadowo-onegaishimasu-item-pasuwadowo', targetText: 'パスワードを', baseText: { de: 'Passwort (pasuwādo o; mit Objektpartikel)', en: 'password (pasuwādo o; with object particle)' }, acceptedAnswers: ['パスワードを'] },
        { id: 'sumimasen-pasuwadowo-onegaishimasu-item-intanetto', targetText: 'インターネット', baseText: { de: 'Internet (intānetto)', en: 'internet (intānetto)' }, acceptedAnswers: ['インターネット'] },
        { id: 'sumimasen-pasuwadowo-onegaishimasu-item-kami', targetText: '紙', baseText: { de: 'Papier (kami)', en: 'paper (kami)' }, acceptedAnswers: ['紙', 'かみ'] },
      ],
      buildChips: ['すみません、', 'ワイファイの パスワードを', 'お願いします。', '部屋番号を', '鍵を お願いします。'],
      typeRecall: {
        before: 'すみません、 ワイファイの ', answer: 'パスワードを', after: ' お願いします。',
        acceptedAnswers: japaneseAccepted('パスワードを'),
        fallbackChoices: ['パスワードを', '地図を', '紙を', '住所を'],
      },
      speakTarget: {
        baseCue: { de: 'Entschuldigung, das WLAN-Passwort bitte.', en: 'Excuse me, the Wi-Fi password please.' },
        targetPhrase: 'すみません、 ワイファイの パスワードを お願いします。',
        acceptedAnswers: ['すみません、 ワイファイの パスワードを お願いします。', 'すみません、 ワイファイの パスワードを おねがいします。'],
        requiredTokens: ['すみません、', 'パスワードを', 'お願いします。'], optionalTokens: [],
      },
      sceneCaption: { de: 'Das Handy zeigt ein gesichertes Hausnetzwerk, während drei Informationskarten ohne Zugangscode auf dem Tisch liegen.', en: 'The phone shows a secured property network while three information cards on the table contain no access code.' },
      trophyWord: {
        word: 'パスワード', meaning: { de: 'Passwort', en: 'password' }, example: 'パスワードは これ です。',
        whyThisWord: { de: 'パスワード ist der eindeutige Lehnwortanker für den Zugangscode und vermeidet technische Zusatzsprache.', en: 'パスワード is the clear loanword anchor for an access code and avoids extra technical language.' },
      },
      placeholderCaption: { de: 'Handy mit gesichertem Netzwerk neben mehreren Infokarten ohne sichtbaren Zugangscode.', en: 'Phone showing a secured network beside several information cards with no visible access code.' },
      songMood: 'quiet connected guest need',
      visualNotes: 'Guest room desk, phone network panel, printed information cards present but password absent.',
    }),
  },
  {
    slug: 'ofuro-wa-doko-desuka',
    title: { de: 'Wo ist das Bad?', en: 'Where is the bath?' },
    situation: {
      de: 'Im Ryokan-Flur führen zwei Vorhänge in verschiedene Richtungen; eine Mitarbeiterin kommt dir mit frischer Wäsche entgegen.',
      en: 'In the ryokan hallway, two curtains lead in different directions as a staff member approaches carrying fresh linens.',
    },
    pedagogicalGoal: 'お風呂は als gesuchten Gästebereich mit どこ ですか lokalisieren.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: 'お風呂は どこ ですか。', baseText: { de: 'Wo ist das Bad?', en: 'Where is the bath?' } },
      meaning: { de: 'Eine höfliche Frage nach dem Bad oder Badebereich der Unterkunft.', en: 'A polite question about the lodging’s bath or bathing area.' },
      chunks: [
        { id: 'ofuro-wa-doko-desuka-bath', targetText: 'お風呂は', baseText: { de: 'das Bad', en: 'the bath' } },
        { id: 'ofuro-wa-doko-desuka-where', targetText: 'どこ ですか。', baseText: { de: 'wo ist es?', en: 'where is it?' } },
      ],
      lessonItems: [
        { id: 'ofuro-wa-doko-desuka-item-ofuro', targetText: 'お風呂', baseText: { de: 'Bad / Badewanne (ofuro)', en: 'bath / bathtub (ofuro)' }, acceptedAnswers: ['お風呂', 'おふろ'] },
        { id: 'ofuro-wa-doko-desuka-item-ofurowa', targetText: 'お風呂は', baseText: { de: 'Bad (ofuro wa; mit Themenpartikel)', en: 'bath (ofuro wa; with topic particle)' }, acceptedAnswers: ['お風呂は', 'おふろは'] },
        { id: 'ofuro-wa-doko-desuka-item-yukata', targetText: '浴衣', baseText: { de: 'leichter Baumwollkimono (yukata)', en: 'light cotton robe (yukata)' }, acceptedAnswers: ['浴衣', 'ゆかた'] },
        { id: 'ofuro-wa-doko-desuka-item-roka', targetText: '廊下', baseText: { de: 'Flur (rōka)', en: 'hallway (rōka)' }, acceptedAnswers: ['廊下', 'ろうか'] },
      ],
      buildChips: ['お風呂は', 'どこ ですか。', '食堂は', 'こちら です。'],
      typeRecall: {
        before: '', answer: 'お風呂は', after: ' どこ ですか。',
        acceptedAnswers: japaneseAccepted('お風呂は', 'おふろは'),
        fallbackChoices: ['お風呂は', '浴衣は', '洗面所は', '階段は'],
      },
      speakTarget: {
        baseCue: { de: 'Wo ist das Bad?', en: 'Where is the bath?' },
        targetPhrase: 'お風呂は どこ ですか。',
        acceptedAnswers: ['お風呂は どこ ですか。', 'おふろは どこ ですか。'],
        requiredTokens: ['お風呂は', 'どこ', 'ですか。'], optionalTokens: [],
      },
      sceneCaption: { de: 'Mehrere Holzschilder hängen zwischen zwei Fluren, während das übliche Badsymbol nirgends klar zu sehen ist.', en: 'Several wooden signs hang between two corridors while the usual bath symbol is nowhere clearly visible.' },
      trophyWord: {
        word: 'お風呂', meaning: { de: 'Bad / Badebereich', en: 'bath / bathing area' }, example: 'お風呂は こちら です。',
        whyThisWord: { de: 'お風呂 bezeichnet in einer Unterkunft sowohl das Bad als auch den gemeinschaftlichen Badebereich.', en: 'お風呂 can refer to either a bath or the shared bathing area in a lodging.' },
      },
      placeholderCaption: { de: 'Ryokan-Flur mit zwei Abzweigungen, Holzschildern und keinem eindeutig erkennbaren Badsymbol.', en: 'Ryokan hallway with two branches, wooden signs, and no clearly recognizable bath symbol.' },
      songMood: 'soft ryokan hallway search',
      visualNotes: 'Traditional inn corridor, noren curtains and wooden signs, bath route intentionally ambiguous.',
    }),
  },
  {
    slug: 'sumimasen-taoruwo-onegaishimasu',
    title: { de: 'Ein Handtuch, bitte', en: 'A towel, please' },
    situation: {
      de: 'Vor dem Badebereich ist das Gästefach leer, während hinter dem Empfang mehrere Wäschestapel sichtbar sind.',
      en: 'Outside the bathing area, the guest shelf is empty while several linen stacks are visible behind reception.',
    },
    pedagogicalGoal: 'タオルを als konkreten fehlenden Gästeartikel mit einer höflichen Bitte nennen.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: 'すみません、 タオルを お願いします。', baseText: { de: 'Entschuldigung, ein Handtuch bitte.', en: 'Excuse me, a towel please.' } },
      meaning: { de: 'Eine kurze Bitte um ein fehlendes Handtuch am Empfang oder Badebereich.', en: 'A short request for a missing towel at reception or the bathing area.' },
      chunks: [
        { id: 'sumimasen-taoruwo-onegaishimasu-attention', targetText: 'すみません、', baseText: { de: 'Entschuldigung,', en: 'Excuse me,' } },
        { id: 'sumimasen-taoruwo-onegaishimasu-towel', targetText: 'タオルを', baseText: { de: 'ein Handtuch', en: 'a towel' } },
        { id: 'sumimasen-taoruwo-onegaishimasu-request', targetText: 'お願いします。', baseText: { de: 'bitte.', en: 'please.' } },
      ],
      lessonItems: [
        { id: 'sumimasen-taoruwo-onegaishimasu-item-taoru', targetText: 'タオル', baseText: { de: 'Handtuch (taoru)', en: 'towel (taoru)' }, acceptedAnswers: ['タオル'] },
        { id: 'sumimasen-taoruwo-onegaishimasu-item-taoruwo', targetText: 'タオルを', baseText: { de: 'Handtuch (taoru o; mit Objektpartikel)', en: 'towel (taoru o; with object particle)' }, acceptedAnswers: ['タオルを'] },
        { id: 'sumimasen-taoruwo-onegaishimasu-item-basutaoru', targetText: 'バスタオル', baseText: { de: 'Badetuch (basu taoru)', en: 'bath towel (basu taoru)' }, acceptedAnswers: ['バスタオル'] },
        { id: 'sumimasen-taoruwo-onegaishimasu-item-senmenjo', targetText: '洗面所', baseText: { de: 'Waschraum (senmenjo)', en: 'washroom (senmenjo)' }, acceptedAnswers: ['洗面所', 'せんめんじょ'] },
      ],
      buildChips: ['すみません、', 'タオルを', 'お願いします。', 'シーツを', '鍵を 返します。'],
      typeRecall: {
        before: 'すみません、 ', answer: 'タオルを', after: ' お願いします。',
        acceptedAnswers: japaneseAccepted('タオルを'),
        fallbackChoices: ['タオルを', '浴衣を', '枕を', '毛布を'],
      },
      speakTarget: {
        baseCue: { de: 'Entschuldigung, ein Handtuch bitte.', en: 'Excuse me, a towel please.' },
        targetPhrase: 'すみません、 タオルを お願いします。',
        acceptedAnswers: ['すみません、 タオルを お願いします。', 'すみません、 タオルを おねがいします。'],
        requiredTokens: ['すみません、', 'タオルを', 'お願いします。'], optionalTokens: [],
      },
      sceneCaption: { de: 'Das offene Gästefach ist leer, während hinter dem besetzten Tresen verschiedene Wäschestapel liegen.', en: 'The open guest shelf is empty while different linen stacks sit behind the staffed counter.' },
      trophyWord: {
        word: 'タオル', meaning: { de: 'Handtuch', en: 'towel' }, example: 'タオルを お願いします。',
        whyThisWord: { de: 'タオル ist ein leicht erkennbares Lehnwort und löst einen häufigen kleinen Gästewunsch sofort.', en: 'タオル is an easy-to-recognize loanword that solves a common small guest need immediately.' },
      },
      placeholderCaption: { de: 'Leeres Gästefach vor einem Empfang mit getrennten Stapeln aus Handtüchern, Yukata und Bettwäsche.', en: 'Empty guest shelf before reception with separate stacks of towels, robes, and bedding.' },
      songMood: 'gentle practical linen request',
      visualNotes: 'Bath-area guest shelf empty, reception linen stacks visible, no towel already supplied.',
    }),
  },
  {
    slug: 'kyowa-arigato-oyasuminasai',
    title: { de: 'Danke und gute Nacht', en: 'Thank you and good night' },
    situation: {
      de: 'Nach der letzten Auskunft des Abends steht die Mitarbeiterin noch am Empfang, während du dich zum Zimmerflur wendest.',
      en: 'After the final help of the evening, the staff member remains at reception as you turn toward the guest-room corridor.',
    },
    pedagogicalGoal: 'いろいろ als Sammeldank mit おやすみなさい zu einem warmen Abendabschluss verbinden.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: 'いろいろ ありがとうございます。 おやすみなさい。', baseText: { de: 'Vielen Dank für alles. Gute Nacht.', en: 'Thank you for everything. Good night.' } },
      meaning: { de: 'Ein höflicher Dank für die Hilfe des Tages mit passendem Nachtgruß.', en: 'Polite thanks for the day’s help followed by an appropriate nighttime farewell.' },
      chunks: [
        { id: 'kyowa-arigato-oyasuminasai-various', targetText: 'いろいろ', baseText: { de: 'für all die Hilfe', en: 'for all the help' } },
        { id: 'kyowa-arigato-oyasuminasai-thanks', targetText: 'ありがとうございます。', baseText: { de: 'vielen Dank.', en: 'thank you very much.' } },
        { id: 'kyowa-arigato-oyasuminasai-night', targetText: 'おやすみなさい。', baseText: { de: 'Gute Nacht.', en: 'Good night.' } },
      ],
      lessonItems: [
        { id: 'kyowa-arigato-oyasuminasai-item-kyo', targetText: '今日', baseText: { de: 'heute (kyō)', en: 'today (kyō)' }, acceptedAnswers: ['今日', 'きょう'] },
        { id: 'kyowa-arigato-oyasuminasai-item-iroiro', targetText: 'いろいろ', baseText: { de: 'verschiedenes / allerlei (iroiro)', en: 'various things (iroiro)' }, acceptedAnswers: ['いろいろ'] },
        { id: 'kyowa-arigato-oyasuminasai-item-arigato', targetText: 'ありがとうございます', baseText: { de: 'vielen Dank (arigatō gozaimasu)', en: 'thank you very much (arigatō gozaimasu)' }, acceptedAnswers: ['ありがとうございます'] },
        { id: 'kyowa-arigato-oyasuminasai-item-oyasumi', targetText: 'おやすみなさい', baseText: { de: 'gute Nacht (oyasuminasai)', en: 'good night (oyasuminasai)' }, acceptedAnswers: ['おやすみなさい'] },
      ],
      buildChips: ['いろいろ', 'ありがとうございます。', 'おやすみなさい。', '夕食は', 'こんばんは。'],
      typeRecall: {
        before: '', answer: 'いろいろ', after: ' ありがとうございます。 おやすみなさい。',
        acceptedAnswers: japaneseAccepted('いろいろ'),
        fallbackChoices: ['いろいろ', '一つ', '少し', 'まだ'],
      },
      speakTarget: {
        baseCue: { de: 'Vielen Dank für alles. Gute Nacht.', en: 'Thank you for everything. Good night.' },
        targetPhrase: 'いろいろ ありがとうございます。 おやすみなさい。',
        acceptedAnswers: ['いろいろ ありがとうございます。 おやすみなさい。'],
        requiredTokens: ['いろいろ', 'ありがとうございます。', 'おやすみなさい。'], optionalTokens: [],
      },
      sceneCaption: { de: 'Der ruhige Empfang bleibt besetzt, während der beleuchtete Zimmerflur hinter dir auf den Abendabschluss wartet.', en: 'The quiet reception desk remains staffed while the lit guest corridor behind you waits for the evening to close.' },
      trophyWord: {
        word: 'おやすみなさい', meaning: { de: 'Gute Nacht', en: 'good night' }, example: 'では、 おやすみなさい。',
        whyThisWord: { de: 'おやすみなさい ist der höfliche Nachtgruß an Personal, Gastgeber oder andere Gäste.', en: 'おやすみなさい is the polite nighttime farewell for staff, hosts, or fellow guests.' },
      },
      placeholderCaption: { de: 'Ruhiger Ryokan-Empfang am späten Abend mit beleuchtetem Zimmerflur im Hintergrund.', en: 'Quiet ryokan reception late at night with the guest corridor lit in the background.' },
      songMood: 'warm grateful night farewell',
      visualNotes: 'Late ryokan lobby, staff at desk, traveler turning toward rooms, calm respectful distance.',
    }),
  },
  {
    slug: 'asagohanwa-nanji-desuka',
    title: { de: 'Wann gibt es Frühstück?', en: 'What time is breakfast?' },
    situation: {
      de: 'An der Rezeption zeigst du die Frühstückskarte aus deinem Zimmer, auf der die Uhrzeit fehlt.',
      en: 'At reception, you hold up the breakfast card from your room, which is missing the time.',
    },
    pedagogicalGoal: '朝ごはんは als Tagesmahlzeit mit 何時 ですか nach ihrer Uhrzeit erfragen.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: '朝ごはんは 何時 ですか。', baseText: { de: 'Um wie viel Uhr ist das Frühstück?', en: 'What time is breakfast?' } },
      meaning: { de: 'Eine einfache Frage nach der Frühstückszeit in der Unterkunft.', en: 'A simple question about breakfast time at the lodging.' },
      chunks: [
        { id: 'asagohanwa-nanji-desuka-breakfast', targetText: '朝ごはんは', baseText: { de: 'das Frühstück', en: 'breakfast' } },
        { id: 'asagohanwa-nanji-desuka-time', targetText: '何時 ですか。', baseText: { de: 'um wie viel Uhr ist es?', en: 'what time is it?' } },
      ],
      lessonItems: [
        { id: 'asagohanwa-nanji-desuka-item-asagohan', targetText: '朝ごはん', baseText: { de: 'Frühstück (asagohan)', en: 'breakfast (asagohan)' }, acceptedAnswers: ['朝ごはん', 'あさごはん'] },
        { id: 'asagohanwa-nanji-desuka-item-asagohanwa', targetText: '朝ごはんは', baseText: { de: 'Frühstück (asagohan wa; mit Themenpartikel)', en: 'breakfast (asagohan wa; with topic particle)' }, acceptedAnswers: ['朝ごはんは', 'あさごはんは'] },
        { id: 'asagohanwa-nanji-desuka-item-nanji', targetText: '何時', baseText: { de: 'welche Uhrzeit (nanji)', en: 'what time (nanji)' }, acceptedAnswers: ['何時', 'なんじ'] },
        { id: 'asagohanwa-nanji-desuka-item-shokudo', targetText: '食堂', baseText: { de: 'Speisesaal (shokudō)', en: 'dining hall (shokudō)' }, acceptedAnswers: ['食堂', 'しょくどう'] },
      ],
      buildChips: ['朝ごはんは', '何時 ですか。', '夕ごはんは', '食堂は こちら です。'],
      typeRecall: {
        before: '', answer: '朝ごはんは', after: ' 何時 ですか。',
        acceptedAnswers: japaneseAccepted('朝ごはんは', 'あさごはんは'),
        fallbackChoices: ['朝ごはんは', '昼ごはんは', '夜ごはんは', 'テレビは'],
      },
      speakTarget: {
        baseCue: { de: 'Um wie viel Uhr ist das Frühstück?', en: 'What time is breakfast?' },
        targetPhrase: '朝ごはんは 何時 ですか。',
        acceptedAnswers: ['朝ごはんは 何時 ですか。', 'あさごはんは なんじ ですか。'],
        requiredTokens: ['朝ごはんは', '何時', 'ですか。'], optionalTokens: [],
      },
      sceneCaption: { de: 'Zwischen drei Gästekarten bleibt auf der Frühstückskarte genau das kleine Zeitfeld leer.', en: 'Among three guest information cards, the small time field on the breakfast card is the only blank.' },
      trophyWord: {
        word: '朝ごはん', meaning: { de: 'Frühstück', en: 'breakfast' }, example: '朝ごはんは 七時 です。',
        whyThisWord: { de: '朝ごはん ist das alltagstaugliche Wort für Frühstück und verbindet die Mahlzeit direkt mit Zeit- oder Ortsfragen.', en: '朝ごはん is the everyday word for breakfast and connects the meal directly to time or location questions.' },
      },
      placeholderCaption: { de: 'Drei Gästekarten auf einem Tatami-Tisch, die Frühstückskarte mit leerem Uhrzeitfeld.', en: 'Three guest cards on a tatami table, with the breakfast card’s time field blank.' },
      songMood: 'fresh morning planning',
      visualNotes: 'Guest information cards for breakfast, bath, and departure, only breakfast time missing.',
    }),
  },
  {
    slug: 'ima-chekkuautowo-onegaishimasu',
    title: { de: 'Auschecken', en: 'Checking out' },
    situation: {
      de: 'Am Morgen stehen dein Gepäck und der Zimmerschlüssel auf dem Empfangstresen, während die Mitarbeiterin den Computer öffnet.',
      en: 'In the morning, your luggage and room key sit on the reception counter while the staff member opens the computer.',
    },
    pedagogicalGoal: 'チェックアウトを mit すみません und お願いします als höflichen Abschluss des Aufenthalts formulieren.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: 'すみません、 チェックアウトを お願いします。', baseText: { de: 'Entschuldigung, ich möchte auschecken.', en: 'Excuse me, I would like to check out.' } },
      meaning: { de: 'Eine klare Abreisephrase am Empfang mit sofortigem Zeitbezug.', en: 'A clear departure phrase at reception with an immediate time reference.' },
      chunks: [
        { id: 'ima-chekkuautowo-onegaishimasu-attention', targetText: 'すみません、', baseText: { de: 'Entschuldigung,', en: 'Excuse me,' } },
        { id: 'ima-chekkuautowo-onegaishimasu-checkout', targetText: 'チェックアウトを', baseText: { de: 'den Check-out', en: 'check-out' } },
        { id: 'ima-chekkuautowo-onegaishimasu-request', targetText: 'お願いします。', baseText: { de: 'bitte.', en: 'please.' } },
      ],
      lessonItems: [
        { id: 'ima-chekkuautowo-onegaishimasu-item-ima', targetText: '今', baseText: { de: 'jetzt (ima)', en: 'now (ima)' }, acceptedAnswers: ['今', 'いま'] },
        { id: 'ima-chekkuautowo-onegaishimasu-item-chekkuauto', targetText: 'チェックアウト', baseText: { de: 'Check-out (chekkuauto)', en: 'check-out (chekkuauto)' }, acceptedAnswers: ['チェックアウト'] },
        { id: 'ima-chekkuautowo-onegaishimasu-item-chekkuautowo', targetText: 'チェックアウトを', baseText: { de: 'Check-out (chekkuauto o; mit Objektpartikel)', en: 'check-out (chekkuauto o; with object particle)' }, acceptedAnswers: ['チェックアウトを'] },
        { id: 'ima-chekkuautowo-onegaishimasu-item-nimotsu', targetText: '荷物', baseText: { de: 'Gepäck (nimotsu)', en: 'luggage (nimotsu)' }, acceptedAnswers: ['荷物', 'にもつ'] },
      ],
      buildChips: ['すみません、', 'チェックアウトを', 'お願いします。', 'チェックインを', '部屋を お願いします。'],
      typeRecall: {
        before: 'すみません、 ', answer: 'チェックアウトを', after: ' お願いします。',
        acceptedAnswers: japaneseAccepted('チェックアウトを'),
        fallbackChoices: ['チェックアウトを', 'パスポートを', 'スーツケースを', 'ドアを'],
      },
      speakTarget: {
        baseCue: { de: 'Entschuldigung, ich möchte auschecken.', en: 'Excuse me, I would like to check out.' },
        targetPhrase: 'すみません、 チェックアウトを お願いします。',
        acceptedAnswers: ['すみません、 チェックアウトを お願いします。', 'すみません、 チェックアウトを おねがいします。'],
        requiredTokens: ['すみません、', 'チェックアウトを', 'お願いします。'], optionalTokens: [],
      },
      sceneCaption: { de: 'Gepäck und Zimmerschlüssel liegen nebeneinander auf dem Tresen, während der Empfangsbildschirm gerade erst aufleuchtet.', en: 'Luggage and the room key sit side by side on the counter while the reception screen has only just lit up.' },
      trophyWord: {
        word: 'チェックアウト', meaning: { de: 'Check-out', en: 'check-out' }, example: 'チェックアウトを お願いします。',
        whyThisWord: { de: 'チェックアウト benennt den Abreisevorgang eindeutig und passt direkt zu Schlüsselrückgabe und Gepäck.', en: 'チェックアウト names the departure process clearly and fits the moment of returning a key and gathering luggage.' },
      },
      placeholderCaption: { de: 'Morgendlicher Empfangstresen mit Gepäck, Zimmerschlüssel und frisch geöffnetem Computer.', en: 'Morning reception counter with luggage, room key, and a newly opened computer.' },
      songMood: 'tidy morning departure',
      visualNotes: 'Ryokan checkout desk, luggage ready and key returned, staff preparing the departure record.',
    }),
  },
]

export const JAPANESE_A1_PRACTICAL_8_LESSONS: GuidedLessonDefinition[] = makeJapanesePracticalLessons(
  GUIDED_TODAY_PATH_JAPANESE_EIGHT_METADATA,
  japaneseA1Practical8Inputs,
  { de: 'Du hast Japanisch A1 Praxis 8 abgeschlossen.', en: 'You have completed Japanese A1 Practical 8.' },
)

export const GUIDED_TODAY_PATH_JAPANESE_NINE_METADATA: GuidedPathMetadata = {
  id: 'japanese-a1-practical-9',
  title: 'Japanese A1 Practical 9',
  shortTitle: 'A1 Practical 9',
  subtitle: { de: 'Wiedersehen und einfache Pläne', en: 'Meeting again and making simple plans' },
  level: 'A1',
  baseLanguage: 'German',
  targetLanguage: 'Japanese',
  estimatedMinutes: 5,
}

const japaneseA1Practical9Inputs: JapaneseLessonInput[] = [
  {
    slug: 'konnichiwa-kyomo-yoroshiku-onegaishimasu',
    title: { de: 'Heute wieder zusammen', en: 'Together again today' },
    situation: {
      de: 'Beim zweiten Treffen des Sprachabends sitzt dieselbe kleine Gruppe wieder am Tisch und wartet auf die neue Begrüßung.',
      en: 'At the second language-exchange gathering, the same small group is back at the table and waits for a new greeting.',
    },
    pedagogicalGoal: '今日も als Rahmen für ein erneutes Treffen mit こんにちは und よろしく お願いします verbinden.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: 'こんにちは。 今日も よろしく お願いします。', baseText: { de: 'Guten Tag. Auch heute freue ich mich auf unser Treffen.', en: 'Hello. I’m looking forward to today’s session too.' } },
      meaning: { de: 'Eine freundliche erneute Begrüßung für eine Gruppe, die du schon kennst.', en: 'A friendly returning greeting for a group you have already met.' },
      chunks: [
        { id: 'konnichiwa-kyomo-yoroshiku-onegaishimasu-hello', targetText: 'こんにちは。', baseText: { de: 'Guten Tag.', en: 'Hello.' } },
        { id: 'konnichiwa-kyomo-yoroshiku-onegaishimasu-today', targetText: '今日も', baseText: { de: 'auch heute', en: 'today as well' } },
        { id: 'konnichiwa-kyomo-yoroshiku-onegaishimasu-request', targetText: 'よろしく お願いします。', baseText: { de: 'ich freue mich auf unser Miteinander.', en: 'I look forward to our time together.' } },
      ],
      lessonItems: [
        { id: 'konnichiwa-kyomo-yoroshiku-onegaishimasu-item-konnichiwa', targetText: 'こんにちは', baseText: { de: 'guten Tag (konnichiwa)', en: 'hello / good day (konnichiwa)' }, acceptedAnswers: ['こんにちは'] },
        { id: 'konnichiwa-kyomo-yoroshiku-onegaishimasu-item-kyo', targetText: '今日', baseText: { de: 'heute (kyō)', en: 'today (kyō)' }, acceptedAnswers: ['今日', 'きょう'] },
        { id: 'konnichiwa-kyomo-yoroshiku-onegaishimasu-item-kyomo', targetText: '今日も', baseText: { de: 'auch heute (kyō mo; mit Zusatzpartikel)', en: 'today as well (kyō mo; with additive particle)' }, acceptedAnswers: ['今日も', 'きょうも'] },
        { id: 'konnichiwa-kyomo-yoroshiku-onegaishimasu-item-yoroshiku', targetText: 'よろしく', baseText: { de: 'auf gute Zusammenarbeit (yoroshiku)', en: 'kindly / with goodwill (yoroshiku)' }, acceptedAnswers: ['よろしく'] },
      ],
      buildChips: ['こんにちは。', '今日も', 'よろしく お願いします。', '今週も', 'ありがとうございます。'],
      typeRecall: {
        before: 'こんにちは。 ', answer: '今日も', after: ' よろしく お願いします。',
        acceptedAnswers: japaneseAccepted('今日も', 'きょうも'),
        fallbackChoices: ['今日も', '今週も', '来週も', '午後も'],
      },
      speakTarget: {
        baseCue: { de: 'Guten Tag. Auch heute freue ich mich auf unser Treffen.', en: 'Hello. I’m looking forward to today’s session too.' },
        targetPhrase: 'こんにちは。 今日も よろしく お願いします。',
        acceptedAnswers: ['こんにちは。 今日も よろしく お願いします。', 'こんにちは。 きょうも よろしく おねがいします。'],
        requiredTokens: ['こんにちは。', '今日も', 'よろしく'], optionalTokens: ['お願いします。'],
      },
      sceneCaption: { de: 'Die bekannten Namensschilder liegen wieder auf dem Gruppentisch, während alle für den neuen Beginn kurz aufblicken.', en: 'The familiar name tags are back on the group table as everyone looks up for the new beginning.' },
      trophyWord: {
        word: '今日', meaning: { de: 'heute', en: 'today' }, example: '今日は いい 天気 です。',
        whyThisWord: { de: '今日 verankert Pläne und Begrüßungen im aktuellen Tag und lässt sich direkt mit Zeit und Treffen verbinden.', en: '今日 anchors plans and greetings in the current day and connects directly to time and meetings.' },
      },
      placeholderCaption: { de: 'Gemeinschaftstisch mit vertrauten Namensschildern und derselben kleinen Gruppe beim erneuten Beginn.', en: 'Community table with familiar name tags and the same small group gathering again.' },
      songMood: 'friendly familiar new start',
      visualNotes: 'Casual language-exchange table, returning participants, warm recognition without a first-meeting pose.',
    }),
  },
  {
    slug: 'kyowa-jikanga-arimasuka',
    title: { de: 'Hast du heute Zeit?', en: 'Do you have time today?' },
    situation: {
      de: 'Neben zwei Veranstaltungskarten liegt ein Tageskalender mit mehreren freien und belegten Feldern.',
      en: 'A daily calendar with several open and occupied slots lies beside two event cards.',
    },
    pedagogicalGoal: '今日は als Zeitraum setzen und mit 時間が ありますか höflich nach verfügbarer Zeit fragen.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: '今日は 時間が ありますか。', baseText: { de: 'Haben Sie heute Zeit?', en: 'Do you have time today?' } },
      meaning: { de: 'Eine einfache höfliche Frage, ob heute noch Zeit für einen Plan bleibt.', en: 'A simple polite question about whether there is time left today for a plan.' },
      chunks: [
        { id: 'kyowa-jikanga-arimasuka-today', targetText: '今日は', baseText: { de: 'heute', en: 'today' } },
        { id: 'kyowa-jikanga-arimasuka-time', targetText: '時間が', baseText: { de: 'Zeit', en: 'time' } },
        { id: 'kyowa-jikanga-arimasuka-have', targetText: 'ありますか。', baseText: { de: 'haben Sie?', en: 'do you have?' } },
      ],
      lessonItems: [
        { id: 'kyowa-jikanga-arimasuka-item-kyowa', targetText: '今日は', baseText: { de: 'heute (kyō wa; mit Themenpartikel)', en: 'today (kyō wa; with topic particle)' }, acceptedAnswers: ['今日は', 'きょうは'] },
        { id: 'kyowa-jikanga-arimasuka-item-jikan', targetText: '時間', baseText: { de: 'Zeit / Stunde (jikan)', en: 'time / hour (jikan)' }, acceptedAnswers: ['時間', 'じかん'] },
        { id: 'kyowa-jikanga-arimasuka-item-jikanga', targetText: '時間が', baseText: { de: 'Zeit (jikan ga; mit Subjektpartikel)', en: 'time (jikan ga; with subject particle)' }, acceptedAnswers: ['時間が', 'じかんが'] },
        { id: 'kyowa-jikanga-arimasuka-item-gogo', targetText: '午後', baseText: { de: 'Nachmittag (gogo)', en: 'afternoon (gogo)' }, acceptedAnswers: ['午後', 'ごご'] },
      ],
      buildChips: ['今日は', '時間が', 'ありますか。', '予定が', '午後は 大丈夫 です。'],
      typeRecall: {
        before: '今日は ', answer: '時間が', after: ' ありますか。',
        acceptedAnswers: japaneseAccepted('時間が', 'じかんが'),
        fallbackChoices: ['時間が', '予定が', '部屋が', '電車が'],
      },
      speakTarget: {
        baseCue: { de: 'Haben Sie heute Zeit?', en: 'Do you have time today?' },
        targetPhrase: '今日は 時間が ありますか。',
        acceptedAnswers: ['今日は 時間が ありますか。', 'きょうは じかんが ありますか。'],
        requiredTokens: ['今日は', '時間が', 'ありますか。'], optionalTokens: [],
      },
      sceneCaption: { de: 'Zwischen zwei Veranstaltungskarten zeigt der Tageskalender mehrere unterschiedlich markierte Zeitfenster.', en: 'Between two event cards, the daily calendar shows several differently marked time slots.' },
      trophyWord: {
        word: '時間', meaning: { de: 'Zeit', en: 'time' }, example: '時間は ありますか。',
        whyThisWord: { de: '時間 ist der zentrale Planungsanker, bevor ihr eine Uhrzeit, einen Ort oder eine Aktivität festlegt.', en: '時間 is the central planning word before you choose a time, place, or activity.' },
      },
      placeholderCaption: { de: 'Tageskalender mit freien und belegten Feldern neben zwei unterschiedlichen Veranstaltungskarten.', en: 'Daily calendar with open and occupied slots beside two different event cards.' },
      songMood: 'open daytime invitation',
      visualNotes: 'Tabletop calendar and event cards, availability mixed and no time selected.',
    }),
  },
  {
    slug: 'soredewa-atode-aimasho',
    title: { de: 'Bis später', en: 'See you later' },
    situation: {
      de: 'Ihr müsst euch kurz trennen; beide Wege führen später wieder zum selben Veranstaltungsgebäude.',
      en: 'You need to split up briefly, and both routes lead back to the same event building later.',
    },
    pedagogicalGoal: 'あとで als späteren Zeitpunkt mit der höflichen Einladung 会いましょう verbinden.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: 'それでは、 あとで 会いましょう。', baseText: { de: 'Dann sehen wir uns später.', en: 'See you later.' } },
      meaning: { de: 'Ein freundlicher vorläufiger Abschied mit einem Wiedersehen später am Tag.', en: 'A friendly temporary goodbye with a plan to meet again later in the day.' },
      chunks: [
        { id: 'soredewa-atode-aimasho-transition', targetText: 'それでは、', baseText: { de: 'also dann,', en: 'well then,' } },
        { id: 'soredewa-atode-aimasho-later', targetText: 'あとで', baseText: { de: 'später', en: 'later' } },
        { id: 'soredewa-atode-aimasho-meet', targetText: '会いましょう。', baseText: { de: 'treffen wir uns.', en: 'let us meet.' } },
      ],
      lessonItems: [
        { id: 'soredewa-atode-aimasho-item-soredewa', targetText: 'それでは', baseText: { de: 'also dann (soredewa)', en: 'well then (soredewa)' }, acceptedAnswers: ['それでは'] },
        { id: 'soredewa-atode-aimasho-item-atode', targetText: 'あとで', baseText: { de: 'später (ato de)', en: 'later (ato de)' }, acceptedAnswers: ['あとで'] },
        { id: 'soredewa-atode-aimasho-item-aimasho', targetText: '会いましょう', baseText: { de: 'treffen wir uns (aimashō)', en: 'let us meet (aimashō)' }, acceptedAnswers: ['会いましょう', 'あいましょう'] },
        { id: 'soredewa-atode-aimasho-item-iriguchi', targetText: '入口', baseText: { de: 'Eingang (iriguchi)', en: 'entrance (iriguchi)' }, acceptedAnswers: ['入口', 'いりぐち'] },
      ],
      buildChips: ['それでは、', 'あとで', '会いましょう。', '今から', 'おやすみなさい。'],
      typeRecall: {
        before: 'それでは、 ', answer: 'あとで', after: ' 会いましょう。',
        acceptedAnswers: japaneseAccepted('あとで'),
        fallbackChoices: ['あとで', '外で', '駅で', '部屋で'],
      },
      speakTarget: {
        baseCue: { de: 'Dann sehen wir uns später.', en: 'See you later.' },
        targetPhrase: 'それでは、 あとで 会いましょう。',
        acceptedAnswers: ['それでは、 あとで 会いましょう。', 'それでは、 あとで あいましょう。'],
        requiredTokens: ['それでは、', 'あとで', '会いましょう。'], optionalTokens: [],
      },
      sceneCaption: { de: 'Auf dem Platz teilen sich zwei verschiedenfarbige Wege zu getrennten Erledigungen, während das Veranstaltungsgebäude markiert bleibt.', en: 'At the plaza, two colored routes split toward separate errands while the event building remains marked.' },
      trophyWord: {
        word: 'あとで', meaning: { de: 'später', en: 'later' }, example: 'あとで 電話します。',
        whyThisWord: { de: 'あとで hält einen Plan bewusst flexibel und eignet sich für ein Wiedersehen oder einen Anruf am selben Tag.', en: 'あとで keeps a plan deliberately flexible and works for meeting or calling again on the same day.' },
      },
      placeholderCaption: { de: 'Stadtplan mit zwei auseinanderlaufenden Wegen und einem weiterhin markierten Veranstaltungsgebäude.', en: 'City map with two diverging routes and an event building that remains marked.' },
      songMood: 'light temporary farewell',
      visualNotes: 'Friends parting at a plaza, route lines diverge and reconnect later, upbeat rather than final goodbye.',
    }),
  },
  {
    slug: 'nanjiga-ii-desuka',
    title: { de: 'Welche Uhrzeit passt?', en: 'What time works?' },
    situation: {
      de: 'Auf dem Handy sind drei mögliche Uhrzeiten für das Treffen sichtbar, aber noch keine ist ausgewählt.',
      en: 'Three possible meeting times are visible on the phone, but none has been selected yet.',
    },
    pedagogicalGoal: '何時が als offene Auswahlfrage mit いい ですか nach einer passenden Uhrzeit verwenden.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: '何時が いい ですか。', baseText: { de: 'Welche Uhrzeit passt?', en: 'What time is good?' } },
      meaning: { de: 'Eine kurze höfliche Frage nach der bevorzugten Uhrzeit.', en: 'A short polite question about the preferred time.' },
      chunks: [
        { id: 'nanjiga-ii-desuka-time', targetText: '何時が', baseText: { de: 'welche Uhrzeit', en: 'what time' } },
        { id: 'nanjiga-ii-desuka-good', targetText: 'いい ですか。', baseText: { de: 'ist gut / passt?', en: 'is good / works?' } },
      ],
      lessonItems: [
        { id: 'nanjiga-ii-desuka-item-nanji', targetText: '何時', baseText: { de: 'welche Uhrzeit (nanji)', en: 'what time (nanji)' }, acceptedAnswers: ['何時', 'なんじ'] },
        { id: 'nanjiga-ii-desuka-item-nanjiga', targetText: '何時が', baseText: { de: 'welche Uhrzeit (nanji ga; mit Subjektpartikel)', en: 'what time (nanji ga; with subject particle)' }, acceptedAnswers: ['何時が', 'なんじが'] },
        { id: 'nanjiga-ii-desuka-item-ii', targetText: 'いい', baseText: { de: 'gut / passend (ii)', en: 'good / suitable (ii)' }, acceptedAnswers: ['いい'] },
        { id: 'nanjiga-ii-desuka-item-gogo', targetText: '午後', baseText: { de: 'Nachmittag (gogo)', en: 'afternoon (gogo)' }, acceptedAnswers: ['午後', 'ごご'] },
      ],
      buildChips: ['何時が', 'いい ですか。', '場所が', '大丈夫 ですか。'],
      typeRecall: {
        before: '', answer: '何時が', after: ' いい ですか。',
        acceptedAnswers: japaneseAccepted('何時が', 'なんじが'),
        fallbackChoices: ['何時が', '場所が', '天気が', '名前が'],
      },
      speakTarget: {
        baseCue: { de: 'Welche Uhrzeit passt?', en: 'What time is good?' },
        targetPhrase: '何時が いい ですか。',
        acceptedAnswers: ['何時が いい ですか。', 'なんじが いい ですか。'],
        requiredTokens: ['何時が', 'いい', 'ですか。'], optionalTokens: [],
      },
      sceneCaption: { de: 'Drei Zeitfelder stehen nebeneinander auf dem Handy, und alle Auswahlkreise sind noch leer.', en: 'Three time slots sit side by side on the phone, and every selection circle is still empty.' },
      trophyWord: {
        word: 'いい', meaning: { de: 'gut / passend', en: 'good / suitable' }, example: 'この 時間で いい ですか。',
        whyThisWord: { de: 'いい bewertet eine Option unkompliziert als passend und macht aus Uhrzeit oder Ort eine höfliche Kontrollfrage.', en: 'いい marks an option simply as suitable and turns a time or place into a polite confirmation question.' },
      },
      placeholderCaption: { de: 'Handy-Terminansicht mit drei möglichen Uhrzeiten und vollständig leeren Auswahlkreisen.', en: 'Phone scheduling view with three possible times and every selection circle empty.' },
      songMood: 'easy shared scheduling',
      visualNotes: 'Close phone calendar, three equal time options, no preference visually implied.',
    }),
  },
  {
    slug: 'kono-bashode-aimasho',
    title: { de: 'Treffen wir uns an diesem Ort', en: 'Let us meet at this place' },
    situation: {
      de: 'Auf der Karte überlappen zwei nahe Treffpunkte am Bahnhofsvorplatz, und du zeigst auf einen davon.',
      en: 'Two nearby meeting points overlap on the station plaza map, and you point to one of them.',
    },
    pedagogicalGoal: 'この 場所で als konkreten Treffpunkt mit 会いましょう festlegen.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: 'この 場所で 会いましょう。', baseText: { de: 'Treffen wir uns an diesem Ort.', en: 'Let us meet at this place.' } },
      meaning: { de: 'Eine einfache gemeinsame Festlegung auf den gezeigten Treffpunkt.', en: 'A simple shared decision to meet at the place being indicated.' },
      chunks: [
        { id: 'kono-bashode-aimasho-place', targetText: 'この 場所で', baseText: { de: 'an diesem Ort', en: 'at this place' } },
        { id: 'kono-bashode-aimasho-meet', targetText: '会いましょう。', baseText: { de: 'treffen wir uns.', en: 'let us meet.' } },
      ],
      lessonItems: [
        { id: 'kono-bashode-aimasho-item-kono', targetText: 'この', baseText: { de: 'dieser / diese (kono)', en: 'this (kono)' }, acceptedAnswers: ['この'] },
        { id: 'kono-bashode-aimasho-item-basho', targetText: '場所', baseText: { de: 'Ort / Stelle (basho)', en: 'place / spot (basho)' }, acceptedAnswers: ['場所', 'ばしょ'] },
        { id: 'kono-bashode-aimasho-item-bashode', targetText: '場所で', baseText: { de: 'an diesem Ort (basho de; mit Ortspartikel)', en: 'at the place (basho de; with location particle)' }, acceptedAnswers: ['場所で', 'ばしょで'] },
        { id: 'kono-bashode-aimasho-item-aimasho', targetText: '会いましょう', baseText: { de: 'treffen wir uns (aimashō)', en: 'let us meet (aimashō)' }, acceptedAnswers: ['会いましょう', 'あいましょう'] },
      ],
      buildChips: ['この 場所で', '会いましょう。', '駅の 外で', '待ちます。'],
      typeRecall: {
        before: 'この ', answer: '場所で', after: ' 会いましょう。',
        acceptedAnswers: japaneseAccepted('場所で', 'ばしょで'),
        fallbackChoices: ['場所で', '公園で', '橋で', '店内で'],
      },
      speakTarget: {
        baseCue: { de: 'Treffen wir uns an diesem Ort.', en: 'Let us meet at this place.' },
        targetPhrase: 'この 場所で 会いましょう。',
        acceptedAnswers: ['この 場所で 会いましょう。', 'この ばしょで あいましょう。'],
        requiredTokens: ['この', '場所で', '会いましょう。'], optionalTokens: [],
      },
      sceneCaption: { de: 'Zwei Markierungen liegen dicht beieinander auf dem Bahnhofsvorplatz, während dein Finger über einer davon wartet.', en: 'Two pins sit close together on the station plaza while your finger waits above one of them.' },
      trophyWord: {
        word: '場所', meaning: { de: 'Ort / Stelle', en: 'place / spot' }, example: '場所は 駅の 外 です。',
        whyThisWord: { de: '場所 benennt einen Treffpunkt allgemein, wenn der konkrete Name eines Gebäudes oder Ausgangs nicht bekannt ist.', en: '場所 names a meeting spot generally when you do not know the exact name of a building or exit.' },
      },
      placeholderCaption: { de: 'Bahnhofsvorplatz-Karte mit zwei dicht benachbarten Markierungen und einem noch schwebenden Finger.', en: 'Station-plaza map with two nearby pins and a finger still hovering above them.' },
      songMood: 'clear shared meeting point',
      visualNotes: 'Phone map at station plaza, two close pins, pointing gesture identifies intent without caption resolving it.',
    }),
  },
  {
    slug: 'ekino-sotode-matte-imasu',
    title: { de: 'Ich warte draußen', en: 'I am waiting outside' },
    situation: {
      de: 'Du stehst vor dem Bahnhof unter einem Vordach; auf dem Handy fragt deine Begleitung nach deinem Standort.',
      en: 'You are standing under the canopy outside the station, and your companion messages to ask where you are.',
    },
    pedagogicalGoal: 'Die ausdrücklich erlaubte feste Verlaufsform 待って います mit 駅の 外で als aktuellem Warteort verwenden.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: '駅の 外で 待って います。', baseText: { de: 'Ich warte draußen vor dem Bahnhof.', en: 'I am waiting outside the station.' } },
      meaning: { de: 'Eine aktuelle Standortmeldung, dass du außerhalb des Bahnhofs wartest.', en: 'A current location update that you are waiting outside the station.' },
      chunks: [
        { id: 'ekino-sotode-matte-imasu-location', targetText: '駅の 外で', baseText: { de: 'draußen vor dem Bahnhof', en: 'outside the station' } },
        { id: 'ekino-sotode-matte-imasu-waiting', targetText: '待って います。', baseText: { de: 'warte ich gerade.', en: 'I am waiting.' } },
      ],
      lessonItems: [
        { id: 'ekino-sotode-matte-imasu-item-ekino', targetText: '駅の', baseText: { de: 'des Bahnhofs (eki no; mit Zugehörigkeitspartikel)', en: 'the station’s (eki no; with possessive particle)' }, acceptedAnswers: ['駅の', 'えきの'] },
        { id: 'ekino-sotode-matte-imasu-item-soto', targetText: '外', baseText: { de: 'draußen / Außenseite (soto)', en: 'outside / exterior (soto)' }, acceptedAnswers: ['外', 'そと'] },
        { id: 'ekino-sotode-matte-imasu-item-sotode', targetText: '外で', baseText: { de: 'draußen (soto de; mit Ortspartikel)', en: 'outside (soto de; with location particle)' }, acceptedAnswers: ['外で', 'そとで'] },
        { id: 'ekino-sotode-matte-imasu-item-iriguchi', targetText: '入口', baseText: { de: 'Eingang (iriguchi)', en: 'entrance (iriguchi)' }, acceptedAnswers: ['入口', 'いりぐち'] },
      ],
      buildChips: ['駅の 外で', '待って います。', '駅の 中で', '今 行きます。'],
      typeRecall: {
        before: '駅の ', answer: '外で', after: ' 待って います。',
        acceptedAnswers: japaneseAccepted('外で', 'そとで'),
        fallbackChoices: ['外で', '北口で', '交番で', '階段で'],
      },
      speakTarget: {
        baseCue: { de: 'Ich warte draußen vor dem Bahnhof.', en: 'I am waiting outside the station.' },
        targetPhrase: '駅の 外で 待って います。',
        acceptedAnswers: ['駅の 外で 待って います。', 'えきの そとで まって います。'],
        requiredTokens: ['駅の', '外で', '待って'], optionalTokens: ['います。'],
      },
      sceneCaption: { de: 'Unter dem Vordach sind Bahnhofstüren und Vorplatz gleichzeitig sichtbar, während auf dem Handy eine Standortfrage offensteht.', en: 'The station doors and plaza are both visible beneath the canopy while a location question remains open on the phone.' },
      trophyWord: {
        word: '外', meaning: { de: 'draußen / Außenseite', en: 'outside / exterior' }, example: '外で 待って います。',
        whyThisWord: { de: '外 unterscheidet bei großen Stationen den Vorplatz klar von Bahnsteigen, Sperren und Innenhallen.', en: '外 clearly distinguishes the plaza from platforms, ticket gates, and indoor halls at large stations.' },
      },
      placeholderCaption: { de: 'Bahnhofsvordach zwischen Glastüren und Vorplatz, dazu eine offene Standortnachricht auf dem Handy.', en: 'Station canopy between glass doors and plaza, with an unanswered location message on the phone.' },
      songMood: 'patient outdoor rendezvous',
      visualNotes: 'Outside station under canopy, entrances and plaza in frame, companion not yet present.',
    }),
  },
  {
    slug: 'sumimasen-sukoshi-okuremasu',
    title: { de: 'Ich verspäte mich etwas', en: 'I am running a little late' },
    situation: {
      de: 'Die nächste Bahn kommt erst später, während auf deinem Handy die vereinbarte Uhrzeit näher rückt.',
      en: 'The next train will not arrive for a while, while the agreed meeting time approaches on your phone.',
    },
    pedagogicalGoal: '少し als kleine Verzögerung mit dem höflichen Zukunftssignal 遅れます und einer Entschuldigung verbinden.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: 'すみません、 少し 遅れます。', baseText: { de: 'Entschuldigung, ich verspäte mich etwas.', en: 'Sorry, I will be a little late.' } },
      meaning: { de: 'Eine kurze höfliche Nachricht über eine kleine bevorstehende Verspätung.', en: 'A short polite message about a small upcoming delay.' },
      chunks: [
        { id: 'sumimasen-sukoshi-okuremasu-apology', targetText: 'すみません、', baseText: { de: 'Entschuldigung,', en: 'Sorry,' } },
        { id: 'sumimasen-sukoshi-okuremasu-small', targetText: '少し', baseText: { de: 'ein wenig', en: 'a little' } },
        { id: 'sumimasen-sukoshi-okuremasu-late', targetText: '遅れます。', baseText: { de: 'ich verspäte mich.', en: 'I will be late.' } },
      ],
      lessonItems: [
        { id: 'sumimasen-sukoshi-okuremasu-item-sumimasen', targetText: 'すみません', baseText: { de: 'Entschuldigung (sumimasen)', en: 'sorry / excuse me (sumimasen)' }, acceptedAnswers: ['すみません'] },
        { id: 'sumimasen-sukoshi-okuremasu-item-sukoshi', targetText: '少し', baseText: { de: 'ein wenig (sukoshi)', en: 'a little (sukoshi)' }, acceptedAnswers: ['少し', 'すこし'] },
        { id: 'sumimasen-sukoshi-okuremasu-item-okuremasu', targetText: '遅れます', baseText: { de: 'ich verspäte mich (okuremasu)', en: 'I will be late (okuremasu)' }, acceptedAnswers: ['遅れます', 'おくれます'] },
        { id: 'sumimasen-sukoshi-okuremasu-item-tokei', targetText: '時計', baseText: { de: 'Uhr (tokei)', en: 'clock / watch (tokei)' }, acceptedAnswers: ['時計', 'とけい'] },
      ],
      buildChips: ['すみません、', '少し', '遅れます。', 'もう 着きます。', '時間が あります。'],
      typeRecall: {
        before: 'すみません、 少し ', answer: '遅れます', after: '。',
        acceptedAnswers: japaneseAccepted('遅れます', 'おくれます'),
        fallbackChoices: ['遅れます', '行きます', '戻ります', '待ちます'],
      },
      speakTarget: {
        baseCue: { de: 'Entschuldigung, ich verspäte mich etwas.', en: 'Sorry, I will be a little late.' },
        targetPhrase: 'すみません、 少し 遅れます。',
        acceptedAnswers: ['すみません、 少し 遅れます。', 'すみません、 すこし おくれます。'],
        requiredTokens: ['すみません、', '少し', '遅れます。'], optionalTokens: [],
      },
      sceneCaption: { de: 'Die nächste Bahnzeit steht neben der vereinbarten Uhrzeit, während der Nachrichtenentwurf noch leer ist.', en: 'The next train time sits beside the agreed meeting time while the message draft remains empty.' },
      trophyWord: {
        word: '遅れます', meaning: { de: 'ich verspäte mich', en: 'I will be late' }, example: 'すみません、 少し 遅れます。',
        whyThisWord: { de: '遅れます meldet eine bevorstehende Verspätung höflich, ohne eine verbotene Vergangenheitsform zu brauchen.', en: '遅れます reports an upcoming delay politely without requiring a past-tense form.' },
      },
      placeholderCaption: { de: 'Bahnsteiganzeige mit später Ankunftszeit neben einem Handy mit leerem Nachrichtenfeld.', en: 'Platform display with a later arrival time beside a phone with a blank message field.' },
      songMood: 'apologetic but composed delay',
      visualNotes: 'Transit delay board and meeting time on phone, traveler composing a message without panic.',
    }),
  },
  {
    slug: 'yoteiwa-doyobidemo-ii-desuka',
    title: { de: 'Passt auch Samstag?', en: 'Would Saturday work?' },
    situation: {
      de: 'Der zuerst markierte Termin ist durchgestrichen; im Wochenendbereich des Kalenders bleibt noch ein Feld frei.',
      en: 'The first marked appointment is crossed out, and one slot remains open in the weekend section of the calendar.',
    },
    pedagogicalGoal: '予定は als Planrahmen setzen und 土曜日でも いい ですか als einfache Alternative anbieten.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: '予定は 土曜日でも いい ですか。', baseText: { de: 'Passt für den Plan auch Samstag?', en: 'Would Saturday work for the plan?' } },
      meaning: { de: 'Eine einfache höfliche Umplanung auf einen vorgeschlagenen Wochentag.', en: 'A simple polite rescheduling question offering a different day.' },
      chunks: [
        { id: 'yoteiwa-doyobidemo-ii-desuka-plan', targetText: '予定は', baseText: { de: 'was den Plan angeht', en: 'as for the plan' } },
        { id: 'yoteiwa-doyobidemo-ii-desuka-saturday', targetText: '土曜日でも', baseText: { de: 'auch am Samstag', en: 'even on Saturday' } },
        { id: 'yoteiwa-doyobidemo-ii-desuka-check', targetText: 'いい ですか。', baseText: { de: 'ist das in Ordnung?', en: 'is that okay?' } },
      ],
      lessonItems: [
        { id: 'yoteiwa-doyobidemo-ii-desuka-item-yotei', targetText: '予定', baseText: { de: 'Plan / Termin (yotei)', en: 'plan / schedule (yotei)' }, acceptedAnswers: ['予定', 'よてい'] },
        { id: 'yoteiwa-doyobidemo-ii-desuka-item-yoteiwa', targetText: '予定は', baseText: { de: 'Plan (yotei wa; mit Themenpartikel)', en: 'plan (yotei wa; with topic particle)' }, acceptedAnswers: ['予定は', 'よていは'] },
        { id: 'yoteiwa-doyobidemo-ii-desuka-item-doyobi', targetText: '土曜日', baseText: { de: 'Samstag (doyōbi)', en: 'Saturday (doyōbi)' }, acceptedAnswers: ['土曜日', 'どようび'] },
        { id: 'yoteiwa-doyobidemo-ii-desuka-item-doyobidemo', targetText: '土曜日でも', baseText: { de: 'auch Samstag (doyōbi demo; mit Alternativpartikel)', en: 'Saturday as an option (doyōbi demo; with alternative particle)' }, acceptedAnswers: ['土曜日でも', 'どようびでも'] },
      ],
      buildChips: ['予定は', '土曜日でも', 'いい ですか。', '日曜日でも', 'この 場所で'],
      typeRecall: {
        before: '予定は ', answer: '土曜日でも', after: ' いい ですか。',
        acceptedAnswers: japaneseAccepted('土曜日でも', 'どようびでも'),
        fallbackChoices: ['土曜日でも', '日曜日でも', '月曜日でも', '午後でも'],
      },
      speakTarget: {
        baseCue: { de: 'Passt für den Plan auch Samstag?', en: 'Would Saturday work for the plan?' },
        targetPhrase: '予定は 土曜日でも いい ですか。',
        acceptedAnswers: ['予定は 土曜日でも いい ですか。', 'よていは どようびでも いい ですか。'],
        requiredTokens: ['予定は', '土曜日でも', 'いい'], optionalTokens: ['ですか。'],
      },
      sceneCaption: { de: 'Ein früherer Kalendereintrag ist gestrichen, während im Wochenendbereich genau ein Feld unmarkiert bleibt.', en: 'An earlier calendar entry is crossed out while exactly one weekend slot remains unmarked.' },
      trophyWord: {
        word: '予定', meaning: { de: 'Plan / Termin', en: 'plan / schedule' }, example: '予定は 土曜日 です。',
        whyThisWord: { de: '予定 fasst eine Verabredung oder Aktivität als Plan zusammen und macht einfache Änderungen leichter.', en: '予定 packages an appointment or activity as a plan and makes simple changes easier to discuss.' },
      },
      placeholderCaption: { de: 'Wochenkalender mit durchgestrichenem Termin und einem einzelnen freien Feld am Wochenende.', en: 'Weekly calendar with one crossed-out appointment and a single open weekend slot.' },
      songMood: 'flexible friendly reschedule',
      visualNotes: 'Weekly calendar, original plan crossed out, one weekend opening without its label emphasized.',
    }),
  },
  {
    slug: 'ashitamo-yoroshiku-onegaishimasu',
    title: { de: 'Bis morgen', en: 'See you tomorrow' },
    situation: {
      de: 'An der Tür steht der nächste gemeinsame Termin bereits im Kalender, und beide nehmen ihre Taschen für den Heimweg.',
      en: 'At the door, the next shared appointment is already in the calendar and both of you pick up your bags to leave.',
    },
    pedagogicalGoal: 'あしたも als nächstes Wiedersehen mit よろしく お願いします freundlich bestätigen.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: 'あしたも よろしく お願いします。', baseText: { de: 'Bis morgen, ich freue mich darauf.', en: 'I look forward to tomorrow as well.' } },
      meaning: { de: 'Ein höflicher Abschied, der das bereits geplante Treffen am nächsten Tag bestätigt.', en: 'A polite farewell that confirms an already planned meeting the next day.' },
      chunks: [
        { id: 'ashitamo-yoroshiku-onegaishimasu-tomorrow', targetText: 'あしたも', baseText: { de: 'auch morgen', en: 'tomorrow as well' } },
        { id: 'ashitamo-yoroshiku-onegaishimasu-goodwill', targetText: 'よろしく お願いします。', baseText: { de: 'ich freue mich darauf.', en: 'I look forward to it.' } },
      ],
      lessonItems: [
        { id: 'ashitamo-yoroshiku-onegaishimasu-item-ashita', targetText: 'あした', baseText: { de: 'morgen (ashita)', en: 'tomorrow (ashita)' }, acceptedAnswers: ['あした'] },
        { id: 'ashitamo-yoroshiku-onegaishimasu-item-ashitamo', targetText: 'あしたも', baseText: { de: 'auch morgen (ashita mo; mit Zusatzpartikel)', en: 'tomorrow as well (ashita mo; with additive particle)' }, acceptedAnswers: ['あしたも'] },
        { id: 'ashitamo-yoroshiku-onegaishimasu-item-yoroshiku', targetText: 'よろしく', baseText: { de: 'auf gute Zusammenarbeit (yoroshiku)', en: 'kindly / with goodwill (yoroshiku)' }, acceptedAnswers: ['よろしく'] },
        { id: 'ashitamo-yoroshiku-onegaishimasu-item-yotei', targetText: '予定', baseText: { de: 'Plan / Termin (yotei)', en: 'plan / appointment (yotei)' }, acceptedAnswers: ['予定', 'よてい'] },
      ],
      buildChips: ['あしたも', 'よろしく お願いします。', '今夜も', 'では、 失礼します。'],
      typeRecall: {
        before: '', answer: 'あしたも', after: ' よろしく お願いします。',
        acceptedAnswers: japaneseAccepted('あしたも'),
        fallbackChoices: ['あしたも', '朝も', '日曜日も', '夜も'],
      },
      speakTarget: {
        baseCue: { de: 'Bis morgen, ich freue mich darauf.', en: 'I look forward to tomorrow as well.' },
        targetPhrase: 'あしたも よろしく お願いします。',
        acceptedAnswers: ['あしたも よろしく お願いします。', 'あしたも よろしく おねがいします。'],
        requiredTokens: ['あしたも', 'よろしく', 'お願いします。'], optionalTokens: [],
      },
      sceneCaption: { de: 'Der nächste Kalendereintrag ist sichtbar gespeichert, während an der Tür bereits beide Taschen aufgenommen werden.', en: 'The next calendar entry is visibly saved while both bags are already being picked up at the door.' },
      trophyWord: {
        word: 'よろしく', meaning: { de: 'auf gute Zusammenarbeit / bitte freundlich', en: 'with goodwill / kindly' }, example: 'あしたも よろしく お願いします。',
        whyThisWord: { de: 'よろしく bestätigt freundlich eine fortgesetzte Beziehung oder einen schon vereinbarten nächsten Termin.', en: 'よろしく warmly confirms an ongoing relationship or a next meeting that is already arranged.' },
      },
      placeholderCaption: { de: 'Eingangsbereich mit gespeichertem Kalendereintrag und zwei für den Heimweg aufgenommenen Taschen.', en: 'Entryway with a saved calendar appointment and two bags lifted for the trip home.' },
      songMood: 'hopeful next day farewell',
      visualNotes: 'Friends at doorway, next appointment visible on phone, departure gentle and clearly temporary.',
    }),
  },
  {
    slug: 'mo-yoru-desu-oyasuminasai',
    title: { de: 'Es ist schon Nacht', en: 'It is already night' },
    situation: {
      de: 'Auf dem stillen Bahnhofsvorplatz leuchten nur noch wenige Fenster, und die letzte Unterhaltung kommt zum Ende.',
      en: 'Only a few windows remain lit on the quiet station plaza, and the final conversation is coming to an end.',
    },
    pedagogicalGoal: 'もう 夜 です als klare Zeiteinschätzung mit dem höflichen Nachtgruß おやすみなさい abschließen.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: 'もう 夜 です。 おやすみなさい。', baseText: { de: 'Es ist schon Nacht. Gute Nacht.', en: 'It is already night. Good night.' } },
      meaning: { de: 'Ein natürlicher Tagesabschluss mit einer einfachen Zeitfeststellung und Nachtgruß.', en: 'A natural end to the day with a simple time statement and nighttime farewell.' },
      chunks: [
        { id: 'mo-yoru-desu-oyasuminasai-already', targetText: 'もう', baseText: { de: 'schon', en: 'already' } },
        { id: 'mo-yoru-desu-oyasuminasai-night', targetText: '夜 です。', baseText: { de: 'ist es Nacht.', en: 'it is night.' } },
        { id: 'mo-yoru-desu-oyasuminasai-farewell', targetText: 'おやすみなさい。', baseText: { de: 'Gute Nacht.', en: 'Good night.' } },
      ],
      lessonItems: [
        { id: 'mo-yoru-desu-oyasuminasai-item-mo', targetText: 'もう', baseText: { de: 'schon / bereits (mō)', en: 'already / now (mō)' }, acceptedAnswers: ['もう'] },
        { id: 'mo-yoru-desu-oyasuminasai-item-yoru', targetText: '夜', baseText: { de: 'Nacht (yoru)', en: 'night (yoru)' }, acceptedAnswers: ['夜', 'よる'] },
        { id: 'mo-yoru-desu-oyasuminasai-item-konbanwa', targetText: 'こんばんは', baseText: { de: 'guten Abend (konbanwa)', en: 'good evening (konbanwa)' }, acceptedAnswers: ['こんばんは'] },
        { id: 'mo-yoru-desu-oyasuminasai-item-oyasumi', targetText: 'おやすみなさい', baseText: { de: 'gute Nacht (oyasuminasai)', en: 'good night (oyasuminasai)' }, acceptedAnswers: ['おやすみなさい'] },
      ],
      buildChips: ['もう', '夜 です。', 'おやすみなさい。', 'まだ', 'こんにちは。'],
      typeRecall: {
        before: 'もう ', answer: '夜', after: ' です。 おやすみなさい。',
        acceptedAnswers: japaneseAccepted('夜', 'よる'),
        fallbackChoices: ['夜', '朝', '昼', '夕方'],
      },
      speakTarget: {
        baseCue: { de: 'Es ist schon Nacht. Gute Nacht.', en: 'It is already night. Good night.' },
        targetPhrase: 'もう 夜 です。 おやすみなさい。',
        acceptedAnswers: ['もう 夜 です。 おやすみなさい。', 'もう よる です。 おやすみなさい。'],
        requiredTokens: ['もう', '夜', 'おやすみなさい。'], optionalTokens: ['です。'],
      },
      sceneCaption: { de: 'Der fast leere Vorplatz liegt unter dunklem Himmel, während nur wenige Fenster und die Bahnhofsuhr noch leuchten.', en: 'The nearly empty plaza sits beneath a dark sky while only a few windows and the station clock remain lit.' },
      trophyWord: {
        word: '夜', meaning: { de: 'Nacht', en: 'night' }, example: 'もう 夜 です。',
        whyThisWord: { de: '夜 benennt die Tageszeit direkt und macht den Wechsel von einem normalen Abschied zu おやすみなさい verständlich.', en: '夜 names the time of day directly and makes the shift from an ordinary farewell to おやすみなさい clear.' },
      },
      placeholderCaption: { de: 'Fast leerer Bahnhofsvorplatz unter dunklem Himmel mit wenigen beleuchteten Fenstern.', en: 'Nearly empty station plaza beneath a dark sky with only a few lit windows.' },
      songMood: 'quiet final night goodbye',
      visualNotes: 'Night station plaza, last lights and clock visible, two people ending conversation without dramatic sentiment.',
    }),
  },
]

export const JAPANESE_A1_PRACTICAL_9_LESSONS: GuidedLessonDefinition[] = makeJapanesePracticalLessons(
  GUIDED_TODAY_PATH_JAPANESE_NINE_METADATA,
  japaneseA1Practical9Inputs,
  { de: 'Du hast Japanisch A1 Praxis 9 abgeschlossen.', en: 'You have completed Japanese A1 Practical 9.' },
)

export const GUIDED_TODAY_PATH_JAPANESE_TEN_METADATA: GuidedPathMetadata = {
  id: 'japanese-a1-practical-10',
  title: 'Japanese A1 Practical 10',
  shortTitle: 'A1 Practical 10',
  subtitle: { de: 'Tagesrückblick und herzlicher Abschied', en: 'Day-end reflections and warm goodbyes' },
  level: 'A1',
  baseLanguage: 'German',
  targetLanguage: 'Japanese',
  estimatedMinutes: 5,
}

const japaneseA1Practical10Inputs: JapaneseLessonInput[] = [
  {
    slug: 'kyowa-ii-ichinichi-good-day',
    title: { de: 'Ein guter Tag', en: 'A good day' },
    situation: {
      de: 'Am Ende eines langen Ausflugstags liegen IC-Karten-Beleg, Fahrplan und eine Tüte aus dem Convenience-Store auf dem Tisch; deine Begleitung fragt nach deinem Eindruck.',
      en: 'At the end of a full day out, an IC-card receipt, train schedule, and convenience-store bag sit on the table as your companion asks for your impression.',
    },
    pedagogicalGoal: 'Mit 今日は den Rückblick rahmen und 一日 in einer kurzen positiven です-Aussage verwenden.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: '今日は いい 一日 です。', baseText: { de: 'Heute ist ein guter Tag.', en: 'Today is a good day.' } },
      meaning: { de: 'Ein ruhiger positiver Rückblick auf den ganzen Tag.', en: 'A calm, positive reflection on the whole day.' },
      chunks: [
        { id: 'kyowa-ii-ichinichi-good-day-today', targetText: '今日は', baseText: { de: 'heute', en: 'today' } },
        { id: 'kyowa-ii-ichinichi-good-day-good-day', targetText: 'いい 一日 です。', baseText: { de: 'ist es ein guter Tag.', en: 'it is a good day.' } },
      ],
      lessonItems: [
        { id: 'kyowa-ii-ichinichi-good-day-item-kyowa', targetText: '今日は', baseText: { de: 'heute (kyō wa; mit Themenpartikel)', en: 'today (kyō wa; with topic particle)' }, acceptedAnswers: ['今日は', 'きょうは'] },
        { id: 'kyowa-ii-ichinichi-good-day-item-ii', targetText: 'いい', baseText: { de: 'gut (ii)', en: 'good (ii)' }, acceptedAnswers: ['いい'] },
        { id: 'kyowa-ii-ichinichi-good-day-item-ichinichi', targetText: '一日', baseText: { de: 'ein ganzer Tag (ichinichi)', en: 'one whole day (ichinichi)' }, acceptedAnswers: ['一日', 'いちにち'] },
        { id: 'kyowa-ii-ichinichi-good-day-item-omoide', targetText: '思い出', baseText: { de: 'Erinnerung (omoide)', en: 'memory (omoide)' }, acceptedAnswers: ['思い出', 'おもいで'] },
      ],
      buildChips: ['今日は', 'いい 一日 です。', '長い 一日', '朝 です。'],
      typeRecall: {
        before: '今日は いい ', answer: '一日', after: ' です。',
        acceptedAnswers: japaneseAccepted('一日', 'いちにち'),
        fallbackChoices: ['一日', '一時間', '一人', '一枚'],
      },
      speakTarget: {
        baseCue: { de: 'Heute ist ein guter Tag.', en: 'Today is a good day.' },
        targetPhrase: '今日は いい 一日 です。',
        acceptedAnswers: ['今日は いい 一日 です。', 'きょうは いい いちにち です。'],
        requiredTokens: ['いい', '一日', 'です。'], optionalTokens: ['今日は'],
      },
      sceneCaption: { de: 'Zwischen Fahrplan, IC-Karten-Beleg und Einkaufstüte wartet im Reisetagebuch noch eine leere Zeile für den Tagesrückblick.', en: 'Between the train schedule, IC receipt, and shopping bag, one line in the travel journal remains blank for the day’s reflection.' },
      trophyWord: {
        word: '一日', meaning: { de: 'ein ganzer Tag', en: 'one whole day' }, example: '今日は たのしい 一日 です。',
        whyThisWord: { de: '一日 fasst alle Erlebnisse von morgens bis abends zusammen; in diesem Rückblick liest du es ichinichi.', en: '一日 gathers everything from morning to evening into one unit; in this reflection it is read ichinichi.' },
      },
      placeholderCaption: { de: 'Reisetisch am Abend mit IC-Karten-Beleg, Fahrplan, Einkaufstüte und offenem Tagebuch.', en: 'Evening travel table with an IC receipt, train schedule, convenience-store bag, and open journal.' },
      songMood: 'sunset travel reflection',
      visualNotes: 'End-of-day tabletop still life, Japanese transit and convenience-store details, warm sunset glow and an unwritten journal line.',
    }),
  },
  {
    slug: 'kireina-basho-beautiful-place',
    title: { de: 'Ein schöner Ort', en: 'A beautiful place' },
    situation: {
      de: 'In einem kleinen Tempelgarten bleibt deine Begleitung an einem Teich stehen und gibt dir den Moment für eine gemeinsame Bemerkung.',
      en: 'In a small temple garden, your companion pauses beside a pond and leaves space for a shared comment about the setting.',
    },
    pedagogicalGoal: 'きれいな direkt vor 場所 setzen und mit dem einmaligen ですね eine geteilte Wahrnehmung ausdrücken.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: 'きれいな 場所 ですね。', baseText: { de: 'Das ist ein schöner Ort, nicht wahr?', en: 'This is a beautiful place, isn’t it?' } },
      meaning: { de: 'Eine sanfte Bemerkung, mit der du die Schönheit eines Ortes teilst.', en: 'A gentle comment that shares appreciation of a place.' },
      chunks: [
        { id: 'kireina-basho-beautiful-place-description', targetText: 'きれいな 場所', baseText: { de: 'ein schöner Ort', en: 'a beautiful place' } },
        { id: 'kireina-basho-beautiful-place-shared', targetText: 'ですね。', baseText: { de: 'nicht wahr?', en: 'isn’t it?' } },
      ],
      lessonItems: [
        { id: 'kireina-basho-beautiful-place-item-kirei', targetText: 'きれい', baseText: { de: 'schön / sauber (kirei)', en: 'beautiful / clean (kirei)' }, acceptedAnswers: ['きれい'] },
        { id: 'kireina-basho-beautiful-place-item-basho', targetText: '場所', baseText: { de: 'Ort / Stelle (basho)', en: 'place / spot (basho)' }, acceptedAnswers: ['場所', 'ばしょ'] },
        { id: 'kireina-basho-beautiful-place-item-keshiki', targetText: '景色', baseText: { de: 'Landschaft / Aussicht (keshiki)', en: 'scenery / view (keshiki)' }, acceptedAnswers: ['景色', 'けしき'] },
        { id: 'kireina-basho-beautiful-place-item-niwa', targetText: '庭', baseText: { de: 'Garten (niwa)', en: 'garden (niwa)' }, acceptedAnswers: ['庭', 'にわ'] },
      ],
      buildChips: ['きれいな 場所', 'ですね。', '小さな 店', 'ですか。'],
      typeRecall: {
        before: '', answer: 'きれいな', after: ' 場所 ですね。',
        acceptedAnswers: japaneseAccepted('きれいな'),
        fallbackChoices: ['きれいな', 'にぎやかな', '新しい', '遠い'],
      },
      speakTarget: {
        baseCue: { de: 'Das ist ein schöner Ort, nicht wahr?', en: 'This is a beautiful place, isn’t it?' },
        targetPhrase: 'きれいな 場所 ですね。',
        acceptedAnswers: ['きれいな 場所 ですね。', 'きれいな ばしょ ですね。'],
        requiredTokens: ['きれいな', '場所', 'ですね。'], optionalTokens: [],
      },
      sceneCaption: { de: 'Am Teichrand spiegeln sich Steinlaterne und Ahornzweige, während deine Begleitung kurz innehält und zu dir blickt.', en: 'A stone lantern and maple branches reflect at the pond’s edge as your companion pauses and looks toward you.' },
      trophyWord: {
        word: 'きれい', meaning: { de: 'schön / sauber', en: 'beautiful / clean' }, example: 'この 庭は きれい です。',
        whyThisWord: { de: 'きれい beschreibt sowohl einen gepflegten Garten als auch eine schöne Aussicht und passt deshalb zu vielen Reisemomenten.', en: 'きれい can describe both a well-kept garden and a beautiful view, making it useful in many travel moments.' },
      },
      placeholderCaption: { de: 'Ruhiger Tempelteich mit Steinlaterne, Ahornzweigen und zwei Betrachtenden am Weg.', en: 'Quiet temple pond with a stone lantern, maple branches, and two visitors on the path.' },
      songMood: 'hushed garden wonder',
      visualNotes: 'Small Japanese temple garden at blue hour, pond reflection and stone lantern, restrained shared wonder rather than postcard spectacle.',
    }),
  },
  {
    slug: 'iroiro-hontoni-arigato-thanks-everything',
    title: { de: 'Danke für alles', en: 'Thank you for everything' },
    situation: {
      de: 'Vor der Abreise aus dem Ryokan liegen Regenschirm, Wegskizze und Gepäckanhänger bereit; die Gastgeberin wartet an der Rezeption.',
      en: 'Before leaving the ryokan, an umbrella, route sketch, and luggage tag are ready while the host waits at reception.',
    },
    pedagogicalGoal: 'いろいろ als Sammelwort für viele Hilfen mit 本当に und der festen Dankesformel verbinden.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: 'いろいろ 本当に ありがとうございます。', baseText: { de: 'Für alles wirklich vielen Dank.', en: 'Thank you so much for everything.' } },
      meaning: { de: 'Ein warmer Gesamtdank für mehrere kleine Hilfen während des Aufenthalts.', en: 'Warm overall thanks for several small acts of help during a stay.' },
      chunks: [
        { id: 'iroiro-hontoni-arigato-thanks-everything-various', targetText: 'いろいろ', baseText: { de: 'für all die verschiedenen Dinge', en: 'for all the different things' } },
        { id: 'iroiro-hontoni-arigato-thanks-everything-sincere', targetText: '本当に', baseText: { de: 'wirklich', en: 'truly' } },
        { id: 'iroiro-hontoni-arigato-thanks-everything-thanks', targetText: 'ありがとうございます。', baseText: { de: 'vielen Dank.', en: 'thank you very much.' } },
      ],
      lessonItems: [
        { id: 'iroiro-hontoni-arigato-thanks-everything-item-iroiro', targetText: 'いろいろ', baseText: { de: 'verschiedenes / allerlei (iroiro)', en: 'various things / all sorts (iroiro)' }, acceptedAnswers: ['いろいろ'] },
        { id: 'iroiro-hontoni-arigato-thanks-everything-item-hontoni', targetText: '本当に', baseText: { de: 'wirklich / aufrichtig (hontō ni; mit Adverbialpartikel)', en: 'truly / sincerely (hontō ni; with adverbial particle)' }, acceptedAnswers: ['本当に', 'ほんとうに'] },
        { id: 'iroiro-hontoni-arigato-thanks-everything-item-arigato', targetText: 'ありがとうございます', baseText: { de: 'vielen Dank (arigatō gozaimasu)', en: 'thank you very much (arigatō gozaimasu)' }, acceptedAnswers: ['ありがとうございます'] },
        { id: 'iroiro-hontoni-arigato-thanks-everything-item-shinsetsu', targetText: '親切', baseText: { de: 'Freundlichkeit / Hilfsbereitschaft (shinsetsu)', en: 'kindness / helpfulness (shinsetsu)' }, acceptedAnswers: ['親切', 'しんせつ'] },
      ],
      buildChips: ['いろいろ', '本当に', 'ありがとうございます。', '少し', 'お願いします。'],
      typeRecall: {
        before: '', answer: 'いろいろ', after: ' 本当に ありがとうございます。',
        acceptedAnswers: japaneseAccepted('いろいろ'),
        fallbackChoices: ['いろいろ', '一つ', '静かに', 'そちら'],
      },
      speakTarget: {
        baseCue: { de: 'Für alles wirklich vielen Dank.', en: 'Thank you so much for everything.' },
        targetPhrase: 'いろいろ 本当に ありがとうございます。',
        acceptedAnswers: ['いろいろ 本当に ありがとうございます。', 'いろいろ ほんとうに ありがとうございます。'],
        requiredTokens: ['いろいろ', '本当に', 'ありがとうございます。'], optionalTokens: [],
      },
      sceneCaption: { de: 'Auf der Ryokan-Theke liegen mehrere kleine Reisehilfen ordentlich neben dem Zimmerschlüssel, während die Gastgeberin den Abschied abwartet.', en: 'Several small travel aids are arranged beside the room key on the ryokan counter while the host waits for the farewell.' },
      trophyWord: {
        word: 'いろいろ', meaning: { de: 'verschiedenes / allerlei', en: 'various things / all sorts' }, example: 'いろいろ ありがとうございます。',
        whyThisWord: { de: 'いろいろ bündelt viele einzelne Gefälligkeiten in einem einzigen herzlichen Dank, ohne jede Hilfe aufzählen zu müssen.', en: 'いろいろ gathers many individual favors into one warm thank-you without listing every act of help.' },
      },
      placeholderCaption: { de: 'Ryokan-Rezeption mit Schirm, handgezeichneter Route, Gepäckanhänger und bereitliegendem Schlüssel.', en: 'Ryokan reception with an umbrella, hand-drawn route, luggage tag, and room key ready on the counter.' },
      songMood: 'grateful ryokan farewell',
      visualNotes: 'Traditional inn reception, several specific helpful objects on the counter, warm gratitude with understated bows.',
    }),
  },
  {
    slug: 'nihongoga-sukoshi-wakarimasu-understand',
    title: { de: 'Ich verstehe etwas Japanisch', en: 'I understand some Japanese' },
    situation: {
      de: 'An den Bahnhofssperren erkennst du auf den Schildern Ausgangsnummer, IC-Karten-Hinweis und Bahnsteigpfeil ohne geöffnete Übersetzungs-App.',
      en: 'At the station ticket gates, you recognize an exit number, IC-card notice, and platform arrow without opening the translation app.',
    },
    pedagogicalGoal: '日本語が mit 少し und わかります zu einer bescheidenen Aussage über Lernfortschritt verbinden.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: '日本語が 少し わかります。', baseText: { de: 'Ich verstehe ein wenig Japanisch.', en: 'I understand a little Japanese.' } },
      meaning: { de: 'Eine bescheidene positive Aussage über das eigene Sprachverständnis.', en: 'A modest positive statement about your own language comprehension.' },
      chunks: [
        { id: 'nihongoga-sukoshi-wakarimasu-understand-language', targetText: '日本語が', baseText: { de: 'Japanisch', en: 'Japanese' } },
        { id: 'nihongoga-sukoshi-wakarimasu-understand-small', targetText: '少し', baseText: { de: 'ein wenig', en: 'a little' } },
        { id: 'nihongoga-sukoshi-wakarimasu-understand-verb', targetText: 'わかります。', baseText: { de: 'verstehe ich.', en: 'I understand.' } },
      ],
      lessonItems: [
        { id: 'nihongoga-sukoshi-wakarimasu-understand-item-nihongoga', targetText: '日本語が', baseText: { de: 'Japanisch (nihongo ga; mit Subjektpartikel)', en: 'Japanese (nihongo ga; with subject particle)' }, acceptedAnswers: ['日本語が', 'にほんごが'] },
        { id: 'nihongoga-sukoshi-wakarimasu-understand-item-sukoshi', targetText: '少し', baseText: { de: 'ein wenig (sukoshi)', en: 'a little (sukoshi)' }, acceptedAnswers: ['少し', 'すこし'] },
        { id: 'nihongoga-sukoshi-wakarimasu-understand-item-wakarimasu', targetText: 'わかります', baseText: { de: 'ich verstehe (wakarimasu)', en: 'I understand (wakarimasu)' }, acceptedAnswers: ['わかります'] },
        { id: 'nihongoga-sukoshi-wakarimasu-understand-item-annai', targetText: '案内', baseText: { de: 'Hinweis / Wegweiser (annai)', en: 'guidance / information (annai)' }, acceptedAnswers: ['案内', 'あんない'] },
      ],
      buildChips: ['日本語が', '少し', 'わかります。', '中国語が', 'よく わかります。'],
      typeRecall: {
        before: '', answer: '日本語が', after: ' 少し わかります。',
        acceptedAnswers: japaneseAccepted('日本語が', 'にほんごが'),
        fallbackChoices: ['日本語が', '中国語が', '出口が', '番号が'],
      },
      speakTarget: {
        baseCue: { de: 'Ich verstehe ein wenig Japanisch.', en: 'I understand a little Japanese.' },
        targetPhrase: '日本語が 少し わかります。',
        acceptedAnswers: ['日本語が 少し わかります。', 'にほんごが すこし わかります。'],
        requiredTokens: ['日本語が', '少し', 'わかります。'], optionalTokens: [],
      },
      sceneCaption: { de: 'Über den Sperren zeigen Schilder zu Ausgängen und Bahnsteigen; das Handy bleibt dunkel, während eine Begleitung auf einen Hinweis deutet.', en: 'Signs above the gates point to exits and platforms; the phone remains dark as a companion indicates one notice.' },
      trophyWord: {
        word: 'わかります', meaning: { de: 'ich verstehe', en: 'I understand' }, example: 'この 日本語は わかります。',
        whyThisWord: { de: 'わかります macht einen kleinen Lernerfolg hörbar und bleibt bewusst bescheidener als eine Aussage über fließendes Sprechen.', en: 'わかります makes a small learning success audible and stays deliberately more modest than claiming fluent speech.' },
      },
      placeholderCaption: { de: 'Japanische Bahnhofssperren mit Ausgangsnummer, IC-Karten-Hinweis, Bahnsteigpfeilen und unbenutztem Handy.', en: 'Japanese station gates with an exit number, IC-card notice, platform arrows, and an unused phone.' },
      songMood: 'quiet language breakthrough',
      visualNotes: 'Authentic Japanese ticket-gate signage, translation phone asleep, learner tracing one understood sign with growing calm.',
    }),
  },
  {
    slug: 'sukoshi-nemui-desu-sleepy',
    title: { de: 'Ein wenig schläfrig', en: 'A little sleepy' },
    situation: {
      de: 'Im ruhigen letzten Nahverkehrszug fragt dich deine Begleitung, wie es dir nach dem langen Tag geht.',
      en: 'On the quiet last local train, your companion asks how you are feeling after the long day.',
    },
    pedagogicalGoal: 'Die zulässige Gegenwartsbeschreibung 少し 眠い です statt einer verbotenen Vergangenheitsform verwenden.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: '少し 眠い です。', baseText: { de: 'Ich bin ein wenig schläfrig.', en: 'I am a little sleepy.' } },
      meaning: { de: 'Eine einfache höfliche Beschreibung des jetzigen Müdigkeitsgefühls.', en: 'A simple polite description of feeling sleepy right now.' },
      chunks: [
        { id: 'sukoshi-nemui-desu-sleepy-small', targetText: '少し', baseText: { de: 'ein wenig', en: 'a little' } },
        { id: 'sukoshi-nemui-desu-sleepy-feeling', targetText: '眠い です。', baseText: { de: 'bin ich schläfrig.', en: 'I am sleepy.' } },
      ],
      lessonItems: [
        { id: 'sukoshi-nemui-desu-sleepy-item-sukoshi', targetText: '少し', baseText: { de: 'ein wenig (sukoshi)', en: 'a little (sukoshi)' }, acceptedAnswers: ['少し', 'すこし'] },
        { id: 'sukoshi-nemui-desu-sleepy-item-nemui', targetText: '眠い', baseText: { de: 'schläfrig (nemui)', en: 'sleepy (nemui)' }, acceptedAnswers: ['眠い', 'ねむい'] },
        { id: 'sukoshi-nemui-desu-sleepy-item-yasumi', targetText: '休み', baseText: { de: 'Pause / Ruhe (yasumi)', en: 'break / rest (yasumi)' }, acceptedAnswers: ['休み', 'やすみ'] },
        { id: 'sukoshi-nemui-desu-sleepy-item-me', targetText: '目', baseText: { de: 'Auge (me)', en: 'eye (me)' }, acceptedAnswers: ['目', 'め'] },
      ],
      buildChips: ['少し', '眠い です。', 'とても', '元気 です。'],
      typeRecall: {
        before: '少し ', answer: '眠い', after: ' です。',
        acceptedAnswers: japaneseAccepted('眠い', 'ねむい'),
        fallbackChoices: ['眠い', '寒い', '暑い', '忙しい'],
      },
      speakTarget: {
        baseCue: { de: 'Ich bin ein wenig schläfrig.', en: 'I am a little sleepy.' },
        targetPhrase: '少し 眠い です。',
        acceptedAnswers: ['少し 眠い です。', 'すこし ねむい です。'],
        requiredTokens: ['少し', '眠い', 'です。'], optionalTokens: [],
      },
      sceneCaption: { de: 'Der Wagen schaukelt leise durch die Nacht; auf deinem Schoß bleibt der Reiseführer geschlossen, während die Stationsanzeige weiterzählt.', en: 'The carriage rocks softly through the night; the guidebook stays closed on your lap as the stop display continues counting down.' },
      trophyWord: {
        word: '眠い', meaning: { de: 'schläfrig', en: 'sleepy' }, example: '今は 眠い です。',
        whyThisWord: { de: '眠い beschreibt den aktuellen Zustand direkt und vermeidet die nicht erlaubte Vergangenheitsform für „müde geworden“.', en: '眠い describes the present state directly and avoids the disallowed past-tense way of saying you became tired.' },
      },
      placeholderCaption: { de: 'Später Nahverkehrszug mit geschlossenem Reiseführer, dunklem Fenster und langsam wechselnder Stationsanzeige.', en: 'Late local train with a closed guidebook, dark window, and slowly changing stop display.' },
      songMood: 'drowsy last-train hush',
      visualNotes: 'Nearly empty Japanese local train at night, gentle carriage sway, closed guidebook and soft fluorescent rhythm.',
    }),
  },
  {
    slug: 'soredewa-sorosoro-ikimasu-leaving',
    title: { de: 'Zeit aufzubrechen', en: 'Time to head out' },
    situation: {
      de: 'Im Café werden bereits einige Stühle eingeräumt; auf deinem Handy steht die Zeit der letzten passenden Bahn, und deine Jacke hängt noch am Stuhl.',
      en: 'At the cafe, a few chairs are already being put away; your phone shows the last suitable train and your jacket still hangs on the chair.',
    },
    pedagogicalGoal: 'それでは als Übergang mit そろそろ und dem höflichen 行きます zu einem natürlichen Aufbruchssignal verbinden.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: 'それでは、 そろそろ 行きます。', baseText: { de: 'Also dann, ich breche langsam auf.', en: 'Well then, I should get going.' } },
      meaning: { de: 'Eine höfliche Ankündigung, dass jetzt der passende Moment zum Gehen kommt.', en: 'A polite signal that the right moment to leave is approaching.' },
      chunks: [
        { id: 'soredewa-sorosoro-ikimasu-leaving-transition', targetText: 'それでは、', baseText: { de: 'also dann,', en: 'well then,' } },
        { id: 'soredewa-sorosoro-ikimasu-leaving-soon', targetText: 'そろそろ', baseText: { de: 'langsam wird es Zeit', en: 'it is about time' } },
        { id: 'soredewa-sorosoro-ikimasu-leaving-go', targetText: '行きます。', baseText: { de: 'ich gehe.', en: 'I will go.' } },
      ],
      lessonItems: [
        { id: 'soredewa-sorosoro-ikimasu-leaving-item-soredewa', targetText: 'それでは', baseText: { de: 'also dann (soredewa)', en: 'well then (soredewa)' }, acceptedAnswers: ['それでは'] },
        { id: 'soredewa-sorosoro-ikimasu-leaving-item-sorosoro', targetText: 'そろそろ', baseText: { de: 'allmählich / bald ist es Zeit (sorosoro)', en: 'gradually / about time (sorosoro)' }, acceptedAnswers: ['そろそろ'] },
        { id: 'soredewa-sorosoro-ikimasu-leaving-item-ikimasu', targetText: '行きます', baseText: { de: 'ich gehe / fahre (ikimasu)', en: 'I go / will leave (ikimasu)' }, acceptedAnswers: ['行きます', 'いきます'] },
        { id: 'soredewa-sorosoro-ikimasu-leaving-item-deguchi', targetText: '出口', baseText: { de: 'Ausgang (deguchi)', en: 'exit (deguchi)' }, acceptedAnswers: ['出口', 'でぐち'] },
      ],
      buildChips: ['それでは、', 'そろそろ', '行きます。', 'まだ います。', '少し 待ちます。'],
      typeRecall: {
        before: 'それでは、 ', answer: 'そろそろ', after: ' 行きます。',
        acceptedAnswers: japaneseAccepted('そろそろ'),
        fallbackChoices: ['そろそろ', 'ずっと', 'ときどき', 'いつも'],
      },
      speakTarget: {
        baseCue: { de: 'Also dann, ich breche langsam auf.', en: 'Well then, I should get going.' },
        targetPhrase: 'それでは、 そろそろ 行きます。',
        acceptedAnswers: ['それでは、 そろそろ 行きます。', 'それでは、 そろそろ いきます。'],
        requiredTokens: ['それでは、', 'そろそろ', '行きます。'], optionalTokens: [],
      },
      sceneCaption: { de: 'Neben der letzten passenden Bahnzeit liegt das Handy auf dem Tisch, während im Hintergrund erste Stühle hochgestellt werden.', en: 'The phone lies beside the last suitable train time as the first chairs are stacked in the background.' },
      trophyWord: {
        word: 'そろそろ', meaning: { de: 'allmählich / bald ist es Zeit', en: 'gradually / about time' }, example: 'そろそろ 駅へ 行きます。',
        whyThisWord: { de: 'そろそろ kündigt einen Übergang sanft an und lässt den Aufbruch weniger abrupt wirken.', en: 'そろそろ gently signals a transition and makes leaving feel less abrupt.' },
      },
      placeholderCaption: { de: 'Schließendes Café mit hochgestellten Stühlen, Jacke am Stuhl und letzter Bahnverbindung auf dem Handy.', en: 'Closing cafe with stacked chairs, a jacket on the seat, and the final useful train shown on a phone.' },
      songMood: 'gentle closing-time departure',
      visualNotes: 'Japanese cafe nearing close, last-train screen visible, jacket still on chair and a courteous transition into leaving.',
    }),
  },
  {
    slug: 'mata-suguni-aimasho-see-soon',
    title: { de: 'Bis ganz bald', en: 'See you again soon' },
    situation: {
      de: 'Vor den Bahnhofssperren führen eure Wege zu zwei verschiedenen Linien; ein Flyer für die nächste gemeinsame Veranstaltung steckt noch in beiden Taschen.',
      en: 'In front of the station ticket gates, your routes lead to two different lines while a flyer for the next shared event remains tucked into both bags.',
    },
    pedagogicalGoal: 'また und すぐに mit der höflichen Einladung 会いましょう zu einem nahen Wiedersehen verbinden.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: 'また すぐに 会いましょう。', baseText: { de: 'Treffen wir uns bald wieder.', en: 'Let us meet again soon.' } },
      meaning: { de: 'Ein freundlicher Abschied mit dem Wunsch nach einem baldigen Wiedersehen.', en: 'A friendly goodbye that looks toward meeting again soon.' },
      chunks: [
        { id: 'mata-suguni-aimasho-see-soon-again', targetText: 'また', baseText: { de: 'wieder', en: 'again' } },
        { id: 'mata-suguni-aimasho-see-soon-soon', targetText: 'すぐに', baseText: { de: 'bald', en: 'soon' } },
        { id: 'mata-suguni-aimasho-see-soon-meet', targetText: '会いましょう。', baseText: { de: 'treffen wir uns.', en: 'let us meet.' } },
      ],
      lessonItems: [
        { id: 'mata-suguni-aimasho-see-soon-item-mata', targetText: 'また', baseText: { de: 'wieder (mata)', en: 'again (mata)' }, acceptedAnswers: ['また'] },
        { id: 'mata-suguni-aimasho-see-soon-item-sugu', targetText: 'すぐ', baseText: { de: 'sofort / bald (sugu)', en: 'right away / soon (sugu)' }, acceptedAnswers: ['すぐ'] },
        { id: 'mata-suguni-aimasho-see-soon-item-suguni', targetText: 'すぐに', baseText: { de: 'bald (sugu ni; mit Adverbialpartikel)', en: 'soon (sugu ni; with adverbial particle)' }, acceptedAnswers: ['すぐに'] },
        { id: 'mata-suguni-aimasho-see-soon-item-aimasho', targetText: '会いましょう', baseText: { de: 'treffen wir uns (aimashō)', en: 'let us meet (aimashō)' }, acceptedAnswers: ['会いましょう', 'あいましょう'] },
      ],
      buildChips: ['また', 'すぐに', '会いましょう。', '来週', '電話します。'],
      typeRecall: {
        before: 'また ', answer: 'すぐに', after: ' 会いましょう。',
        acceptedAnswers: japaneseAccepted('すぐに'),
        fallbackChoices: ['すぐに', '駅に', '右に', '店に'],
      },
      speakTarget: {
        baseCue: { de: 'Treffen wir uns bald wieder.', en: 'Let us meet again soon.' },
        targetPhrase: 'また すぐに 会いましょう。',
        acceptedAnswers: ['また すぐに 会いましょう。', 'また すぐに あいましょう。'],
        requiredTokens: ['また', 'すぐに', '会いましょう。'], optionalTokens: [],
      },
      sceneCaption: { de: 'Zwei farbige Linienpfeile teilen sich hinter den Sperren, während aus beiden Taschen derselbe Veranstaltungsflyer hervorschaut.', en: 'Two colored line arrows split beyond the gates while the same event flyer peeks from both bags.' },
      trophyWord: {
        word: 'すぐ', meaning: { de: 'sofort / bald', en: 'right away / soon' }, example: 'すぐ 電話します。',
        whyThisWord: { de: 'すぐ verkürzt gefühlt die Zeit bis zum nächsten Kontakt und passt sowohl zu einem Treffen als auch zu einem Anruf.', en: 'すぐ makes the time until the next contact feel short and works for both a meeting and a phone call.' },
      },
      placeholderCaption: { de: 'Bahnhofssperren mit auseinanderführenden Linienpfeilen und demselben Veranstaltungsflyer in zwei Taschen.', en: 'Station gates with diverging line arrows and the same event flyer visible in two bags.' },
      songMood: 'bright promise to reconnect',
      visualNotes: 'Friends separating at Japanese ticket gates, matching flyers imply a future event, optimistic but not sentimental.',
    }),
  },
  {
    slug: 'ashitano-gogowa-daijobu-tomorrow-works',
    title: { de: 'Morgen Nachmittag passt', en: 'Tomorrow afternoon works' },
    situation: {
      de: 'Am Sitzplatz eines Convenience-Stores vergleichst du eine Einladung für morgen mit deinem Kalender; das Antwortfeld ist noch leer.',
      en: 'At a convenience-store seating counter, you compare an invitation for tomorrow with your calendar while the reply field is still blank.',
    },
    pedagogicalGoal: '明日の 午後は als konkreten Zeitraum setzen und mit 大丈夫 です höflich Verfügbarkeit bestätigen.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: '明日の 午後は 大丈夫 です。', baseText: { de: 'Morgen Nachmittag passt es.', en: 'Tomorrow afternoon works for me.' } },
      meaning: { de: 'Eine klare höfliche Bestätigung für einen bestimmten Zeitraum am nächsten Tag.', en: 'A clear polite confirmation for a specific time period the next day.' },
      chunks: [
        { id: 'ashitano-gogowa-daijobu-tomorrow-works-time', targetText: '明日の 午後は', baseText: { de: 'morgen Nachmittag', en: 'tomorrow afternoon' } },
        { id: 'ashitano-gogowa-daijobu-tomorrow-works-okay', targetText: '大丈夫 です。', baseText: { de: 'passt es.', en: 'it works.' } },
      ],
      lessonItems: [
        { id: 'ashitano-gogowa-daijobu-tomorrow-works-item-ashitano', targetText: '明日の', baseText: { de: 'morgig / von morgen (ashita no; mit Zugehörigkeitspartikel)', en: 'tomorrow’s (ashita no; with possessive particle)' }, acceptedAnswers: ['明日の', 'あしたの'] },
        { id: 'ashitano-gogowa-daijobu-tomorrow-works-item-gogo', targetText: '午後', baseText: { de: 'Nachmittag (gogo)', en: 'afternoon (gogo)' }, acceptedAnswers: ['午後', 'ごご'] },
        { id: 'ashitano-gogowa-daijobu-tomorrow-works-item-gogowa', targetText: '午後は', baseText: { de: 'was den Nachmittag angeht (gogo wa; mit Themenpartikel)', en: 'as for the afternoon (gogo wa; with topic particle)' }, acceptedAnswers: ['午後は', 'ごごは'] },
        { id: 'ashitano-gogowa-daijobu-tomorrow-works-item-daijobu', targetText: '大丈夫', baseText: { de: 'in Ordnung / passend (daijōbu)', en: 'okay / suitable (daijōbu)' }, acceptedAnswers: ['大丈夫', 'だいじょうぶ'] },
      ],
      buildChips: ['明日の 午後は', '大丈夫 です。', '午前は', '予定が あります。'],
      typeRecall: {
        before: '明日の ', answer: '午後は', after: ' 大丈夫 です。',
        acceptedAnswers: japaneseAccepted('午後は', 'ごごは'),
        fallbackChoices: ['午後は', '午前は', '月曜日は', '週末は'],
      },
      speakTarget: {
        baseCue: { de: 'Morgen Nachmittag passt es.', en: 'Tomorrow afternoon works for me.' },
        targetPhrase: '明日の 午後は 大丈夫 です。',
        acceptedAnswers: ['明日の 午後は 大丈夫 です。', 'あしたの ごごは だいじょうぶ です。'],
        requiredTokens: ['午後は', '大丈夫', 'です。'], optionalTokens: ['明日の'],
      },
      sceneCaption: { de: 'Neben einem Kassenbon liegen Veranstaltungskarte und morgiger Kalender offen, während das Nachrichtenfeld auf eine Antwort wartet.', en: 'Beside a convenience-store receipt, an event card and tomorrow’s calendar are open while the message field waits for a reply.' },
      trophyWord: {
        word: '午後', meaning: { de: 'Nachmittag', en: 'afternoon' }, example: '午後は 大丈夫 です。',
        whyThisWord: { de: '午後 grenzt einen Plan genauer ein, ohne dass du schon eine genaue Uhrzeit oder japanische Zahlwörter brauchst.', en: '午後 narrows a plan without requiring an exact time or Japanese number words yet.' },
      },
      placeholderCaption: { de: 'Sitzplatz im Convenience-Store mit Beleg, Veranstaltungskarte, offenem Kalender und leerem Antwortfeld.', en: 'Convenience-store counter seat with a receipt, event card, open calendar, and blank reply field.' },
      songMood: 'easy next-day agreement',
      visualNotes: 'Japanese convenience-store eat-in counter, event ticket and tomorrow calendar side by side, practical low-key planning.',
    }),
  },
  {
    slug: 'soredewa-minasan-oyasuminasai-everyone',
    title: { de: 'Gute Nacht zusammen', en: 'Good night, everyone' },
    situation: {
      de: 'Der Sprachabend ist vorbei; alle tragen ihre Mäntel schon über dem Arm, und im Gemeinschaftsraum bleibt nur noch eine Lampe an.',
      en: 'The language-exchange evening is over; everyone has a coat over an arm and only one lamp remains on in the community room.',
    },
    pedagogicalGoal: 'それでは als Abschluss setzen und みなさん direkt mit dem festen Nachtgruß ansprechen.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: 'それでは、 みなさん、 おやすみなさい。', baseText: { de: 'Also dann, gute Nacht zusammen.', en: 'Well then, good night, everyone.' } },
      meaning: { de: 'Ein höflicher gemeinsamer Nachtgruß an die ganze Gruppe.', en: 'A polite nighttime farewell addressed to the whole group.' },
      chunks: [
        { id: 'soredewa-minasan-oyasuminasai-everyone-close', targetText: 'それでは、', baseText: { de: 'also dann,', en: 'well then,' } },
        { id: 'soredewa-minasan-oyasuminasai-everyone-group', targetText: 'みなさん、', baseText: { de: 'alle zusammen,', en: 'everyone,' } },
        { id: 'soredewa-minasan-oyasuminasai-everyone-goodnight', targetText: 'おやすみなさい。', baseText: { de: 'gute Nacht.', en: 'good night.' } },
      ],
      lessonItems: [
        { id: 'soredewa-minasan-oyasuminasai-everyone-item-soredewa', targetText: 'それでは', baseText: { de: 'also dann (soredewa)', en: 'well then (soredewa)' }, acceptedAnswers: ['それでは'] },
        { id: 'soredewa-minasan-oyasuminasai-everyone-item-minasan', targetText: 'みなさん', baseText: { de: 'alle / meine Damen und Herren (minasan)', en: 'everyone / all of you (minasan)' }, acceptedAnswers: ['みなさん'] },
        { id: 'soredewa-minasan-oyasuminasai-everyone-item-oyasumi', targetText: 'おやすみなさい', baseText: { de: 'gute Nacht (oyasuminasai)', en: 'good night (oyasuminasai)' }, acceptedAnswers: ['おやすみなさい'] },
        { id: 'soredewa-minasan-oyasuminasai-everyone-item-atsumari', targetText: '集まり', baseText: { de: 'Treffen / Zusammenkunft (atsumari)', en: 'gathering / meeting (atsumari)' }, acceptedAnswers: ['集まり', 'あつまり'] },
      ],
      buildChips: ['それでは、', 'みなさん、', 'おやすみなさい。', 'こんばんは。', 'ありがとうございます。'],
      typeRecall: {
        before: 'それでは、 ', answer: 'みなさん', after: '、 おやすみなさい。',
        acceptedAnswers: japaneseAccepted('みなさん'),
        fallbackChoices: ['みなさん', '先生', '店員さん', '運転手さん'],
      },
      speakTarget: {
        baseCue: { de: 'Also dann, gute Nacht zusammen.', en: 'Well then, good night, everyone.' },
        targetPhrase: 'それでは、 みなさん、 おやすみなさい。',
        acceptedAnswers: ['それでは、 みなさん、 おやすみなさい。'],
        requiredTokens: ['それでは、', 'みなさん、', 'おやすみなさい。'], optionalTokens: [],
      },
      sceneCaption: { de: 'Im fast leeren Gemeinschaftsraum nehmen alle ihre Taschen auf, während über dem Gruppentisch nur noch eine Lampe brennt.', en: 'In the nearly empty community room, everyone picks up their bags while only one lamp remains above the group table.' },
      trophyWord: {
        word: 'みなさん', meaning: { de: 'alle / alle zusammen', en: 'everyone / all of you' }, example: 'みなさんは 元気 です。',
        whyThisWord: { de: 'みなさん richtet einen Gruß respektvoll an die ganze Gruppe, ohne jede Person einzeln anzusprechen.', en: 'みなさん addresses the entire group respectfully without naming each person one by one.' },
      },
      placeholderCaption: { de: 'Fast leerer Gemeinschaftsraum mit Mänteln, Taschen und einer letzten Lampe über dem Gruppentisch.', en: 'Nearly empty community room with coats, bags, and one last lamp above the group table.' },
      songMood: 'soft communal goodnight',
      visualNotes: 'Language-exchange room closing for the night, several people gathering belongings, one warm pool of light over the table.',
    }),
  },
  {
    slug: 'soredewa-mata-itsuka-goodbye-now',
    title: { de: 'Bis irgendwann', en: 'Until we meet again' },
    situation: {
      de: 'Am Shinkansen-Zugang beginnt die Einstiegsanzeige zu blinken; dein Gepäck steht auf der einen Seite der Sperre, deine Begleitung auf der anderen.',
      en: 'At the Shinkansen entrance, the boarding indicator begins to blink; your luggage stands on one side of the gate and your companion on the other.',
    },
    pedagogicalGoal: 'それでは und また mit いつか zu einem offenen, höflichen Abschied ohne verbotene Vergangenheitsform verbinden.',
    variant: makeBrightJapaneseVariant({
      corePhrase: { targetText: 'それでは、 また いつか。', baseText: { de: 'Also dann, bis irgendwann.', en: 'Well then, until we meet again someday.' } },
      meaning: { de: 'Ein offener Abschied, wenn der genaue nächste Termin noch nicht feststeht.', en: 'An open-ended goodbye when the next meeting has not been scheduled.' },
      chunks: [
        { id: 'soredewa-mata-itsuka-goodbye-now-transition', targetText: 'それでは、', baseText: { de: 'also dann,', en: 'well then,' } },
        { id: 'soredewa-mata-itsuka-goodbye-now-again', targetText: 'また', baseText: { de: 'wieder / bis dann', en: 'again / until then' } },
        { id: 'soredewa-mata-itsuka-goodbye-now-someday', targetText: 'いつか。', baseText: { de: 'irgendwann.', en: 'someday.' } },
      ],
      lessonItems: [
        { id: 'soredewa-mata-itsuka-goodbye-now-item-soredewa', targetText: 'それでは', baseText: { de: 'also dann (soredewa)', en: 'well then (soredewa)' }, acceptedAnswers: ['それでは'] },
        { id: 'soredewa-mata-itsuka-goodbye-now-item-mata', targetText: 'また', baseText: { de: 'wieder / bis dann (mata)', en: 'again / see you (mata)' }, acceptedAnswers: ['また'] },
        { id: 'soredewa-mata-itsuka-goodbye-now-item-itsuka', targetText: 'いつか', baseText: { de: 'irgendwann (itsuka)', en: 'someday (itsuka)' }, acceptedAnswers: ['いつか'] },
        { id: 'soredewa-mata-itsuka-goodbye-now-item-tabi', targetText: '旅', baseText: { de: 'Reise (tabi)', en: 'journey / trip (tabi)' }, acceptedAnswers: ['旅', 'たび'] },
      ],
      buildChips: ['それでは、', 'また', 'いつか。', 'きのう', 'まだ です。'],
      typeRecall: {
        before: 'それでは、 また ', answer: 'いつか', after: '。',
        acceptedAnswers: japaneseAccepted('いつか'),
        fallbackChoices: ['いつか', 'きのう', 'だれ', 'なぜ'],
      },
      speakTarget: {
        baseCue: { de: 'Also dann, bis irgendwann.', en: 'Well then, until we meet again someday.' },
        targetPhrase: 'それでは、 また いつか。',
        acceptedAnswers: ['それでは、 また いつか。'],
        requiredTokens: ['それでは、', 'また', 'いつか。'], optionalTokens: [],
      },
      sceneCaption: { de: 'Die Einstiegsanzeige blinkt über der Shinkansen-Sperre, während Koffer und Begleitung auf gegenüberliegenden Seiten warten.', en: 'The boarding indicator blinks above the Shinkansen gate while the suitcase and companion wait on opposite sides.' },
      trophyWord: {
        word: 'いつか', meaning: { de: 'irgendwann', en: 'someday' }, example: 'いつか また 日本へ 行きます。',
        whyThisWord: { de: 'いつか hält ein Wiedersehen offen und hoffnungsvoll, auch wenn noch kein Datum im Kalender steht.', en: 'いつか keeps a future reunion open and hopeful even when no date is on the calendar yet.' },
      },
      placeholderCaption: { de: 'Shinkansen-Sperre mit blinkender Einstiegsanzeige, Koffer auf der Reiseseite und Begleitung dahinter.', en: 'Shinkansen gate with a blinking boarding display, suitcase on the travel side, and a companion beyond it.' },
      songMood: 'open-ended rail farewell',
      visualNotes: 'Shinkansen boarding gate, luggage and companion separated by the barrier, restrained farewell with forward-looking light.',
    }),
  },
]

export const JAPANESE_A1_PRACTICAL_10_LESSONS: GuidedLessonDefinition[] = makeJapanesePracticalLessons(
  GUIDED_TODAY_PATH_JAPANESE_TEN_METADATA,
  japaneseA1Practical10Inputs,
  { de: 'Du hast Japanisch A1 Praxis 10 abgeschlossen und kannst deinen Reisetag herzlich beenden.', en: 'You have completed Japanese A1 Practical 10 and can bring your travel day to a warm close.' },
)
