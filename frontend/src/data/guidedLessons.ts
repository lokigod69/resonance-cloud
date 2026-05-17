import {
  ACTIVE_GUIDED_VIBE_IDS,
  DEFAULT_GUIDED_VIBE_ID,
  isActiveGuidedVibeId,
  type ActiveGuidedVibeId,
  type GuidedVibeId,
} from '@/data/guidedVibes'
import type { TodayProgressState } from '@/lib/todayProgress'

export type LessonMediaType = 'image' | 'video' | 'music_video'

export type GuidedLessonMedia = {
  type: LessonMediaType
  url: string
  posterUrl?: string
  caption: string
}

export type GuidedTargetLanguage = 'English' | 'Spanish' | 'Italian' | 'French'
export type GuidedBaseLanguage = 'German' | 'English'
export type GuidedSpeakLocale = 'en-US' | 'en-GB' | 'es-ES' | 'it-IT' | 'fr-FR'

export type GuidedPathMetadata = {
  id: string
  title: string
  shortTitle: string
  subtitle: string
  level: 'A1'
  baseLanguage: GuidedBaseLanguage
  targetLanguage: GuidedTargetLanguage
  estimatedMinutes: number
}

export type GuidedLessonMetadata = {
  id: string
  sequence: number
  title: string
}

export type PhraseChunk = {
  id: string
  targetText: string
  baseText: string
}

export type GuidedMatchPair = PhraseChunk

export type LessonItem = {
  id: string
  targetText: string
  baseText: string
  acceptedAnswers: string[]
  reviewDistractorIds?: string[]
}

export type GuidedReviewChoice = {
  id: string
  targetText: string
  isCorrect: boolean
}

export type GuidedTypeFallbackChoice = {
  targetText: string
  isCorrect: boolean
}

export type GuidedLessonStep = 'scene' | 'matchPairs' | 'build' | 'type' | 'speak' | 'review' | 'complete'

export type GuidedLessonTrophyWord = {
  word: string
  meaning: string
  example: string
  whyThisWord: string
}

export type GuidedLessonSongSeed = {
  genre: string
  mood: string
}

export type GuidedLessonPlaceholderMedia = {
  type?: LessonMediaType
  url?: string
  posterUrl?: string
  caption?: string
}

export type GuidedLessonVibeVariant = {
  contentStatus: 'final' | 'draft'
  corePhrase: {
    targetText: string
    baseText: string
  }
  meaning: string
  chunks: PhraseChunk[]
  lessonItems: LessonItem[]
  build: {
    targetText: string
    chips: string[]
  }
  typeRecall: {
    before: string
    answer: string
    after: string
    acceptedAnswers: string[]
    fallbackChoices: string[]
  }
  speakTarget: {
    baseCue: string
    targetPhrase: string
    displayAnswer?: string
    germanPrompt?: string
    targetAnswer?: string
    acceptedAnswers?: string[]
    requiredTokens?: string[]
    optionalTokens?: string[]
    maxRecordingSeconds?: number
    language: GuidedSpeakLocale
    passingThreshold: number
  }
  sceneCaption: string
  trophyWord: GuidedLessonTrophyWord
  videoUrl?: string
  placeholderMedia?: GuidedLessonPlaceholderMedia
  songSeed?: GuidedLessonSongSeed
  visualNotes?: string
}

export type GuidedLessonDefinition = {
  id: string
  pathId: string
  courseTitle: string
  level: 'A1'
  lessonNumber: number
  baseLanguage: GuidedBaseLanguage
  targetLanguage: GuidedTargetLanguage
  pathMetadata: GuidedPathMetadata
  lessonMetadata: GuidedLessonMetadata
  title: string
  situation: {
    en: string
    de: string
  }
  pedagogicalGoal: string
  modeSet: 'guided-today-v0'
  steps: GuidedLessonStep[]
  estimatedMinutes: number
  fallbackVibeId: ActiveGuidedVibeId
  status: 'active' | 'coming-soon'
  nextLessonTeaser: {
    title: string
    situation: string
  }
  vibeVariants: Partial<Record<ActiveGuidedVibeId, GuidedLessonVibeVariant>>
}

export type GuidedLesson = GuidedLessonDefinition & {
  courseId: string
  sequence: number
  vibeId: ActiveGuidedVibeId
  variantContentStatus: GuidedLessonVibeVariant['contentStatus']
  variantVisualNotes?: string
  corePhrase: GuidedLessonVibeVariant['corePhrase']
  phraseChunks: PhraseChunk[]
  lessonItems: LessonItem[]
  lessonMedia: GuidedLessonMedia
  build: GuidedLessonVibeVariant['build']
  typeRecall: GuidedLessonVibeVariant['typeRecall']
  speak: GuidedLessonVibeVariant['speakTarget']
  trophyWord: GuidedLessonTrophyWord
  sceneCaption: string
  songSeed?: GuidedLessonSongSeed
}

export type GuidedPathLessonCardStatus = 'complete' | 'current' | 'not-started'

export type GuidedPathLessonOverview = {
  lesson: GuidedLesson
  status: GuidedPathLessonCardStatus
  isRecommended: boolean
  isSelected: boolean
  completedVibeIds: ActiveGuidedVibeId[]
}

export type GuidedPathOverview = {
  pathMetadata: GuidedPathMetadata | undefined
  lessons: GuidedPathLessonOverview[]
  recommendedLesson: GuidedLesson | undefined
  selectedLesson: GuidedLesson | undefined
  completedCount: number
  totalLessons: number
  isComplete: boolean
}

const GUIDED_TODAY_PATH_ONE_METADATA: GuidedPathMetadata = {
  id: 'english-a1-practical-1',
  title: 'English A1 Practical 1',
  shortTitle: 'A1 Practical 1',
  subtitle: 'First Survival Phrases',
  level: 'A1',
  baseLanguage: 'German',
  targetLanguage: 'English',
  estimatedMinutes: 5,
}

const GUIDED_TODAY_PATH_TWO_METADATA: GuidedPathMetadata = {
  id: 'english-a1-practical-2',
  title: 'English A1 Practical 2',
  shortTitle: 'A1 Practical 2',
  subtitle: 'Small Help and Simple Choices',
  level: 'A1',
  baseLanguage: 'German',
  targetLanguage: 'English',
  estimatedMinutes: 5,
}

const GUIDED_TODAY_PATH_THREE_METADATA: GuidedPathMetadata = {
  id: 'english-a1-practical-3',
  title: 'English A1 Practical 3',
  shortTitle: 'A1 Practical 3',
  subtitle: 'Moving Around: Places, Time, Transport',
  level: 'A1',
  baseLanguage: 'German',
  targetLanguage: 'English',
  estimatedMinutes: 5,
}

const GUIDED_TODAY_PATH_FOUR_METADATA: GuidedPathMetadata = {
  id: 'english-a1-practical-4',
  title: 'English A1 Practical 4',
  shortTitle: 'A1 Practical 4',
  subtitle: 'Food, Café, Shop, Small Talk',
  level: 'A1',
  baseLanguage: 'German',
  targetLanguage: 'English',
  estimatedMinutes: 5,
}

const GUIDED_TODAY_PATH_FIVE_METADATA: GuidedPathMetadata = {
  id: 'english-a1-practical-5',
  title: 'English A1 Practical 5',
  shortTitle: 'A1 Practical 5',
  subtitle: 'Simple Problems and Plans',
  level: 'A1',
  baseLanguage: 'German',
  targetLanguage: 'English',
  estimatedMinutes: 5,
}

const GUIDED_TODAY_PATH_SIX_METADATA: GuidedPathMetadata = {
  id: 'english-a1-practical-6',
  title: 'English A1 P6',
  shortTitle: 'A1 Practical 6',
  subtitle: 'Health, Pharmacy, Small Needs',
  level: 'A1',
  baseLanguage: 'German',
  targetLanguage: 'English',
  estimatedMinutes: 5,
}

const GUIDED_TODAY_PATH_SEVEN_METADATA: GuidedPathMetadata = {
  id: 'english-a1-practical-7',
  title: 'English A1 P7',
  shortTitle: 'A1 Practical 7',
  subtitle: 'Travel, Tickets, Simple Movement',
  level: 'A1',
  baseLanguage: 'German',
  targetLanguage: 'English',
  estimatedMinutes: 5,
}

const GUIDED_TODAY_PATH_EIGHT_METADATA: GuidedPathMetadata = {
  id: 'english-a1-practical-8',
  title: 'English A1 P8',
  shortTitle: 'A1 Practical 8',
  subtitle: 'Hotel, Room, Staying Somewhere',
  level: 'A1',
  baseLanguage: 'German',
  targetLanguage: 'English',
  estimatedMinutes: 5,
}

const GUIDED_TODAY_PATH_NINE_METADATA: GuidedPathMetadata = {
  id: 'english-a1-practical-9',
  title: 'English A1 P9',
  shortTitle: 'A1 Practical 9',
  subtitle: 'Meeting People, Simple Plans, Social Coordination',
  level: 'A1',
  baseLanguage: 'German',
  targetLanguage: 'English',
  estimatedMinutes: 5,
}

const GUIDED_TODAY_PATH_TEN_METADATA: GuidedPathMetadata = {
  id: 'english-a1-practical-10',
  title: 'English A1 P10',
  shortTitle: 'A1 Practical 10',
  subtitle: 'Daily Wrap-Up, Small Talk, Leaving Well',
  level: 'A1',
  baseLanguage: 'German',
  targetLanguage: 'English',
  estimatedMinutes: 5,
}

const GUIDED_TODAY_PATH_SPANISH_ONE_METADATA: GuidedPathMetadata = {
  id: 'spanish-a1-practical-1',
  title: 'Spanish A1 Practical 1',
  shortTitle: 'A1 Practical 1',
  subtitle: 'Erste Hilfsphrasen auf Spanisch',
  level: 'A1',
  baseLanguage: 'German',
  targetLanguage: 'Spanish',
  estimatedMinutes: 5,
}

const GUIDED_TODAY_PATH_ITALIAN_ONE_METADATA: GuidedPathMetadata = {
  id: 'italian-a1-practical-1',
  title: 'Italian A1 Practical 1',
  shortTitle: 'A1 Practical 1',
  subtitle: 'Erste Hilfsphrasen auf Italienisch',
  level: 'A1',
  baseLanguage: 'German',
  targetLanguage: 'Italian',
  estimatedMinutes: 5,
}

const GUIDED_TODAY_PATH_ITALIAN_TWO_METADATA: GuidedPathMetadata = {
  id: 'italian-a1-practical-2',
  title: 'Italian A1 Practical 2',
  shortTitle: 'A1 Practical 2',
  subtitle: 'Kleine Bitten am Tresen auf Italienisch',
  level: 'A1',
  baseLanguage: 'German',
  targetLanguage: 'Italian',
  estimatedMinutes: 5,
}

const GUIDED_TODAY_PATH_ITALIAN_THREE_METADATA: GuidedPathMetadata = {
  id: 'italian-a1-practical-3',
  title: 'Italian A1 Practical 3',
  shortTitle: 'A1 Practical 3',
  subtitle: 'Wegweisung und Fortbewegung auf Italienisch',
  level: 'A1',
  baseLanguage: 'German',
  targetLanguage: 'Italian',
  estimatedMinutes: 5,
}

const GUIDED_TODAY_PATH_FRENCH_ONE_METADATA: GuidedPathMetadata = {
  id: 'french-a1-practical-1',
  title: 'French A1 Practical 1',
  shortTitle: 'A1 Practical 1',
  subtitle: 'Erste Hilfsphrasen auf Französisch',
  level: 'A1',
  baseLanguage: 'German',
  targetLanguage: 'French',
  estimatedMinutes: 5,
}

const GUIDED_TODAY_PATH_FRENCH_TWO_METADATA: GuidedPathMetadata = {
  id: 'french-a1-practical-2',
  title: 'French A1 Practical 2',
  shortTitle: 'A1 Practical 2',
  subtitle: 'Kleine Bitten am Tresen auf Französisch',
  level: 'A1',
  baseLanguage: 'German',
  targetLanguage: 'French',
  estimatedMinutes: 5,
}

const GUIDED_TODAY_PATH_FRENCH_THREE_METADATA: GuidedPathMetadata = {
  id: 'french-a1-practical-3',
  title: 'French A1 Practical 3',
  shortTitle: 'A1 Practical 3',
  subtitle: 'Wegweisung und Verkehr auf Französisch',
  level: 'A1',
  baseLanguage: 'German',
  targetLanguage: 'French',
  estimatedMinutes: 5,
}

const GUIDED_TODAY_PATH_FRENCH_FOUR_METADATA: GuidedPathMetadata = {
  id: 'french-a1-practical-4',
  title: 'French A1 Practical 4',
  shortTitle: 'A1 Practical 4',
  subtitle: 'Café und Restaurant auf Französisch',
  level: 'A1',
  baseLanguage: 'German',
  targetLanguage: 'French',
  estimatedMinutes: 5,
}

const GUIDED_TODAY_STEPS: GuidedLessonStep[] = ['scene', 'matchPairs', 'build', 'type', 'speak', 'complete']

const LESSON_001_SPEAK_CORE = {
  displayAnswer: 'Do you speak English?',
  acceptedAnswers: [
    'Do you speak English?',
    'Hi, do you speak English?',
    'Hello, do you speak English?',
    'Hi there, do you speak English?',
  ],
  requiredTokens: ['do', 'you', 'speak', 'english'],
  optionalTokens: ['hi', 'hello', 'there', 'sorry', 'to', 'ask', 'happen', 'quick', 'question'],
}

const brightLesson001: GuidedLessonVibeVariant = {
  contentStatus: "draft",
  corePhrase: {
    targetText: "Hi there, do you speak English?",
    baseText: "Hallo, sprechen Sie Englisch?",
  },
  meaning: "Eine offene, warme erste Frage, bevor du auf Englisch weitersprichst.",
  chunks: [
    { id: "hi-there", targetText: "Hi there", baseText: "Hallo" },
    { id: "do-you-speak", targetText: "do you speak", baseText: "sprechen Sie" },
    { id: "english", targetText: "English", baseText: "Englisch" },
  ],
  lessonItems: [
    { id: "hi-there", targetText: "hi there", baseText: "hallo", acceptedAnswers: ["hi there", "hi"] },
    { id: "do-you-speak", targetText: "do you speak", baseText: "sprechen Sie", acceptedAnswers: ["do you speak"] },
    { id: "english", targetText: "English", baseText: "Englisch", acceptedAnswers: ["English", "english"] },
    { id: "delighted", targetText: "delighted", baseText: "erfreut", acceptedAnswers: ["delighted"] },
    { id: "glad", targetText: "glad", baseText: "froh", acceptedAnswers: ["glad"] },
  ],
  build: {
    targetText: "Hi there, do you speak English?",
    chips: ["Hi there,", "do you speak", "English?", "delighted", "glad"],
  },
  typeRecall: {
    before: "Hi there, do you ",
    answer: "speak",
    after: " English?",
    acceptedAnswers: ["speak", "Speak"],
    fallbackChoices: ["speak", "do you speak", "English", "German"],
  },
  speakTarget: {
    baseCue: "Hallo, sprechen Sie Englisch?",
    targetPhrase: "Hi there, do you speak English?",
    language: "en-US",
    passingThreshold: 0.8,
    ...LESSON_001_SPEAK_CORE,
  },
  sceneCaption: "Morgenlicht im Café, ein offener Blick, und die erste Frage klingt wie ein freundlicher Start.",
  trophyWord: {
    word: "delighted",
    meaning: "erfreut",
    example: "Delighted to meet you.",
    whyThisWord: "Delighted gibt dem ersten Kontakt Brights volle soziale Wärme.",
  },
  placeholderMedia: {
    type: "video",
    caption: "Goldenes Cafélicht, offenes Fenster, kurzer Gruß vor der Frage.",
  },
  songSeed: {
    genre: "sunny indie pop",
    mood: "warm first contact",
  },
  visualNotes: "Warm whites, honey light, soft coral accent on Hi there.",
}

const brightLesson002: GuidedLessonVibeVariant = {
  contentStatus: "draft",
  corePhrase: {
    targetText: "Sorry, could you say that again? Thanks so much.",
    baseText: "Entschuldigung, könnten Sie das noch einmal sagen? Vielen Dank.",
  },
  meaning: "Eine warme Bitte, etwas noch einmal zu hören, mit echtem Dank danach.",
  chunks: [
    { id: "sorry", targetText: "Sorry", baseText: "Entschuldigung" },
    { id: "could-you-say-that-again", targetText: "could you say that again", baseText: "könnten Sie das noch einmal sagen" },
    { id: "thanks-so-much", targetText: "Thanks so much", baseText: "vielen Dank" },
  ],
  lessonItems: [
    { id: "sorry", targetText: "sorry", baseText: "Entschuldigung", acceptedAnswers: ["sorry"] },
    { id: "could-you", targetText: "could you", baseText: "könnten Sie", acceptedAnswers: ["could you"] },
    { id: "again", targetText: "again", baseText: "noch einmal", acceptedAnswers: ["again"] },
    { id: "thanks-so-much", targetText: "thanks so much", baseText: "vielen Dank", acceptedAnswers: ["thanks so much", "thank you so much"] },
    { id: "marvelous", targetText: "marvelous", baseText: "großartig", acceptedAnswers: ["marvelous"] },
  ],
  build: {
    targetText: "Sorry, could you say that again? Thanks so much.",
    chips: ["Sorry,", "could you say that", "again?", "Thanks so much.", "marvelous"],
  },
  typeRecall: {
    before: "Sorry, could you say that ",
    answer: "again",
    after: "? Thanks so much.",
    acceptedAnswers: ["again", "Again"],
    fallbackChoices: ["again", "marvelous", "English", "ready"],
  },
  speakTarget: {
    baseCue: "Entschuldigung, könnten Sie das noch einmal sagen? Vielen Dank.",
    targetPhrase: "Sorry, could you say that again? Thanks so much.",
    language: "en-US",
    passingThreshold: 0.8,
  },
  sceneCaption: "Die Nachfrage bleibt hell: kurz bitten, dann sofort großzügig danken.",
  trophyWord: {
    word: "marvelous",
    meaning: "großartig",
    example: "Marvelous, thank you.",
    whyThisWord: "Marvelous macht die Wiederholung zu einem gelungenen kleinen Moment.",
  },
  placeholderMedia: {
    type: "video",
    caption: "Helles Café, Barista wiederholt geduldig, der Dank kommt direkt danach.",
  },
  songSeed: {
    genre: "upbeat acoustic",
    mood: "patient and sunny",
  },
  visualNotes: "Soft bloom on Thanks so much, warm yellow replay pulse, generous spacing.",
}

const brightLesson003: GuidedLessonVibeVariant = {
  contentStatus: "draft",
  corePhrase: {
    targetText: "Hi, could you help me? Where is the station?",
    baseText: "Hallo, könnten Sie mir helfen? Wo ist der Bahnhof?",
  },
  meaning: "Eine offene Wegfrage, die Hilfe freundlich einlädt.",
  chunks: [
    { id: "hi", targetText: "Hi", baseText: "hallo" },
    { id: "could-you-help-me", targetText: "could you help me", baseText: "könnten Sie mir helfen" },
    { id: "where-is-the-station", targetText: "where is the station", baseText: "wo ist der Bahnhof" },
  ],
  lessonItems: [
    { id: "hi", targetText: "hi", baseText: "hallo", acceptedAnswers: ["hi"] },
    { id: "help-me", targetText: "help me", baseText: "mir helfen", acceptedAnswers: ["help me"] },
    { id: "where", targetText: "where", baseText: "wo", acceptedAnswers: ["where"] },
    { id: "station", targetText: "station", baseText: "Bahnhof", acceptedAnswers: ["station"] },
    { id: "glad", targetText: "glad", baseText: "froh", acceptedAnswers: ["glad"] },
  ],
  build: {
    targetText: "Hi, could you help me? Where is the station?",
    chips: ["Hi,", "could you help me?", "Where is", "the station?", "glad"],
  },
  typeRecall: {
    before: "Hi, could you help me? Where is the ",
    answer: "station",
    after: "?",
    acceptedAnswers: ["station", "Station"],
    fallbackChoices: ["station", "café", "glad", "wonderful"],
  },
  speakTarget: {
    baseCue: "Hallo, könnten Sie mir helfen? Wo ist der Bahnhof?",
    targetPhrase: "Hi, could you help me? Where is the station?",
    language: "en-US",
    passingThreshold: 0.8,
  },
  sceneCaption: "Auf der Straße geht Bright zuerst auf den Menschen zu, dann auf das Ziel.",
  trophyWord: {
    word: "glad",
    meaning: "froh",
    example: "I'm glad you can help.",
    whyThisWord: "Glad zeigt Brights soziale Offenheit: Hilfe wird willkommen geheißen, nicht nur benutzt.",
  },
  placeholderMedia: {
    type: "video",
    caption: "Sonnige Straßenecke, offener Stand, ein sichtbares Bahnhofsschild in der Ferne.",
  },
  songSeed: {
    genre: "sunny indie pop",
    mood: "open and moving",
  },
  visualNotes: "Golden directional line, warm map cue, smile before the station question.",
}

const brightLesson004: GuidedLessonVibeVariant = {
  contentStatus: "draft",
  corePhrase: {
    targetText: "I'd love a coffee, please.",
    baseText: "Ich hätte sehr gern einen Kaffee, bitte.",
  },
  meaning: "Eine freundliche Bestellung, die wirklich gern gesagt klingt.",
  chunks: [
    { id: "id-love", targetText: "I'd love", baseText: "ich hätte sehr gern" },
    { id: "a-coffee", targetText: "a coffee", baseText: "einen Kaffee" },
    { id: "please", targetText: "please", baseText: "bitte" },
  ],
  lessonItems: [
    { id: "id-love", targetText: "I'd love", baseText: "ich hätte sehr gern", acceptedAnswers: ["I'd love", "I would love", "id love"] },
    { id: "coffee", targetText: "coffee", baseText: "Kaffee", acceptedAnswers: ["coffee"] },
    { id: "please", targetText: "please", baseText: "bitte", acceptedAnswers: ["please"] },
    { id: "eager", targetText: "eager", baseText: "eifrig", acceptedAnswers: ["eager"] },
    { id: "ready", targetText: "ready", baseText: "bereit", acceptedAnswers: ["ready"] },
  ],
  build: {
    targetText: "I'd love a coffee, please.",
    chips: ["I'd love", "a coffee,", "please.", "eager", "ready"],
  },
  typeRecall: {
    before: "I'd love a ",
    answer: "coffee",
    after: ", please.",
    acceptedAnswers: ["coffee", "Coffee"],
    fallbackChoices: ["coffee", "tea", "eager", "lovely"],
  },
  speakTarget: {
    baseCue: "Ich hätte sehr gern einen Kaffee, bitte.",
    targetPhrase: "I'd love a coffee, please.",
    language: "en-US",
    passingThreshold: 0.8,
  },
  sceneCaption: "Am Tresen klingt die Bestellung nach Vorfreude, nicht nach Pflicht.",
  trophyWord: {
    word: "eager",
    meaning: "eifrig",
    example: "I'm eager to try it.",
    whyThisWord: "Eager ist Brights Bestellenergie: freundlich, bereit und sichtbar interessiert.",
  },
  placeholderMedia: {
    type: "video",
    caption: "Frischer Kaffee, warmes Morgenlicht, Bestellung mit sichtbarer Vorfreude.",
  },
  songSeed: {
    genre: "upbeat acoustic",
    mood: "fresh and eager",
  },
  visualNotes: "Coffee object cue, peach highlight, gentle blooming confirmation.",
}

const brightLesson005: GuidedLessonVibeVariant = {
  contentStatus: "draft",
  corePhrase: {
    targetText: "How much is this? Lovely, thanks!",
    baseText: "Wie viel kostet das? Prima, danke!",
  },
  meaning: "Eine Preisfrage mit einem warmen, schnellen Dank danach.",
  chunks: [
    { id: "how-much", targetText: "How much", baseText: "wie viel" },
    { id: "is-this", targetText: "is this", baseText: "kostet das" },
    { id: "lovely-thanks", targetText: "Lovely, thanks", baseText: "prima, danke" },
  ],
  lessonItems: [
    { id: "how-much", targetText: "how much", baseText: "wie viel", acceptedAnswers: ["how much"] },
    { id: "this", targetText: "this", baseText: "das hier", acceptedAnswers: ["this"] },
    { id: "price", targetText: "price", baseText: "Preis", acceptedAnswers: ["price"] },
    { id: "lovely", targetText: "lovely", baseText: "prima", acceptedAnswers: ["lovely"] },
    { id: "splendid", targetText: "splendid", baseText: "großartig", acceptedAnswers: ["splendid"] },
  ],
  build: {
    targetText: "How much is this? Lovely, thanks!",
    chips: ["How much", "is this?", "Lovely,", "thanks!", "splendid"],
  },
  typeRecall: {
    before: "",
    answer: "How much",
    after: " is this? Lovely, thanks!",
    acceptedAnswers: ["How much", "how much"],
    fallbackChoices: ["How much", "is this", "splendid", "lovely"],
  },
  speakTarget: {
    baseCue: "Wie viel kostet das? Prima, danke!",
    targetPhrase: "How much is this? Lovely, thanks!",
    language: "en-US",
    passingThreshold: 0.8,
  },
  sceneCaption: "Im Laden fragt Bright nach dem Preis und macht die Antwort sofort zu einem kleinen Plus.",
  trophyWord: {
    word: "splendid",
    meaning: "großartig",
    example: "Splendid, thanks!",
    whyThisWord: "Splendid gibt der Preisfrage einen hellen Abschluss, ohne vom Preis abzulenken.",
  },
  placeholderMedia: {
    type: "video",
    caption: "Sonniger Laden, klares Preisschild, kurzer warmer Dank nach der Antwort.",
  },
  songSeed: {
    genre: "sunny indie pop",
    mood: "quick and pleased",
  },
  visualNotes: "Warm price tag highlight, bright thank-you beat, soft coral confirmation.",
}

const brightLesson006: GuidedLessonVibeVariant = {
  contentStatus: "draft",
  corePhrase: {
    targetText: "Hi! What time is the train, please?",
    baseText: "Hallo! Wann fährt der Zug bitte?",
  },
  meaning: "Eine helle, kurze Frage nach der Abfahrtszeit.",
  chunks: [
    { id: "hi", targetText: "Hi", baseText: "hallo" },
    { id: "what-time-is-the-train", targetText: "what time is the train", baseText: "wann fährt der Zug" },
    { id: "please", targetText: "please", baseText: "bitte" },
  ],
  lessonItems: [
    { id: "hi", targetText: "hi", baseText: "hallo", acceptedAnswers: ["hi"] },
    { id: "train", targetText: "train", baseText: "Zug", acceptedAnswers: ["train"] },
    { id: "time", targetText: "time", baseText: "Uhrzeit", acceptedAnswers: ["time"] },
    { id: "please", targetText: "please", baseText: "bitte", acceptedAnswers: ["please"] },
    { id: "ready", targetText: "ready", baseText: "bereit", acceptedAnswers: ["ready"] },
  ],
  build: {
    targetText: "Hi! What time is the train, please?",
    chips: ["Hi!", "What time is", "the train,", "please?", "ready"],
  },
  typeRecall: {
    before: "Hi! What time is the ",
    answer: "train",
    after: ", please?",
    acceptedAnswers: ["train", "Train"],
    fallbackChoices: ["train", "station", "ready", "wonderful"],
  },
  speakTarget: {
    baseCue: "Hallo! Wann fährt der Zug bitte?",
    targetPhrase: "Hi! What time is the train, please?",
    language: "en-US",
    passingThreshold: 0.8,
  },
  sceneCaption: "Am Bahnhof hält Bright die Energie oben: schnell fragen, bereit weitergehen.",
  trophyWord: {
    word: "platform",
    meaning: "Bahnsteig",
    example: "Which platform?",
    whyThisWord: "Platform ist ein konkretes A1-Reisewort für die Bahnhofs-Szene.",
  },
  placeholderMedia: {
    type: "video",
    caption: "Helle Bahnhofshalle, warmes Fensterlicht, Uhr und Zuganzeige klar sichtbar.",
  },
  songSeed: {
    genre: "upbeat acoustic",
    mood: "ready and moving",
  },
  visualNotes: "Golden time highlight, generous spacing around the train cue, buoyant motion.",
}

const brightLesson007: GuidedLessonVibeVariant = {
  contentStatus: "draft",
  corePhrase: {
    targetText: "Hi, could you help me, please?",
    baseText: "Hallo, könnten Sie mir bitte helfen?",
  },
  meaning: "Eine freundliche Bitte um Hilfe, offen und klar.",
  chunks: [
    { id: "hi", targetText: "Hi", baseText: "hallo" },
    { id: "could-you-help-me", targetText: "could you help me", baseText: "könnten Sie mir helfen" },
    { id: "please", targetText: "please", baseText: "bitte" },
  ],
  lessonItems: [
    { id: "hi", targetText: "hi", baseText: "hallo", acceptedAnswers: ["hi"] },
    { id: "help-me", targetText: "help me", baseText: "mir helfen", acceptedAnswers: ["help me"] },
    { id: "please", targetText: "please", baseText: "bitte", acceptedAnswers: ["please"] },
    { id: "lovely", targetText: "lovely", baseText: "lieb", acceptedAnswers: ["lovely"] },
    { id: "wonderful", targetText: "wonderful", baseText: "wunderbar", acceptedAnswers: ["wonderful"] },
  ],
  build: {
    targetText: "Hi, could you help me, please?",
    chips: ["Hi,", "could you help me,", "please?", "lovely", "wonderful"],
  },
  typeRecall: {
    before: "Hi, could you ",
    answer: "help me",
    after: ", please?",
    acceptedAnswers: ["help me", "Help me"],
    fallbackChoices: ["help me", "please", "lovely", "wonderful"],
  },
  speakTarget: {
    baseCue: "Hallo, könnten Sie mir bitte helfen?",
    targetPhrase: "Hi, could you help me, please?",
    language: "en-US",
    passingThreshold: 0.8,
  },
  sceneCaption: "An der Theke fragt Bright um Hilfe, als würde Hilfe gleich möglich werden.",
  trophyWord: {
    word: "lovely",
    meaning: "lieb",
    example: "How lovely of you to help.",
    whyThisWord: "Lovely macht Hilfe persönlich warm, ohne die Bitte länger zu machen.",
  },
  placeholderMedia: {
    type: "video",
    caption: "Warmer Infotresen, sichtbarer Blickkontakt, freundlicher erster Satz.",
  },
  songSeed: {
    genre: "sunny indie pop",
    mood: "warm and supported",
  },
  visualNotes: "Soft coral help cue, golden glow near the counter, open posture.",
}

const brightLesson008: GuidedLessonVibeVariant = {
  contentStatus: "draft",
  corePhrase: {
    targetText: "I love it here.",
    baseText: "Ich finde es hier wunderschön.",
  },
  meaning: "Ein kurzer, begeisterter Small-Talk-Satz über den Ort.",
  chunks: [
    { id: "i-love", targetText: "I love", baseText: "ich finde wunderschön" },
    { id: "it-here", targetText: "it here", baseText: "es hier" },
  ],
  lessonItems: [
    { id: "i-love", targetText: "I love", baseText: "ich liebe / ich finde toll", acceptedAnswers: ["I love", "i love"] },
    { id: "it", targetText: "it", baseText: "es", acceptedAnswers: ["it"] },
    { id: "here", targetText: "here", baseText: "hier", acceptedAnswers: ["here"] },
    { id: "nice", targetText: "nice", baseText: "schön / nett", acceptedAnswers: ["nice"] },
    { id: "place", targetText: "place", baseText: "Ort", acceptedAnswers: ["place"] },
  ],
  build: {
    targetText: "I love it here.",
    chips: ["I love", "it", "here.", "nice", "place"],
  },
  typeRecall: {
    before: "",
    answer: "I love",
    after: " it here.",
    acceptedAnswers: ["I love", "i love"],
    fallbackChoices: ["I love", "it here", "nice", "place"],
  },
  speakTarget: {
    baseCue: "Ich finde es hier wunderschön.",
    targetPhrase: "I love it here.",
    language: "en-US",
    passingThreshold: 0.8,
  },
  sceneCaption: "Bright sagt Small Talk nicht halb: der Ort bekommt ein echtes kleines Kompliment.",
  trophyWord: {
    word: "charming",
    meaning: "charmant",
    example: "What a charming place.",
    whyThisWord: "Charming macht den Small Talk spezifisch: Bright bemerkt den Ort und würdigt ihn.",
  },
  placeholderMedia: {
    type: "video",
    caption: "Morgensonne im Raum, warmes Lächeln, ein klares Kompliment.",
  },
  songSeed: {
    genre: "soft folk-pop",
    mood: "delighted and social",
  },
  visualNotes: "Golden bloom on love, generous whitespace, soft coral social accent.",
}

const brightLesson009: GuidedLessonVibeVariant = {
  contentStatus: "draft",
  corePhrase: {
    targetText: "Tomorrow at seven? Wonderful!",
    baseText: "Morgen um sieben? Wunderbar!",
  },
  meaning: "Eine warme Zusage für einen Plan am nächsten Tag.",
  chunks: [
    { id: "tomorrow", targetText: "Tomorrow", baseText: "morgen" },
    { id: "at-seven", targetText: "at seven", baseText: "um sieben" },
    { id: "wonderful", targetText: "Wonderful", baseText: "wunderbar" },
  ],
  lessonItems: [
    { id: "tomorrow", targetText: "tomorrow", baseText: "morgen", acceptedAnswers: ["tomorrow"] },
    { id: "seven", targetText: "seven", baseText: "sieben", acceptedAnswers: ["seven", "7"] },
    { id: "brilliant", targetText: "brilliant", baseText: "brillant", acceptedAnswers: ["brilliant"] },
    { id: "ready", targetText: "ready", baseText: "bereit", acceptedAnswers: ["ready"] },
    { id: "glad", targetText: "glad", baseText: "froh", acceptedAnswers: ["glad"] },
  ],
  build: {
    targetText: "Tomorrow at seven? Wonderful!",
    chips: ["Tomorrow", "at seven?", "Wonderful!", "ready", "glad"],
  },
  typeRecall: {
    before: "Tomorrow at seven? ",
    answer: "Wonderful",
    after: "!",
    acceptedAnswers: ["Wonderful", "wonderful"],
    fallbackChoices: ["Wonderful", "Ready", "Glad", "Now"],
  },
  speakTarget: {
    baseCue: "Morgen um sieben? Wunderbar!",
    targetPhrase: "Tomorrow at seven? Wonderful!",
    language: "en-US",
    passingThreshold: 0.8,
  },
  sceneCaption: "Beim Planen nimmt Bright die Uhrzeit und macht daraus Vorfreude.",
  trophyWord: {
    word: "wonderful",
    meaning: "wunderbar",
    example: "Tomorrow at seven? Wonderful!",
    whyThisWord: "Wonderful ist hier nicht Füllwort, sondern Brights klare Zusage mit Energie.",
  },
  placeholderMedia: {
    type: "video",
    caption: "Heller Kalenderblick, sieben Uhr markiert, warmer bestätigender Moment.",
  },
  songSeed: {
    genre: "sunny indie pop",
    mood: "forward and delighted",
  },
  visualNotes: "Golden calendar highlight, light bloom on Wonderful, buoyant confirmation state.",
}

const brightLesson010: GuidedLessonVibeVariant = {
  contentStatus: "draft",
  corePhrase: {
    targetText: "How wonderful! Thanks so much. Goodbye!",
    baseText: "Wie wunderbar! Vielen Dank. Auf Wiedersehen!",
  },
  meaning: "Ein großzügiger Abschluss nach erhaltener Hilfe.",
  chunks: [
    { id: "how-wonderful", targetText: "How wonderful", baseText: "wie wunderbar" },
    { id: "thanks-so-much", targetText: "Thanks so much", baseText: "vielen Dank" },
    { id: "goodbye", targetText: "Goodbye", baseText: "auf Wiedersehen" },
  ],
  lessonItems: [
    { id: "wonderful", targetText: "wonderful", baseText: "wunderbar", acceptedAnswers: ["wonderful"] },
    { id: "thanks-so-much", targetText: "thanks so much", baseText: "vielen Dank", acceptedAnswers: ["thanks so much", "thank you so much"] },
    { id: "goodbye", targetText: "goodbye", baseText: "auf Wiedersehen", acceptedAnswers: ["goodbye", "good bye"] },
    { id: "lovely", targetText: "lovely", baseText: "schön", acceptedAnswers: ["lovely"] },
    { id: "sparkling", targetText: "sparkling", baseText: "funkelnd", acceptedAnswers: ["sparkling"] },
  ],
  build: {
    targetText: "How wonderful! Thanks so much. Goodbye!",
    chips: ["How wonderful!", "Thanks so much.", "Goodbye!", "lovely", "brilliant"],
  },
  typeRecall: {
    before: "How ",
    answer: "wonderful",
    after: "! Thanks so much. Goodbye!",
    acceptedAnswers: ["wonderful", "Wonderful"],
    fallbackChoices: ["wonderful", "lovely", "brilliant", "ready"],
  },
  speakTarget: {
    baseCue: "Wie wunderbar! Vielen Dank. Auf Wiedersehen!",
    targetPhrase: "How wonderful! Thanks so much. Goodbye!",
    language: "en-US",
    passingThreshold: 0.8,
  },
  sceneCaption: "Der Abschied hat Lift: verstanden, froh, dankbar, weiter in den Tag.",
  trophyWord: {
    word: "brilliant",
    meaning: "brillant",
    example: "Brilliant, thanks so much.",
    whyThisWord: "Brilliant gibt dem Abschluss Brights helle, schnelle Dankesenergie.",
  },
  placeholderMedia: {
    type: "video",
    caption: "Goldenes Licht an Tür oder Tresen, ein dankbarer Abschied mit sichtbarer Wärme.",
  },
  songSeed: {
    genre: "soft folk-pop",
    mood: "warm closure",
  },
  visualNotes: "Warm completion bloom, honey-and-coral palette, buoyant goodbye gesture.",
}

const wistfulLesson001: GuidedLessonVibeVariant = {
  contentStatus: "draft",
  corePhrase: {
    targetText: "Sorry to ask — do you happen to speak English?",
    baseText: "Entschuldigung, darf ich fragen: Sprechen Sie vielleicht Englisch?",
  },
  meaning: "Eine vorsichtige erste Frage, wenn du nicht sicher bist, ob du verstanden wirst.",
  chunks: [
    { id: "sorry-to-ask", targetText: "Sorry to ask", baseText: "Entschuldigung, darf ich fragen" },
    { id: "do-you-happen-to-speak", targetText: "do you happen to speak", baseText: "sprechen Sie vielleicht" },
    { id: "english", targetText: "English", baseText: "Englisch" },
  ],
  lessonItems: [
    { id: "sorry-to-ask", targetText: "sorry to ask", baseText: "Entschuldigung, darf ich fragen", acceptedAnswers: ["sorry to ask"] },
    { id: "happen-to", targetText: "happen to", baseText: "vielleicht", acceptedAnswers: ["happen to"] },
    { id: "speak", targetText: "speak", baseText: "sprechen", acceptedAnswers: ["speak"] },
    { id: "english", targetText: "English", baseText: "Englisch", acceptedAnswers: ["English", "english"] },
    { id: "gently", targetText: "gently", baseText: "behutsam", acceptedAnswers: ["gently"] },
  ],
  build: {
    targetText: "Sorry to ask — do you happen to speak English?",
    chips: ["Sorry to ask —", "do you happen to", "speak English?", "gently", "perhaps"],
  },
  typeRecall: {
    before: "Sorry to ask — do you happen to ",
    answer: "speak",
    after: " English?",
    acceptedAnswers: ["speak", "Speak"],
    fallbackChoices: ["speak", "happen to speak", "gently", "perhaps"],
  },
  speakTarget: {
    baseCue: "Entschuldigung, darf ich fragen: Sprechen Sie vielleicht Englisch?",
    targetPhrase: "Sorry to ask — do you happen to speak English?",
    language: "en-US",
    passingThreshold: 0.8,
    ...LESSON_001_SPEAK_CORE,
  },
  sceneCaption: "Am Café-Eingang steht die Frage einen Atemzug lang im Raum, bevor sie gesprochen wird.",
  trophyWord: {
    word: "gently",
    meaning: "behutsam",
    example: "Ask gently.",
    whyThisWord: "Gently gibt der ersten Frage Wistfuls leisen Mut, ohne sie unbrauchbar zu machen.",
  },
  placeholderMedia: {
    type: "video",
    caption: "Spätnachmittag am Caféfenster, ein kurzer Halt an der Schwelle, dann die Frage.",
  },
  songSeed: {
    genre: "ambient piano",
    mood: "tentative and soft",
  },
  visualNotes: "Muted blue-gray threshold, rain-bright window, slow fade before the phrase appears.",
}

const wistfulLesson002: GuidedLessonVibeVariant = {
  contentStatus: "draft",
  corePhrase: {
    targetText: "Perhaps a little more slowly?",
    baseText: "Vielleicht ein wenig langsamer?",
  },
  meaning: "Eine leise Bitte, damit du die Worte noch einmal langsamer hören kannst.",
  chunks: [
    { id: "perhaps", targetText: "Perhaps", baseText: "vielleicht" },
    { id: "a-little-more", targetText: "a little more", baseText: "ein wenig mehr" },
    { id: "slowly", targetText: "slowly", baseText: "langsam" },
  ],
  lessonItems: [
    { id: "perhaps", targetText: "perhaps", baseText: "vielleicht", acceptedAnswers: ["perhaps"] },
    { id: "a-little", targetText: "a little", baseText: "ein wenig", acceptedAnswers: ["a little", "little"] },
    { id: "more", targetText: "more", baseText: "mehr", acceptedAnswers: ["more"] },
    { id: "slowly", targetText: "slowly", baseText: "langsam", acceptedAnswers: ["slowly"] },
    { id: "again", targetText: "again", baseText: "noch einmal", acceptedAnswers: ["again"] },
  ],
  build: {
    targetText: "Perhaps a little more slowly?",
    chips: ["Perhaps", "a little more", "slowly?", "again", "soft"],
  },
  typeRecall: {
    before: "Perhaps a little more ",
    answer: "slowly",
    after: "?",
    acceptedAnswers: ["slowly", "Slowly"],
    fallbackChoices: ["slowly", "gently", "quickly", "perhaps"],
  },
  speakTarget: {
    baseCue: "Vielleicht ein wenig langsamer?",
    targetPhrase: "Perhaps a little more slowly?",
    language: "en-US",
    passingThreshold: 0.8,
  },
  sceneCaption: "Die Wiederholung wird nicht gefordert, sondern vorsichtig erbeten.",
  trophyWord: {
    word: "slowly",
    meaning: "langsam",
    example: "Slowly, please.",
    whyThisWord: "Slowly ist Wistfuls wichtigste Lernbitte: mehr Zeit, weniger Druck.",
  },
  placeholderMedia: {
    type: "video",
    caption: "Halbleeres Café nach dem Regen, geduldige Wiederholung, eine Tasse Tee kühlt ab.",
  },
  songSeed: {
    genre: "soft indie folk",
    mood: "patient and fragile",
  },
  visualNotes: "Slow replay fade, dusty white caption space, low-contrast background.",
}

const wistfulLesson003: GuidedLessonVibeVariant = {
  contentStatus: "draft",
  corePhrase: {
    targetText: "Sorry, I'm a little lost. Where is the station?",
    baseText: "Entschuldigung, ich habe mich ein wenig verlaufen. Wo ist der Bahnhof?",
  },
  meaning: "Eine ehrliche Wegfrage, wenn du kurz die Orientierung verloren hast.",
  chunks: [
    { id: "sorry", targetText: "Sorry", baseText: "Entschuldigung" },
    { id: "im-a-little-lost", targetText: "I'm a little lost", baseText: "ich habe mich ein wenig verlaufen" },
    { id: "where-is-the-station", targetText: "Where is the station", baseText: "wo ist der Bahnhof" },
  ],
  lessonItems: [
    { id: "sorry", targetText: "sorry", baseText: "Entschuldigung", acceptedAnswers: ["sorry"] },
    { id: "little", targetText: "a little", baseText: "ein wenig", acceptedAnswers: ["a little", "little"] },
    { id: "lost", targetText: "lost", baseText: "verlaufen", acceptedAnswers: ["lost"] },
    { id: "where", targetText: "where", baseText: "wo", acceptedAnswers: ["where"] },
    { id: "station", targetText: "station", baseText: "Bahnhof", acceptedAnswers: ["station"] },
  ],
  build: {
    targetText: "Sorry, I'm a little lost. Where is the station?",
    chips: ["Sorry,", "I'm a little lost.", "Where is", "the station?", "perhaps"],
  },
  typeRecall: {
    before: "Sorry, I'm a little ",
    answer: "lost",
    after: ". Where is the station?",
    acceptedAnswers: ["lost", "Lost"],
    fallbackChoices: ["lost", "quiet", "almost", "station"],
  },
  speakTarget: {
    baseCue: "Entschuldigung, ich habe mich ein wenig verlaufen. Wo ist der Bahnhof?",
    targetPhrase: "Sorry, I'm a little lost. Where is the station?",
    language: "en-US",
    passingThreshold: 0.8,
  },
  sceneCaption: "Auf der Straße wird die Unsicherheit klein ausgesprochen, gerade genug, um Hilfe zu finden.",
  trophyWord: {
    word: "lost",
    meaning: "verlaufen",
    example: "I'm a little lost.",
    whyThisWord: "Lost ist der ausdrückliche Zielbegriff dieser Lektion: verletzlich, aber sofort nützlich.",
  },
  placeholderMedia: {
    type: "video",
    caption: "Nasse Straße im späten Licht, kurze Pause, Bahnhofsschild noch nicht sichtbar.",
  },
  songSeed: {
    genre: "slow strings",
    mood: "searching and quiet",
  },
  visualNotes: "Slate street tones, misted edge, soft directional cue emerging after the pause.",
}

const wistfulLesson004: GuidedLessonVibeVariant = {
  contentStatus: "draft",
  corePhrase: {
    targetText: "Could I have a tea, please? Something simple.",
    baseText: "Könnte ich bitte einen Tee haben? Etwas Einfaches.",
  },
  meaning: "Eine zurückhaltende Bestellung, klein und leicht zu sagen.",
  chunks: [
    { id: "could-i-have", targetText: "Could I have", baseText: "könnte ich haben" },
    { id: "a-tea-please", targetText: "a tea, please", baseText: "einen Tee, bitte" },
    { id: "something-simple", targetText: "Something simple", baseText: "etwas Einfaches" },
  ],
  lessonItems: [
    { id: "could-i-have", targetText: "could I have", baseText: "könnte ich haben", acceptedAnswers: ["could I have", "could i have"] },
    { id: "tea", targetText: "tea", baseText: "Tee", acceptedAnswers: ["tea"] },
    { id: "simple", targetText: "simple", baseText: "einfach", acceptedAnswers: ["simple"] },
    { id: "quiet", targetText: "quiet", baseText: "ruhig", acceptedAnswers: ["quiet"] },
    { id: "soft", targetText: "soft", baseText: "sanft", acceptedAnswers: ["soft"] },
  ],
  build: {
    targetText: "Could I have a tea, please? Something simple.",
    chips: ["Could I have", "a tea, please?", "Something simple.", "quiet", "soft"],
  },
  typeRecall: {
    before: "Could I have a ",
    answer: "tea",
    after: ", please? Something simple.",
    acceptedAnswers: ["tea", "Tea"],
    fallbackChoices: ["tea", "coffee", "quiet", "almost"],
  },
  speakTarget: {
    baseCue: "Könnte ich bitte einen Tee haben? Etwas Einfaches.",
    targetPhrase: "Could I have a tea, please? Something simple.",
    language: "en-US",
    passingThreshold: 0.8,
  },
  sceneCaption: "Die Bestellung sucht keinen Auftritt, nur eine ruhige Tasse und etwas Einfaches.",
  trophyWord: {
    word: "quiet",
    meaning: "ruhig",
    example: "A quiet table, please.",
    whyThisWord: "Quiet trägt die Restaurantszene: wenig verlangen, aber klar genug bleiben.",
  },
  placeholderMedia: {
    type: "video",
    caption: "Tee in einer schlichten Tasse, altes Holz, ein Fenster nach dem Regen.",
  },
  songSeed: {
    genre: "ambient piano",
    mood: "small and inward",
  },
  visualNotes: "Dusty white menu card, faded green table edge, slow steam from tea.",
}

const wistfulLesson005: GuidedLessonVibeVariant = {
  contentStatus: "draft",
  corePhrase: {
    targetText: "Just a small question — how much for this?",
    baseText: "Nur eine kleine Frage: Wie viel kostet das hier?",
  },
  meaning: "Eine vorsichtige Preisfrage für einen Gegenstand im Laden.",
  chunks: [
    { id: "just-a-small-question", targetText: "Just a small question", baseText: "nur eine kleine Frage" },
    { id: "how-much", targetText: "how much", baseText: "wie viel" },
    { id: "for-this", targetText: "for this", baseText: "für das hier" },
  ],
  lessonItems: [
    { id: "just", targetText: "just", baseText: "nur", acceptedAnswers: ["just"] },
    { id: "small-question", targetText: "small question", baseText: "kleine Frage", acceptedAnswers: ["small question"] },
    { id: "how-much", targetText: "how much", baseText: "wie viel", acceptedAnswers: ["how much"] },
    { id: "this", targetText: "this", baseText: "das hier", acceptedAnswers: ["this"] },
    { id: "perhaps", targetText: "perhaps", baseText: "vielleicht", acceptedAnswers: ["perhaps"] },
  ],
  build: {
    targetText: "Just a small question — how much for this?",
    chips: ["Just a small question —", "how much", "for this?", "perhaps", "quiet"],
  },
  typeRecall: {
    before: "Just a small question — ",
    answer: "how much",
    after: " for this?",
    acceptedAnswers: ["how much", "How much"],
    fallbackChoices: ["how much", "for this", "perhaps", "slowly"],
  },
  speakTarget: {
    baseCue: "Nur eine kleine Frage: Wie viel kostet das hier?",
    targetPhrase: "Just a small question — how much for this?",
    language: "en-US",
    passingThreshold: 0.8,
  },
  sceneCaption: "Die Preisfrage bleibt halb zurückhaltend, halb notwendig.",
  trophyWord: {
    word: "perhaps",
    meaning: "vielleicht",
    example: "Perhaps this one.",
    whyThisWord: "Perhaps gibt Wistful eine leise Unsicherheit, ohne die Preisfrage zu verwischen.",
  },
  placeholderMedia: {
    type: "video",
    caption: "Kleiner Laden im Dämmerlicht, Preisschild am Rand, vorsichtige Hand am Gegenstand.",
  },
  songSeed: {
    genre: "soft indie folk",
    mood: "careful and low",
  },
  visualNotes: "Muted price cue, low contrast shelf, phrase enters after a small pause.",
}

const wistfulLesson006: GuidedLessonVibeVariant = {
  contentStatus: "draft",
  corePhrase: {
    targetText: "If I may — what time is the train?",
    baseText: "Wenn ich darf: Wann fährt der Zug?",
  },
  meaning: "Eine leise Frage nach der Abfahrtszeit.",
  chunks: [
    { id: "if-i-may", targetText: "If I may", baseText: "wenn ich darf" },
    { id: "what-time", targetText: "what time", baseText: "wann" },
    { id: "is-the-train", targetText: "is the train", baseText: "fährt der Zug" },
  ],
  lessonItems: [
    { id: "if-i-may", targetText: "if I may", baseText: "wenn ich darf", acceptedAnswers: ["if I may", "if i may"] },
    { id: "time", targetText: "time", baseText: "Uhrzeit", acceptedAnswers: ["time"] },
    { id: "train", targetText: "train", baseText: "Zug", acceptedAnswers: ["train"] },
    { id: "almost", targetText: "almost", baseText: "fast", acceptedAnswers: ["almost"] },
    { id: "quiet", targetText: "quiet", baseText: "ruhig", acceptedAnswers: ["quiet"] },
  ],
  build: {
    targetText: "If I may — what time is the train?",
    chips: ["If I may —", "what time", "is the train?", "almost", "quiet"],
  },
  typeRecall: {
    before: "If I may — what time is the ",
    answer: "train",
    after: "?",
    acceptedAnswers: ["train", "Train"],
    fallbackChoices: ["train", "station", "almost", "gently"],
  },
  speakTarget: {
    baseCue: "Wenn ich darf: Wann fährt der Zug?",
    targetPhrase: "If I may — what time is the train?",
    language: "en-US",
    passingThreshold: 0.8,
  },
  sceneCaption: "Am Bahnhof ist die Frage kurz, aber sie klingt nach jemandem, der fast rechtzeitig ist.",
  trophyWord: {
    word: "almost",
    meaning: "fast",
    example: "Almost on time.",
    whyThisWord: "Almost hält die Bahnhofsminute menschlich: nicht panisch, nur knapp.",
  },
  placeholderMedia: {
    type: "video",
    caption: "Gedämpfte Bahnhofshalle, Uhrlicht im Hintergrund, ein Atemzug vor der Anzeige.",
  },
  songSeed: {
    genre: "slow strings",
    mood: "nearly there",
  },
  visualNotes: "Soft platform light, long shadow, small train-time cue.",
}

const wistfulLesson007: GuidedLessonVibeVariant = {
  contentStatus: "draft",
  corePhrase: {
    targetText: "I'm afraid I need a little help.",
    baseText: "Ich fürchte, ich brauche ein wenig Hilfe.",
  },
  meaning: "Eine ehrliche Bitte um ein bisschen Hilfe.",
  chunks: [
    { id: "im-afraid", targetText: "I'm afraid", baseText: "ich fürchte" },
    { id: "i-need", targetText: "I need", baseText: "ich brauche" },
    { id: "a-little-help", targetText: "a little help", baseText: "ein wenig Hilfe" },
  ],
  lessonItems: [
    { id: "im-afraid", targetText: "I'm afraid", baseText: "ich fürchte", acceptedAnswers: ["I'm afraid", "i'm afraid", "im afraid"] },
    { id: "i-need", targetText: "I need", baseText: "ich brauche", acceptedAnswers: ["I need", "i need"] },
    { id: "little", targetText: "a little", baseText: "ein wenig", acceptedAnswers: ["a little", "little"] },
    { id: "help", targetText: "help", baseText: "Hilfe", acceptedAnswers: ["help"] },
    { id: "soft", targetText: "soft", baseText: "sanft", acceptedAnswers: ["soft"] },
  ],
  build: {
    targetText: "I'm afraid I need a little help.",
    chips: ["I'm afraid", "I need", "a little help.", "soft", "quiet"],
  },
  typeRecall: {
    before: "I'm afraid I need a little ",
    answer: "help",
    after: ".",
    acceptedAnswers: ["help", "Help"],
    fallbackChoices: ["help", "medicine", "soft", "quiet"],
  },
  speakTarget: {
    baseCue: "Ich fürchte, ich brauche ein wenig Hilfe.",
    targetPhrase: "I'm afraid I need a little help.",
    language: "en-US",
    passingThreshold: 0.8,
  },
  sceneCaption: "An der Theke ist die Hilfe klein benannt, damit sie leichter zu erbitten ist.",
  trophyWord: {
    word: "soft",
    meaning: "sanft",
    example: "Speak softly, please.",
    whyThisWord: "Soft passt zur Hilfe-Szene, weil die Bitte leise und verletzlich bleibt.",
  },
  placeholderMedia: {
    type: "video",
    caption: "Leiser Apotheken- oder Infotresen, weiches Seitenlicht, wenig Bewegung.",
  },
  songSeed: {
    genre: "ambient piano",
    mood: "small and vulnerable",
  },
  visualNotes: "Dusty whites, slow help cue, soft mist around the desk edge.",
}

const wistfulLesson008: GuidedLessonVibeVariant = {
  contentStatus: "draft",
  corePhrase: {
    targetText: "It's quiet here. I like it.",
    baseText: "Es ist ruhig hier. Mir gefällt es.",
  },
  meaning: "Ein stiller Small-Talk-Satz über einen Ort, der gut tut.",
  chunks: [
    { id: "its-quiet-here", targetText: "It's quiet here", baseText: "es ist ruhig hier" },
    { id: "i-like-it", targetText: "I like it", baseText: "mir gefällt es" },
  ],
  lessonItems: [
    { id: "quiet", targetText: "quiet", baseText: "ruhig", acceptedAnswers: ["quiet"] },
    { id: "here", targetText: "here", baseText: "hier", acceptedAnswers: ["here"] },
    { id: "i-like", targetText: "I like", baseText: "mir gefällt", acceptedAnswers: ["I like", "i like"] },
    { id: "it", targetText: "it", baseText: "es", acceptedAnswers: ["it"] },
    { id: "place", targetText: "place", baseText: "Ort", acceptedAnswers: ["place"] },
  ],
  build: {
    targetText: "It's quiet here. I like it.",
    chips: ["It's quiet here.", "I like it.", "nice", "place", "good"],
  },
  typeRecall: {
    before: "It's ",
    answer: "quiet",
    after: " here. I like it.",
    acceptedAnswers: ["quiet", "Quiet"],
    fallbackChoices: ["quiet", "soft", "quick", "ready"],
  },
  speakTarget: {
    baseCue: "Es ist ruhig hier. Mir gefällt es.",
    targetPhrase: "It's quiet here. I like it.",
    language: "en-US",
    passingThreshold: 0.8,
  },
  sceneCaption: "Der Small Talk bleibt fast ein Gedanke: ruhig hier, gut so.",
  trophyWord: {
    word: "again",
    meaning: "wieder",
    example: "I'd come here again.",
    whyThisWord: "Again macht den Ort vertraut: leise genug, um wiederkommen zu wollen.",
  },
  placeholderMedia: {
    type: "video",
    caption: "Bookshop- oder Caféecke, weiches Licht, kurzer Blick auf einen stillen Tisch.",
  },
  songSeed: {
    genre: "soft indie folk",
    mood: "familiar and hushed",
  },
  visualNotes: "Muted slate and paper white, slow fade on quiet, generous empty space.",
}

const wistfulLesson009: GuidedLessonVibeVariant = {
  contentStatus: "draft",
  corePhrase: {
    targetText: "Tomorrow at seven... yes, that's okay.",
    baseText: "Morgen um sieben ... ja, das ist in Ordnung.",
  },
  meaning: "Eine zögernde, aber echte Zusage für morgen.",
  chunks: [
    { id: "tomorrow", targetText: "Tomorrow", baseText: "morgen" },
    { id: "at-seven", targetText: "at seven", baseText: "um sieben" },
    { id: "yes-thats-okay", targetText: "yes, that's okay", baseText: "ja, das ist in Ordnung" },
  ],
  lessonItems: [
    { id: "tomorrow", targetText: "tomorrow", baseText: "morgen", acceptedAnswers: ["tomorrow"] },
    { id: "seven", targetText: "seven", baseText: "sieben", acceptedAnswers: ["seven", "7"] },
    { id: "okay", targetText: "okay", baseText: "in Ordnung", acceptedAnswers: ["okay", "ok"] },
    { id: "a-little", targetText: "a little", baseText: "ein wenig", acceptedAnswers: ["a little", "little"] },
    { id: "perhaps", targetText: "perhaps", baseText: "vielleicht", acceptedAnswers: ["perhaps"] },
  ],
  build: {
    targetText: "Tomorrow at seven... yes, that's okay.",
    chips: ["Tomorrow", "at seven...", "yes,", "that's okay.", "a little"],
  },
  typeRecall: {
    before: "Tomorrow at seven... yes, that's ",
    answer: "okay",
    after: ".",
    acceptedAnswers: ["okay", "OK", "Ok", "ok"],
    fallbackChoices: ["okay", "a little", "perhaps", "quiet"],
  },
  speakTarget: {
    baseCue: "Morgen um sieben ... ja, das ist in Ordnung.",
    targetPhrase: "Tomorrow at seven... yes, that's okay.",
    language: "en-US",
    passingThreshold: 0.8,
  },
  sceneCaption: "Der Plan kommt nach einer kleinen Pause zustande.",
  trophyWord: {
    word: "a little",
    meaning: "ein wenig",
    example: "A little nervous, but okay.",
    whyThisWord: "A little ist Wistfuls weicher Zwischenton: die Zusage bleibt ehrlich vorsichtig.",
  },
  placeholderMedia: {
    type: "video",
    caption: "Gedämpfter Kalenderblick, Abendlicht auf dem Handy, die Zusage nach einer Pause.",
  },
  songSeed: {
    genre: "ambient piano",
    mood: "hesitant and accepting",
  },
  visualNotes: "Soft ellipsis timing, blue-gray calendar card, slow acceptance fade.",
}

const wistfulLesson010: GuidedLessonVibeVariant = {
  contentStatus: "draft",
  corePhrase: {
    targetText: "Thank you. That helped. Goodbye.",
    baseText: "Danke. Das hat geholfen. Auf Wiedersehen.",
  },
  meaning: "Ein leiser Abschluss, nachdem Hilfe wirklich angekommen ist.",
  chunks: [
    { id: "thank-you", targetText: "Thank you", baseText: "danke" },
    { id: "that-helped", targetText: "That helped", baseText: "das hat geholfen" },
    { id: "goodbye", targetText: "Goodbye", baseText: "auf Wiedersehen" },
  ],
  lessonItems: [
    { id: "thank-you", targetText: "thank you", baseText: "danke", acceptedAnswers: ["thank you", "thanks"] },
    { id: "that-helped", targetText: "That helped", baseText: "das hat geholfen", acceptedAnswers: ["That helped", "that helped"] },
    { id: "goodbye", targetText: "goodbye", baseText: "auf Wiedersehen", acceptedAnswers: ["goodbye", "good bye"] },
    { id: "lingering", targetText: "lingering", baseText: "nachklingend", acceptedAnswers: ["lingering"] },
    { id: "again", targetText: "again", baseText: "wieder", acceptedAnswers: ["again"] },
  ],
  build: {
    targetText: "Thank you. That helped. Goodbye.",
    chips: ["Thank you.", "That helped.", "Goodbye.", "lingering", "again"],
  },
  typeRecall: {
    before: "Thank you. That ",
    answer: "helped",
    after: ". Goodbye.",
    acceptedAnswers: ["helped", "Helped"],
    fallbackChoices: ["helped", "again", "lingering", "ready"],
  },
  speakTarget: {
    baseCue: "Danke. Das hat geholfen. Auf Wiedersehen.",
    targetPhrase: "Thank you. That helped. Goodbye.",
    language: "en-US",
    passingThreshold: 0.8,
  },
  sceneCaption: "Der Abschied bleibt schlicht, aber das Danke hat Gewicht.",
  trophyWord: {
    word: "lingering",
    meaning: "nachklingend",
    example: "A lingering thank you.",
    whyThisWord: "Lingering passt zum Schluss, weil der Dank leise nachklingt.",
  },
  placeholderMedia: {
    type: "video",
    caption: "Dämmerlicht an Tür oder Tresen, ein ruhiger Dank, dann ein kleiner Schritt hinaus.",
  },
  songSeed: {
    genre: "slow strings",
    mood: "soft closure",
  },
  visualNotes: "Long fade after helped, paper-white text field, muted blue-gray exit frame.",
}

const sharpLesson001: GuidedLessonVibeVariant = {
  contentStatus: "draft",
  corePhrase: {
    targetText: "Quick question — do you speak English?",
    baseText: "Kurze Frage: Sprechen Sie Englisch?",
  },
  meaning: "Eine kurze Frage, ob das Gespräch auf Englisch möglich ist.",
  chunks: [
    { id: "quick-question", targetText: "Quick question", baseText: "kurze Frage" },
    { id: "do-you-speak", targetText: "do you speak", baseText: "sprechen Sie" },
    { id: "english", targetText: "English", baseText: "Englisch" },
  ],
  lessonItems: [
    { id: "quick-question", targetText: "quick question", baseText: "kurze Frage", acceptedAnswers: ["quick question"] },
    { id: "do-you-speak", targetText: "do you speak", baseText: "sprechen Sie", acceptedAnswers: ["do you speak"] },
    { id: "english", targetText: "English", baseText: "Englisch", acceptedAnswers: ["English", "english"] },
    { id: "clear", targetText: "clear", baseText: "klar", acceptedAnswers: ["clear"] },
    { id: "focused", targetText: "focused", baseText: "fokussiert", acceptedAnswers: ["focused"] },
  ],
  build: {
    targetText: "Quick question — do you speak English?",
    chips: ["Quick question —", "do you speak", "English?", "clear", "focused"],
  },
  typeRecall: {
    before: "Quick question — do you ",
    answer: "speak",
    after: " English?",
    acceptedAnswers: ["speak", "Speak"],
    fallbackChoices: ["speak", "do you speak", "clear", "quick"],
  },
  speakTarget: {
    baseCue: "Kurze Frage: Sprechen Sie Englisch?",
    targetPhrase: "Quick question — do you speak English?",
    language: "en-US",
    passingThreshold: 0.8,
    ...LESSON_001_SPEAK_CORE,
  },
  sceneCaption: "Sharp öffnet mit der Aufgabe, nicht mit Small Talk.",
  trophyWord: {
    word: "clear",
    meaning: "klar",
    example: "Clear question.",
    whyThisWord: "Clear ist Sharp in einem Wort: kein Umweg, keine Härte, sofort verständlich.",
  },
  placeholderMedia: {
    type: "video",
    caption: "Urbanes Café am Abend, enger Bildausschnitt, direkter Blick vor der Frage.",
  },
  songSeed: {
    genre: "minimal synth pulse",
    mood: "direct and clean",
  },
  visualNotes: "Deep navy frame, brass accent on Quick question, snappy phrase reveal.",
}

const sharpLesson002: GuidedLessonVibeVariant = {
  contentStatus: "draft",
  corePhrase: {
    targetText: "Once more, slower. Please.",
    baseText: "Noch einmal, langsamer. Bitte.",
  },
  meaning: "Eine knappe Bitte um Wiederholung, mit Höflichkeit am Ende.",
  chunks: [
    { id: "once-more", targetText: "Once more", baseText: "noch einmal" },
    { id: "slower", targetText: "slower", baseText: "langsamer" },
    { id: "please", targetText: "Please", baseText: "bitte" },
  ],
  lessonItems: [
    { id: "once-more", targetText: "once more", baseText: "noch einmal", acceptedAnswers: ["once more"] },
    { id: "slower", targetText: "slower", baseText: "langsamer", acceptedAnswers: ["slower"] },
    { id: "please", targetText: "please", baseText: "bitte", acceptedAnswers: ["please"] },
    { id: "certain", targetText: "certain", baseText: "sicher", acceptedAnswers: ["certain"] },
    { id: "clear", targetText: "clear", baseText: "klar", acceptedAnswers: ["clear"] },
  ],
  build: {
    targetText: "Once more, slower. Please.",
    chips: ["Once more,", "slower.", "Please.", "quick", "clear"],
  },
  typeRecall: {
    before: "Once more, ",
    answer: "slower",
    after: ". Please.",
    acceptedAnswers: ["slower", "Slower"],
    fallbackChoices: ["slower", "faster", "quick", "clear"],
  },
  speakTarget: {
    baseCue: "Noch einmal, langsamer. Bitte.",
    targetPhrase: "Once more, slower. Please.",
    language: "en-US",
    passingThreshold: 0.8,
  },
  sceneCaption: "Die Korrektur ist kurz: wiederholen, langsamer, bitte.",
  trophyWord: {
    word: "slower",
    meaning: "langsamer",
    example: "Once more, slower.",
    whyThisWord: "Slower ist der Kern der Wiederholung — Sharp bittet präzise um Tempo.",
  },
  placeholderMedia: {
    type: "video",
    caption: "Enges Café-Framing, kurzer Handstopp, drei präzise Wörter.",
  },
  songSeed: {
    genre: "minimal synth pulse",
    mood: "clipped and controlled",
  },
  visualNotes: "Snappy replay cut, high-contrast word blocks, no lingering animation.",
}

const sharpLesson003: GuidedLessonVibeVariant = {
  contentStatus: "draft",
  corePhrase: {
    targetText: "Where's the station? Straight ahead, left, or right?",
    baseText: "Wo ist der Bahnhof? Geradeaus, links oder rechts?",
  },
  meaning: "Eine direkte Wegfrage mit klaren Richtungsoptionen.",
  chunks: [
    { id: "wheres-the-station", targetText: "Where's the station", baseText: "wo ist der Bahnhof" },
    { id: "straight-ahead", targetText: "Straight ahead", baseText: "geradeaus" },
    { id: "left-or-right", targetText: "left, or right", baseText: "links oder rechts" },
  ],
  lessonItems: [
    { id: "station", targetText: "station", baseText: "Bahnhof", acceptedAnswers: ["station"] },
    { id: "straight-ahead", targetText: "straight ahead", baseText: "geradeaus", acceptedAnswers: ["straight ahead"] },
    { id: "left", targetText: "left", baseText: "links", acceptedAnswers: ["left"] },
    { id: "right", targetText: "right", baseText: "rechts", acceptedAnswers: ["right"] },
    { id: "straight", targetText: "straight", baseText: "gerade", acceptedAnswers: ["straight"] },
  ],
  build: {
    targetText: "Where's the station? Straight ahead, left, or right?",
    chips: ["Where's", "the station?", "Straight ahead,", "left, or right?", "straight"],
  },
  typeRecall: {
    before: "Where's the station? Straight ahead, left, or ",
    answer: "right",
    after: "?",
    acceptedAnswers: ["right", "Right"],
    fallbackChoices: ["right", "left", "straight", "clear"],
  },
  speakTarget: {
    baseCue: "Wo ist der Bahnhof? Geradeaus, links oder rechts?",
    targetPhrase: "Where's the station? Straight ahead, left, or right?",
    language: "en-US",
    passingThreshold: 0.8,
  },
  sceneCaption: "Sharp fragt nicht nur wo, sondern welche Richtung zählt.",
  trophyWord: {
    word: "left",
    meaning: "links",
    example: "Left, please.",
    whyThisWord: "Left ist Sharps direkter Richtungsanker am Anfang einer Wegbeschreibung.",
  },
  placeholderMedia: {
    type: "video",
    caption: "Harte Straßenkante, drei Richtungspfeile, Bahnhofsschild in klarer Linie.",
  },
  songSeed: {
    genre: "alt rock",
    mood: "urban and direct",
  },
  visualNotes: "Black-and-brass direction chips, sharp arrow states, tight street crop.",
}

const sharpLesson004: GuidedLessonVibeVariant = {
  contentStatus: "draft",
  corePhrase: {
    targetText: "One coffee, please. Black.",
    baseText: "Einen Kaffee, bitte. Schwarz.",
  },
  meaning: "Eine knappe Bestellung mit genauer Angabe.",
  chunks: [
    { id: "one-coffee", targetText: "One coffee", baseText: "einen Kaffee" },
    { id: "please", targetText: "please", baseText: "bitte" },
    { id: "black", targetText: "Black", baseText: "schwarz" },
  ],
  lessonItems: [
    { id: "one", targetText: "one", baseText: "eins / einen", acceptedAnswers: ["one"] },
    { id: "coffee", targetText: "coffee", baseText: "Kaffee", acceptedAnswers: ["coffee"] },
    { id: "black", targetText: "black", baseText: "schwarz", acceptedAnswers: ["black"] },
    { id: "please", targetText: "please", baseText: "bitte", acceptedAnswers: ["please"] },
    { id: "ready", targetText: "ready", baseText: "bereit", acceptedAnswers: ["ready"] },
  ],
  build: {
    targetText: "One coffee, please. Black.",
    chips: ["One coffee,", "please.", "Black.", "ready", "direct"],
  },
  typeRecall: {
    before: "One coffee, please. ",
    answer: "Black",
    after: ".",
    acceptedAnswers: ["Black", "black"],
    fallbackChoices: ["Black", "Milk", "Ready", "Clear"],
  },
  speakTarget: {
    baseCue: "Einen Kaffee, bitte. Schwarz.",
    targetPhrase: "One coffee, please. Black.",
    language: "en-US",
    passingThreshold: 0.8,
  },
  sceneCaption: "Die Bestellung steht, bevor der Stuhl ganz gerückt ist.",
  trophyWord: {
    word: "ready",
    meaning: "bereit",
    example: "Ready to order.",
    whyThisWord: "Ready ist Sharp am Tresen: entschieden, präzise, höflich genug.",
  },
  placeholderMedia: {
    type: "video",
    caption: "Dunkler Tresen, klare Tasse, Bestellung in zwei kurzen Sätzen.",
  },
  songSeed: {
    genre: "smoky late-night jazz",
    mood: "decided and neat",
  },
  visualNotes: "Crisp black coffee cue, brass active chip, decisive order confirmation.",
}

const sharpLesson005: GuidedLessonVibeVariant = {
  contentStatus: "draft",
  corePhrase: {
    targetText: "How much?",
    baseText: "Wie viel?",
  },
  meaning: "Die kürzeste Preisfrage, wenn der Gegenstand klar ist.",
  chunks: [
    { id: "how", targetText: "How", baseText: "wie" },
    { id: "much", targetText: "much", baseText: "viel" },
  ],
  lessonItems: [
    { id: "how-much", targetText: "how much", baseText: "wie viel", acceptedAnswers: ["how much"] },
    { id: "price", targetText: "price", baseText: "Preis", acceptedAnswers: ["price"] },
    { id: "this", targetText: "this", baseText: "das hier", acceptedAnswers: ["this"] },
    { id: "exactly", targetText: "exactly", baseText: "genau", acceptedAnswers: ["exactly"] },
    { id: "clear", targetText: "clear", baseText: "klar", acceptedAnswers: ["clear"] },
  ],
  build: {
    targetText: "How much?",
    chips: ["How", "much?", "exactly", "price", "this"],
  },
  typeRecall: {
    before: "How ",
    answer: "much",
    after: "?",
    acceptedAnswers: ["much", "Much"],
    fallbackChoices: ["much", "many", "exactly", "ready"],
  },
  speakTarget: {
    baseCue: "Wie viel?",
    targetPhrase: "How much?",
    language: "en-US",
    passingThreshold: 0.8,
  },
  sceneCaption: "Im Laden reicht Sharp ein Blick auf den Gegenstand und zwei Wörter.",
  trophyWord: {
    word: "exactly",
    meaning: "genau",
    example: "Exactly how much?",
    whyThisWord: "Exactly macht klar, was Sharp will: die Zahl, nicht die Erklärung.",
  },
  placeholderMedia: {
    type: "video",
    caption: "Preisschild fehlt, Gegenstand im Fokus, Verkäuferin sieht die Frage sofort.",
  },
  songSeed: {
    genre: "minimal synth pulse",
    mood: "spare and precise",
  },
  visualNotes: "Two-word price prompt, tight item crop, electric accent on exactly.",
}

const sharpLesson006: GuidedLessonVibeVariant = {
  contentStatus: "draft",
  corePhrase: {
    targetText: "What time, and which platform?",
    baseText: "Wann, und welcher Bahnsteig?",
  },
  meaning: "Eine knappe Frage nach den zwei wichtigsten Bahndaten.",
  chunks: [
    { id: "what-time", targetText: "What time", baseText: "wann" },
    { id: "which-platform", targetText: "which platform", baseText: "welcher Bahnsteig" },
  ],
  lessonItems: [
    { id: "time", targetText: "time", baseText: "Uhrzeit", acceptedAnswers: ["time"] },
    { id: "platform", targetText: "platform", baseText: "Bahnsteig", acceptedAnswers: ["platform"] },
    { id: "train", targetText: "train", baseText: "Zug", acceptedAnswers: ["train"] },
    { id: "quick", targetText: "quick", baseText: "schnell", acceptedAnswers: ["quick"] },
    { id: "now", targetText: "now", baseText: "jetzt", acceptedAnswers: ["now"] },
  ],
  build: {
    targetText: "What time, and which platform?",
    chips: ["What time,", "and which platform?", "certain", "now", "train"],
  },
  typeRecall: {
    before: "What time, and which ",
    answer: "platform",
    after: "?",
    acceptedAnswers: ["platform", "Platform"],
    fallbackChoices: ["platform", "station", "certain", "ready"],
  },
  speakTarget: {
    baseCue: "Wann, und welcher Bahnsteig?",
    targetPhrase: "What time, and which platform?",
    language: "en-US",
    passingThreshold: 0.8,
  },
  sceneCaption: "Am Bahnhof will Sharp zwei Daten: Zeit. Bahnsteig.",
  trophyWord: {
    word: "certain",
    meaning: "sicher",
    example: "Certain about the time?",
    whyThisWord: "Certain passt zum Bahnhof, weil Sharp nicht rät, sondern verlässliche Daten will.",
  },
  placeholderMedia: {
    type: "video",
    caption: "Abfahrtstafel, harte Uhrkante, Bahnsteignummer im engen Fokus.",
  },
  songSeed: {
    genre: "minimal synth pulse",
    mood: "timed and clipped",
  },
  visualNotes: "Split time/platform cells, snappy transition, deep black station frame.",
}

const sharpLesson007: GuidedLessonVibeVariant = {
  contentStatus: "draft",
  corePhrase: {
    targetText: "I need help. Quick question.",
    baseText: "Ich brauche Hilfe. Kurze Frage.",
  },
  meaning: "Eine direkte Bitte um Hilfe mit sofortigem Anliegen.",
  chunks: [
    { id: "i-need-help", targetText: "I need help", baseText: "ich brauche Hilfe" },
    { id: "quick-question", targetText: "Quick question", baseText: "kurze Frage" },
  ],
  lessonItems: [
    { id: "i-need", targetText: "I need", baseText: "ich brauche", acceptedAnswers: ["I need", "i need"] },
    { id: "help", targetText: "help", baseText: "Hilfe", acceptedAnswers: ["help"] },
    { id: "quick-question", targetText: "quick question", baseText: "kurze Frage", acceptedAnswers: ["quick question"] },
    { id: "focused", targetText: "focused", baseText: "fokussiert", acceptedAnswers: ["focused"] },
    { id: "direct", targetText: "direct", baseText: "direkt", acceptedAnswers: ["direct"] },
  ],
  build: {
    targetText: "I need help. Quick question.",
    chips: ["I need help.", "Quick question.", "focused", "direct", "please"],
  },
  typeRecall: {
    before: "I need ",
    answer: "help",
    after: ". Quick question.",
    acceptedAnswers: ["help", "Help"],
    fallbackChoices: ["help", "medicine", "focused", "quick"],
  },
  speakTarget: {
    baseCue: "Ich brauche Hilfe. Kurze Frage.",
    targetPhrase: "I need help. Quick question.",
    language: "en-US",
    passingThreshold: 0.8,
  },
  sceneCaption: "An der Theke nennt Sharp Bedarf und Tempo im selben Atemzug.",
  trophyWord: {
    word: "focused",
    meaning: "fokussiert",
    example: "Focused need.",
    whyThisWord: "Focused hält die Hilfe-Szene eng am Anliegen und fern von langer Erklärung.",
  },
  placeholderMedia: {
    type: "video",
    caption: "Help desk mit harter Lichtkante, Blick auf die Person, dann sofort zum Anliegen.",
  },
  songSeed: {
    genre: "alt rock",
    mood: "focused and urgent",
  },
  visualNotes: "Crisp help block, electric accent on Quick question, decisive focus state.",
}

const sharpLesson008: GuidedLessonVibeVariant = {
  contentStatus: "draft",
  corePhrase: {
    targetText: "Good place. I like it.",
    baseText: "Guter Ort. Ich mag es.",
  },
  meaning: "Ein kurzer Small-Talk-Satz mit klarer positiver Meinung.",
  chunks: [
    { id: "good-place", targetText: "Good place", baseText: "guter Ort" },
    { id: "i-like-it", targetText: "I like it", baseText: "ich mag es" },
  ],
  lessonItems: [
    { id: "good", targetText: "good", baseText: "gut", acceptedAnswers: ["good"] },
    { id: "place", targetText: "place", baseText: "Ort", acceptedAnswers: ["place"] },
    { id: "i-like", targetText: "I like", baseText: "ich mag", acceptedAnswers: ["I like", "i like"] },
    { id: "it", targetText: "it", baseText: "es", acceptedAnswers: ["it"] },
    { id: "here", targetText: "here", baseText: "hier", acceptedAnswers: ["here"] },
  ],
  build: {
    targetText: "Good place. I like it.",
    chips: ["Good place.", "I like it.", "Good.", "here", "place"],
  },
  typeRecall: {
    before: "",
    answer: "Good place",
    after: ". I like it.",
    acceptedAnswers: ["Good place", "good place"],
    fallbackChoices: ["Good place", "I like it", "place", "good"],
  },
  speakTarget: {
    baseCue: "Guter Ort. Ich mag es.",
    targetPhrase: "Good place. I like it.",
    language: "en-US",
    passingThreshold: 0.8,
  },
  sceneCaption: "Small Talk, Sharp-Version: kurz, klar, positiv.",
  trophyWord: {
    word: "decided",
    meaning: "entschieden",
    example: "Decided. Good place. Right call.",
    whyThisWord: "Decided macht den Small Talk zu Sharp: Meinung gesetzt, keine Erklärung.",
  },
  placeholderMedia: {
    type: "video",
    caption: "Urbaner Innenraum, kurzer Blick, knappes Nicken statt langer Unterhaltung.",
  },
  songSeed: {
    genre: "smoky late-night jazz",
    mood: "dry and assured",
  },
  visualNotes: "Two-word card, sharp typography, no decorative social flourish.",
}

const sharpLesson009: GuidedLessonVibeVariant = {
  contentStatus: "draft",
  corePhrase: {
    targetText: "Seven, tomorrow. Ready.",
    baseText: "Sieben Uhr, morgen. Bereit.",
  },
  meaning: "Eine knappe Bestätigung für Zeit und Plan.",
  chunks: [
    { id: "seven", targetText: "Seven", baseText: "sieben Uhr" },
    { id: "tomorrow", targetText: "tomorrow", baseText: "morgen" },
    { id: "ready", targetText: "Ready", baseText: "bereit" },
  ],
  lessonItems: [
    { id: "seven", targetText: "seven", baseText: "sieben", acceptedAnswers: ["seven", "7"] },
    { id: "tomorrow", targetText: "tomorrow", baseText: "morgen", acceptedAnswers: ["tomorrow"] },
    { id: "ready", targetText: "ready", baseText: "bereit", acceptedAnswers: ["ready"] },
    { id: "settled", targetText: "settled", baseText: "abgemacht", acceptedAnswers: ["settled"] },
    { id: "now", targetText: "now", baseText: "jetzt", acceptedAnswers: ["now"] },
  ],
  build: {
    targetText: "Seven, tomorrow. Ready.",
    chips: ["Seven,", "tomorrow.", "Ready.", "settled", "now"],
  },
  typeRecall: {
    before: "Seven, tomorrow. ",
    answer: "Ready",
    after: ".",
    acceptedAnswers: ["Ready", "ready"],
    fallbackChoices: ["Ready", "Now", "Clear", "Wonderful"],
  },
  speakTarget: {
    baseCue: "Sieben Uhr, morgen. Bereit.",
    targetPhrase: "Seven, tomorrow. Ready.",
    language: "en-US",
    passingThreshold: 0.8,
  },
  sceneCaption: "Der Plan ist nicht besprochen, sondern gesetzt.",
  trophyWord: {
    word: "settled",
    meaning: "abgemacht",
    example: "Settled. Seven tomorrow.",
    whyThisWord: "Settled ist Sharps Planungsabschluss: Uhrzeit steht, Thema erledigt.",
  },
  placeholderMedia: {
    type: "video",
    caption: "Handy-Kalender, sieben Uhr, ein kurzer Tap auf Bestätigen.",
  },
  songSeed: {
    genre: "minimal synth pulse",
    mood: "settled and decisive",
  },
  visualNotes: "Compact calendar chips, hard confirm state, brass ready accent.",
}

const sharpLesson010: GuidedLessonVibeVariant = {
  contentStatus: "draft",
  corePhrase: {
    targetText: "Clear. Thanks. Bye.",
    baseText: "Klar. Danke. Tschüss.",
  },
  meaning: "Ein sehr kurzer Abschluss, wenn alles verstanden ist.",
  chunks: [
    { id: "clear", targetText: "Clear", baseText: "klar" },
    { id: "thanks", targetText: "Thanks", baseText: "danke" },
    { id: "bye", targetText: "Bye", baseText: "tschüss" },
  ],
  lessonItems: [
    { id: "clear", targetText: "clear", baseText: "klar", acceptedAnswers: ["clear"] },
    { id: "thanks", targetText: "thanks", baseText: "danke", acceptedAnswers: ["thanks", "thank you"] },
    { id: "bye", targetText: "bye", baseText: "tschüss", acceptedAnswers: ["bye", "goodbye"] },
    { id: "ready", targetText: "ready", baseText: "bereit", acceptedAnswers: ["ready"] },
    { id: "done", targetText: "done", baseText: "erledigt", acceptedAnswers: ["done"] },
  ],
  build: {
    targetText: "Clear. Thanks. Bye.",
    chips: ["Clear.", "Thanks.", "Bye.", "Ready.", "Done."],
  },
  typeRecall: {
    before: "Clear. Thanks. ",
    answer: "Bye",
    after: ".",
    acceptedAnswers: ["Bye", "bye", "Goodbye", "goodbye"],
    fallbackChoices: ["Bye", "Ready", "Done", "Lovely"],
  },
  speakTarget: {
    baseCue: "Klar. Danke. Tschüss.",
    targetPhrase: "Clear. Thanks. Bye.",
    language: "en-US",
    passingThreshold: 0.8,
  },
  sceneCaption: "Sharp schließt die Szene in drei Takten: klar, dankbar, weg.",
  trophyWord: {
    word: "done",
    meaning: "erledigt",
    example: "Done. Bye.",
    whyThisWord: "Done gibt dem Abschluss Sharps endgültigen Schnitt: erledigt, bedankt, weg.",
  },
  placeholderMedia: {
    type: "video",
    caption: "Harter Türrahmen, kurzer Dank, sofortige Bewegung aus dem Bild.",
  },
  songSeed: {
    genre: "minimal synth pulse",
    mood: "resolved and clipped",
  },
  visualNotes: "Three sharp caption beats, black-white-brass palette, no linger state.",
}

type A1P2VariantInput = {
  targetText: string
  baseText: string
  meaning: string
  chunks: PhraseChunk[]
  extraLessonItems?: PhraseChunk[]
  targetChips: string[]
  distractors: string[]
  typeRecall: GuidedLessonVibeVariant['typeRecall']
  sceneCaption: string
  trophyWord: GuidedLessonTrophyWord
  mediaCaption: string
  songSeed: GuidedLessonSongSeed
  visualNotes: string
}

type A1P2LessonInput = {
  slug: string
  title: string
  situation: GuidedLessonDefinition['situation']
  pedagogicalGoal: string
  variants: Record<ActiveGuidedVibeId, A1P2VariantInput>
}

const a1Practical2Inputs: A1P2LessonInput[] = [
  {
    slug: 'i-dont-understand',
    title: "I don't understand",
    situation: {
      en: "You miss the meaning and need simple help without pretending.",
      de: "Du verstehst die Bedeutung nicht und bittest einfach um Hilfe.",
    },
    pedagogicalGoal: "Say you do not understand and ask for help.",
    variants: {
      bright: createA1P2VariantInput({
        targetText: "Hi there, I don't understand. Could you help me?",
        baseText: "Hallo, ich verstehe das nicht. Könnten Sie mir helfen?",
        meaning: "Eine warme, ehrliche Bitte um Hilfe, wenn der Sinn noch nicht klar ist.",
        chunks: [
          chunk('hi-there', 'Hi there', 'Hallo'),
          chunk('i-dont-understand', "I don't understand", 'ich verstehe das nicht'),
          chunk('could-you-help-me', 'Could you help me', 'könnten Sie mir helfen'),
        ],
        targetChips: ['Hi there,', "I don't understand.", 'Could you help me?'],
        distractors: ['again', 'happy'],
        typeRecall: recall('Hi there, I don\'t ', 'understand', '. Could you help me?', ['understand', 'help me', 'again', 'English']),
        sceneCaption: "Im kleinen Laden bleibt Bright offen: erst ehrlich sein, dann freundlich um Hilfe bitten.",
        trophyWord: trophy('happy', 'froh', 'Happy, thank you.', 'Happy ist Brights warmer Dank, sobald die Hilfe wirklich ankommt.'),
        mediaCaption: "Heller Laden, kurzer Blick auf ein Schild, dann die freundliche Bitte um Hilfe.",
        songSeed: { genre: 'soft funk groove', mood: 'open and helped' },
        visualNotes: 'Warm daylight, open hand cue, soft yellow focus on help me.',
      }),
      wistful: createA1P2VariantInput({
        targetText: "Could you help me? I don't understand yet.",
        baseText: "Könnten Sie mir helfen? Ich verstehe es noch nicht.",
        meaning: "Eine leise, ehrliche Bitte, wenn der Sinn noch nicht ganz da ist.",
        chunks: [
          chunk('could-you-help-me', 'Could you help me', 'könnten Sie mir helfen'),
          chunk('i-dont-understand-yet', "I don't understand yet", 'ich verstehe es noch nicht'),
        ],
        targetChips: ['Could you help me?', "I don't understand yet."],
        distractors: ['slowly', 'quiet'],
        typeRecall: recall('Could you help me? I don\'t ', 'understand yet', '.', ['understand yet', 'again', 'slowly', 'please']),
        sceneCaption: "Wistful bittet zuerst leise um Hilfe und gibt dann zu, dass der Sinn noch fehlt.",
        trophyWord: trophy('yet', 'noch', 'Not yet, sorry.', 'Yet hält die offene Bitte sanft und unsicher.'),
        mediaCaption: "Ruhige Theke, gedimmtes Licht, ein kurzer Moment bevor die Bitte kommt.",
        songSeed: { genre: 'shoegaze pulse', mood: 'gentle repair' },
        visualNotes: 'Muted blue-gray, slow pause before understand, gentle replay pulse.',
      }),
      sharp: createA1P2VariantInput({
        targetText: "I need help. I don't understand.",
        baseText: "Ich brauche Hilfe. Ich verstehe das nicht.",
        meaning: "Eine klare, kurze Aussage: Hilfe brauchen, Problem nennen.",
        chunks: [
          chunk('i-need-help', 'I need help', 'ich brauche Hilfe'),
          chunk('i-dont-understand', "I don't understand", 'ich verstehe das nicht'),
        ],
        targetChips: ['I need help.', "I don't understand."],
        distractors: ['quick', 'again'],
        typeRecall: recall('I need ', 'help', '. I don\'t understand.', ['help', 'understand', 'quick', 'repeat']),
        sceneCaption: "Sharp verliert keine Zeit: Hilfe gebraucht, nicht verstanden.",
        trophyWord: trophy('short', 'kurz', 'Short question.', 'Short ist Sharps knappe Hilfsbitte ohne Umschweife.'),
        mediaCaption: "Klares Schild, kurze Rückfrage, direkter Blick zur Person am Schalter.",
        songSeed: { genre: 'dry post-punk guitar', mood: 'short repair' },
        visualNotes: 'High contrast, squared help cue, no extra copy.',
      }),
    },
  },
  {
    slug: 'write-it-down',
    title: 'Write it down',
    situation: {
      en: "You need a name, address, price, or number written down.",
      de: "Du brauchst einen Namen, eine Adresse, einen Preis oder eine Zahl schriftlich.",
    },
    pedagogicalGoal: "Ask someone to write something down.",
    variants: {
      bright: createA1P2VariantInput({
        targetText: "Could you write it down, please?",
        baseText: "Könnten Sie es bitte aufschreiben?",
        meaning: "Eine freundliche Bitte, eine wichtige Information schriftlich zu bekommen.",
        chunks: [
          chunk('could-you', 'Could you', 'könnten Sie'),
          chunk('write-it-down', 'write it down', 'es aufschreiben'),
          chunk('please', 'please', 'bitte'),
        ],
        targetChips: ['Could you', 'write it down,', 'please?'],
        distractors: ['warm', 'show me'],
        typeRecall: recall('Could you ', 'write it down', ', please?', ['write it down', 'write', 'down', 'show me']),
        sceneCaption: "Bright lässt die Info nicht verschwinden und bittet freundlich um Schrift.",
        trophyWord: trophy('warm', 'herzlich', 'Warm thanks.', 'Warm gibt Brights Dank Wärme, ohne in Phrase zu kippen.'),
        mediaCaption: "Notizblock am Tresen, Stift in der Hand, die Information wird festgehalten.",
        songSeed: { genre: 'warm road rock', mood: 'helpful and light' },
        visualNotes: 'Paper cue, warm pen stroke, compact written-word highlight.',
      }),
      wistful: createA1P2VariantInput({
        targetText: "Could you put it on paper for me?",
        baseText: "Könnten Sie es für mich aufs Papier schreiben?",
        meaning: "Eine weichere Bitte, weil Gesprochenes zu schnell wieder weg ist.",
        chunks: [
          chunk('could-you', 'Could you', 'könnten Sie'),
          chunk('put-it-on-paper', 'put it on paper', 'es aufs Papier schreiben'),
          chunk('for-me', 'for me', 'für mich'),
        ],
        targetChips: ['Could you', 'put it on paper', 'for me?'],
        distractors: ['perhaps', 'again'],
        typeRecall: recall('Could you put it ', 'on paper', ' for me?', ['on paper', 'write it down', 'again', 'say it']),
        sceneCaption: "Wistful bittet um eine kleine Spur auf Papier, damit der Moment bleibt.",
        trophyWord: trophy('kindly', 'freundlich / liebenswürdig', 'Kindly, please.', 'Kindly hält die Bitte um Schrift weich und höflich, ohne unsicher zu klingen.'),
        mediaCaption: "Ein ruhiger Stift über Papier, die Adresse wird langsam lesbar.",
        songSeed: { genre: 'trip-hop hallway', mood: 'quiet written help' },
        visualNotes: 'Soft paper texture, slower motion, blue-gray ink line.',
      }),
      sharp: createA1P2VariantInput({
        targetText: "Write it down, please.",
        baseText: "Schreiben Sie es bitte auf.",
        meaning: "Eine knappe, höfliche Anweisung, wenn die Information genau sein muss.",
        chunks: [
          chunk('write', 'Write', 'schreiben Sie'),
          chunk('it-down', 'it down', 'es auf'),
          chunk('please', 'please', 'bitte'),
        ],
        targetChips: ['Write', 'it down,', 'please.'],
        distractors: ['note', 'show'],
        typeRecall: recall('', 'Write it down', ', please.', ['Write it down', 'write', 'note', 'show me']),
        sceneCaption: "Sharp macht aus der Bitte einen klaren nächsten Schritt: aufschreiben.",
        trophyWord: trophy('spelling', 'Schreibweise', 'The spelling, please.', 'Spelling ist Sharps konkrete Bitte um die genaue Schreibweise — kein Umweg, eine nützliche Information.'),
        mediaCaption: "Schalterkante, Stift, kurze Notiz, keine Umwege.",
        songSeed: { genre: 'staccato piano groove', mood: 'clean spelling' },
        visualNotes: 'Black-white card, fast underline on write, compact note frame.',
      }),
    },
  },
  {
    slug: 'show-me',
    title: 'Show me',
    situation: {
      en: "You need someone to point on a map, phone, or menu.",
      de: "Jemand soll dir etwas auf einer Karte, dem Handy oder der Speisekarte zeigen.",
    },
    pedagogicalGoal: "Ask someone to show you something on a map, phone, or menu.",
    variants: {
      bright: createA1P2VariantInput({
        targetText: "Could you show me on the map?",
        baseText: "Könnten Sie es mir auf der Karte zeigen?",
        meaning: "Eine freundliche Bitte, etwas sichtbar zu machen.",
        chunks: [
          chunk('could-you', 'Could you', 'könnten Sie'),
          chunk('show-me', 'show me', 'mir zeigen'),
          chunk('on-the-map', 'on the map', 'auf der Karte'),
        ],
        targetChips: ['Could you', 'show me', 'on the map?'],
        distractors: ['right', 'write'],
        typeRecall: recall('Could you ', 'show me', ' on the map?', ['show me', 'write it', 'map', 'help me']),
        sceneCaption: "Bright macht die Hilfe sichtbar: ein Finger auf der Karte reicht.",
        trophyWord: trophy('map', 'Karte', 'On the map.', 'Map verankert Brights freundliche Zeigefrage konkret.'),
        mediaCaption: "Offene Karte auf einem Tisch, ein Finger zeigt den richtigen Ort.",
        songSeed: { genre: 'garage-pop handshake', mood: 'visible answer' },
        visualNotes: 'Map pin glow, friendly yellow path, warm confirmation beat.',
      }),
      wistful: createA1P2VariantInput({
        targetText: "Could you point to it here?",
        baseText: "Könnten Sie hier darauf zeigen?",
        meaning: "Eine vorsichtige Bitte, direkt auf dem Ding vor dir auf die Stelle zu zeigen.",
        chunks: [
          chunk('could-you', 'Could you', 'könnten Sie'),
          chunk('point-to-it', 'point to it', 'darauf zeigen'),
          chunk('here', 'here', 'hier'),
        ],
        targetChips: ['Could you', 'point to it', 'here?'],
        distractors: ['somewhere', 'write'],
        typeRecall: recall('Could you ', 'point to it', ' here?', ['point to it', 'show me', 'here', 'again']),
        sceneCaption: "Wistful hält das Handy hin und bittet leise um den Punkt hier.",
        trophyWord: trophy('finger', 'Finger', 'A finger on the map.', 'Finger macht die kleine Zeigebitte sofort körperlich.'),
        mediaCaption: "Handybildschirm im Halbdunkel, ein vorsichtiger Finger zeigt auf die Stelle.",
        songSeed: { genre: 'dub-techno memory loop', mood: 'soft pointing' },
        visualNotes: 'Dim phone glow, small hand gesture, gentle focus ring.',
      }),
      sharp: createA1P2VariantInput({
        targetText: "Show me on the map, please.",
        baseText: "Zeigen Sie es mir bitte auf der Karte.",
        meaning: "Eine direkte Bitte, sofort den Ort zu sehen.",
        chunks: [
          chunk('show-me', 'Show me', 'zeigen Sie mir'),
          chunk('on-the-map', 'on the map', 'auf der Karte'),
          chunk('please', 'please', 'bitte'),
        ],
        targetChips: ['Show me', 'on the map,', 'please.'],
        distractors: ['here', 'write'],
        typeRecall: recall('', 'Show me', ' on the map, please.', ['Show me', 'write it', 'map', 'again']),
        sceneCaption: "Sharp will den Punkt sehen, nicht darüber reden.",
        trophyWord: trophy('sign', 'Schild', 'On the sign, please.', 'Sign ist Sharps greifbares Zeigeobjekt — ein Wort, das im Stadtraum und im Laden sofort funktioniert.'),
        mediaCaption: "Karte, Zielpunkt, klare Linie vom Finger zum Ort.",
        songSeed: { genre: 'drumline precision', mood: 'pointed location' },
        visualNotes: 'Crisp pointer line, hard map crop, exact target dot.',
      }),
    },
  },
  {
    slug: 'which-one',
    title: 'Which one?',
    situation: {
      en: "You choose between two visible options.",
      de: "Du wählst zwischen zwei sichtbaren Optionen.",
    },
    pedagogicalGoal: "Ask a simple choice question.",
    variants: {
      bright: createA1P2VariantInput({
        targetText: "Which one is better, this one or that one?",
        baseText: "Welches ist bitte besser, das hier oder das da?",
        meaning: "Eine offene Wahlfrage zwischen zwei sichtbaren Dingen.",
        chunks: [
          chunk('which-one', 'Which one', 'welches'),
          chunk('is-better', 'is better', 'ist besser'),
          chunk('this-or-that', 'this one or that one', 'das hier oder das da'),
        ],
        targetChips: ['Which one', 'is better,', 'this one or that one?'],
        distractors: ['fine', 'where'],
        typeRecall: recall('Which one is better, ', 'this one', ' or that one?', ['this one', 'that one', 'better', 'fine']),
        sceneCaption: "Bright macht die Wahl leicht: zwei Dinge, eine freundliche Frage.",
        trophyWord: trophy('fine', 'gut / in Ordnung', 'A fine choice.', 'Fine gibt der Wahl einen leichten, freundlichen Abschluss ohne Übertreibung.'),
        mediaCaption: "Zwei Gebäckstücke im Schaufenster, die Wahl liegt sichtbar da.",
        songSeed: { genre: 'city-pop shimmer', mood: 'friendly choice' },
        visualNotes: 'Two-option layout, warm selection glow, clear this/that labels.',
      }),
      wistful: createA1P2VariantInput({
        targetText: "Perhaps this one or that one?",
        baseText: "Vielleicht das hier oder das da?",
        meaning: "Eine sanfte Wahlfrage, wenn du noch unsicher bist.",
        chunks: [
          chunk('perhaps', 'Perhaps', 'vielleicht'),
          chunk('this-one', 'this one', 'das hier'),
          chunk('or-that-one', 'or that one', 'oder das da'),
        ],
        targetChips: ['Perhaps', 'this one', 'or that one?'],
        distractors: ['either', 'better'],
        typeRecall: recall('Perhaps ', 'this one', ' or that one?', ['this one', 'that one', 'either', 'again']),
        sceneCaption: "Wistful lässt die Wahl offen, ohne die Situation schwer zu machen.",
        trophyWord: trophy('either', 'eines von beiden', 'Either is fine.', 'Either lässt Wistful die Wahl leise offen, ohne unsicher zu wirken.'),
        mediaCaption: "Zwei kleine Optionen im weichen Licht, ein kurzer unsicherer Blick.",
        songSeed: { genre: 'chamber-electronic hybrid', mood: 'open choice' },
        visualNotes: 'Soft split focus, gentle hover between two options, low contrast.',
      }),
      sharp: createA1P2VariantInput({
        targetText: "Which one: this or that?",
        baseText: "Welches bitte: das hier oder das da?",
        meaning: "Eine knappe Wahlfrage mit zwei Optionen.",
        chunks: [
          chunk('which-one', 'Which one', 'welches'),
          chunk('this', 'this', 'das hier'),
          chunk('or-that', 'or that', 'oder das da'),
        ],
        targetChips: ['Which one:', 'this', 'or that?'],
        distractors: ['this', 'please'],
        typeRecall: recall('', 'Which one', ': this or that?', ['Which one', 'this or that', 'this', 'please']),
        sceneCaption: "Sharp reduziert die Auswahl auf zwei Punkte: dieses oder jenes.",
        trophyWord: trophy('option', 'Option', 'The first option.', 'Option benennt die Wahl direkt — ein nützliches Service-Wort, das die Entscheidung greifbar macht.'),
        mediaCaption: "Zwei klare Produktkanten, kurzer Blick, schnelle Entscheidung.",
        songSeed: { genre: 'angular guitar-pop', mood: 'binary choice' },
        visualNotes: 'Hard A/B framing, crisp cursor, no decoration.',
      }),
    },
  },
  {
    slug: 'do-you-have',
    title: 'Do you have...?',
    situation: {
      en: "You ask whether a shop, cafe, or desk has the thing you need.",
      de: "Du fragst, ob ein Laden, Café oder Schalter das hat, was du brauchst.",
    },
    pedagogicalGoal: "Ask if something is available.",
    variants: {
      bright: createA1P2VariantInput({
        targetText: "Hi, is this available today?",
        baseText: "Hallo, ist das heute verfügbar?",
        meaning: "Eine freundliche Verfügbarkeitsfrage mit dem Ding direkt vor dir.",
        chunks: [
          chunk('hi', 'Hi', 'Hallo'),
          chunk('is-this-available', 'is this available', 'ist das verfügbar'),
          chunk('today', 'today', 'heute'),
        ],
        targetChips: ['Hi,', 'is this available', 'today?'],
        distractors: ['fresh', 'where'],
        typeRecall: recall('Hi, is this ', 'available today', '?', ['available today', 'have this', 'this', 'where']),
        sceneCaption: "Bright fragt offen und zeigt auf das, was gebraucht wird.",
        trophyWord: trophy('fresh', 'frisch', 'Fresh, thank you.', 'Fresh passt zu Brights Verfügbarkeitsmoment im Laden — neu, da, gut.'),
        mediaCaption: "Kleiner Laden, Artikel in der Hand, offene Frage an die Theke.",
        songSeed: { genre: 'acoustic road song', mood: 'warm availability' },
        visualNotes: 'Shelf highlight, friendly hand cue, soft coral item outline.',
      }),
      wistful: createA1P2VariantInput({
        targetText: "Could there be one like this?",
        baseText: "Könnte es so eins geben?",
        meaning: "Eine vorsichtige Frage, ob etwas Ähnliches verfügbar ist.",
        chunks: [
          chunk('could-there-be', 'Could there be', 'könnte es geben'),
          chunk('one-like-this', 'one like this', 'so eins'),
        ],
        targetChips: ['Could there be', 'one like this?'],
        distractors: ['anywhere', 'where'],
        typeRecall: recall('Could there be ', 'one like this', '?', ['one like this', 'have this', 'this', 'show me']),
        sceneCaption: "Wistful fragt behutsam, als könnte die Antwort auch nein sein.",
        trophyWord: trophy('anywhere', 'irgendwo', 'Anywhere here?', 'Anywhere passt zum vorsichtigen Suchen, wenn Verfügbarkeit unsicher ist.'),
        mediaCaption: "Regallicht, ein Gegenstand in der Hand, die Frage bleibt klein.",
        songSeed: { genre: 'motorik dusk ride', mood: 'open availability' },
        visualNotes: 'Muted shelf, small maybe cue, gentle item glow.',
      }),
      sharp: createA1P2VariantInput({
        targetText: "In stock?",
        baseText: "Auf Lager?",
        meaning: "Eine direkte Verfügbarkeitsfrage.",
        chunks: [
          chunk('in-stock', 'In stock', 'auf Lager'),
        ],
        targetChips: ['In', 'stock?'],
        distractors: ['any', 'please'],
        typeRecall: recall('', 'In stock', '?', ['In stock', 'have this', 'any', 'where']),
        sceneCaption: "Sharp fragt genau nach dem Gegenstand, ohne Zusatz.",
        trophyWord: trophy('stock', 'Lager / Bestand', 'In stock?', 'Stock ist Sharps konkretes Wort für Verfügbarkeit — genau das, wonach gefragt wird.'),
        mediaCaption: "Produkt in der Hand, Blick zur Kasse, klare Ja-oder-nein-Frage.",
        songSeed: { genre: 'tight garage rock', mood: 'available or not' },
        visualNotes: 'Clean product crop, yes/no contrast, hard edge around this.',
      }),
    },
  },
  {
    slug: 'by-card',
    title: 'By card',
    situation: {
      en: "You reach the payment moment and need card or cash language.",
      de: "Du bist beim Bezahlen und brauchst Sprache für Karte oder Bargeld.",
    },
    pedagogicalGoal: "Ask to pay by card or cash.",
    variants: {
      bright: createA1P2VariantInput({
        targetText: "Could I pay by card, please?",
        baseText: "Könnte ich bitte mit Karte bezahlen?",
        meaning: "Eine freundliche Zahlungsfrage an der Kasse.",
        chunks: [
          chunk('could-i-pay', 'Could I pay', 'könnte ich bezahlen'),
          chunk('by-card', 'by card', 'mit Karte'),
          chunk('please', 'please', 'bitte'),
        ],
        targetChips: ['Could I pay', 'by card,', 'please?'],
        distractors: ['easy', 'cash'],
        typeRecall: recall('Could I ', 'pay by card', ', please?', ['pay by card', 'pay cash', 'card', 'easy']),
        sceneCaption: "Bright erreicht die Kasse und fragt freundlich nach Karte.",
        trophyWord: trophy('pay', 'bezahlen', 'I can pay by card.', 'Pay ist Brights einfacher Anker am Zahlungsmoment.'),
        mediaCaption: "Kontaktloses Kartenlesegerät, heller Tresen, kurzer Zahlungsblick.",
        songSeed: { genre: 'brass-and-guitar daylight', mood: 'easy payment' },
        visualNotes: 'Card tap glow, warm receipt edge, bright payment confirmation.',
      }),
      wistful: createA1P2VariantInput({
        targetText: "Would card be okay?",
        baseText: "Wäre Karte in Ordnung?",
        meaning: "Eine ruhige Frage, ob Karte in Ordnung ist.",
        chunks: [
          chunk('would-card', 'Would card', 'wäre Karte'),
          chunk('be-okay', 'be okay', 'in Ordnung'),
        ],
        targetChips: ['Would card', 'be okay?'],
        distractors: ['carefully', 'cash'],
        typeRecall: recall('Would ', 'card', ' be okay?', ['card', 'cash', 'carefully', 'pay by card']),
        sceneCaption: "Wistful fragt leise, bevor die Karte den Leser berührt.",
        trophyWord: trophy('carefully', 'vorsichtig', 'Carefully, please.', 'Carefully passt zu Wistfuls bedächtigem Bezahlmoment.'),
        mediaCaption: "Kartenleser im weichen Licht, ein kurzer fragender Blick.",
        songSeed: { genre: 'coldwave night drive', mood: 'careful payment' },
        visualNotes: 'Dim terminal glow, small pause before tap, soft blue highlight.',
      }),
      sharp: createA1P2VariantInput({
        targetText: "Card, please.",
        baseText: "Mit Karte, bitte.",
        meaning: "Eine kurze Frage nach Kartenzahlung.",
        chunks: [
          chunk('card', 'Card', 'mit Karte'),
          chunk('please', 'please', 'bitte'),
        ],
        targetChips: ['Card,', 'please.'],
        distractors: ['now', 'cash'],
        typeRecall: recall('', 'Card', ', please.', ['Card', 'cash', 'receipt', 'now']),
        sceneCaption: "Sharp klärt die Zahlungsart, bevor Zeit verloren geht.",
        trophyWord: trophy('card', 'Karte', 'Card, please.', 'Card ist Sharps direkter Zahlungsanker.'),
        mediaCaption: "Kartenleser, klare Handbewegung, direkte Zahlungsfrage.",
        songSeed: { genre: 'crisp funk-bass precision', mood: 'quick payment' },
        visualNotes: 'Crisp terminal crop, straight line to card, no soft extras.',
      }),
    },
  },
  {
    slug: 'a-receipt-please',
    title: 'A receipt, please',
    situation: {
      en: "You need a receipt, a bag, or both before leaving.",
      de: "Du brauchst vor dem Gehen eine Quittung, eine Tüte oder beides.",
    },
    pedagogicalGoal: "Ask for a receipt or bag.",
    variants: {
      bright: createA1P2VariantInput({
        targetText: "Could I get a receipt and a bag?",
        baseText: "Könnte ich eine Quittung und eine Tüte bekommen?",
        meaning: "Eine freundliche Zusatzbitte kurz vor dem Gehen.",
        chunks: [
          chunk('could-i-get', 'Could I get', 'könnte ich bekommen'),
          chunk('a-receipt', 'a receipt', 'eine Quittung'),
          chunk('and-a-bag', 'and a bag', 'und eine Tüte'),
        ],
        targetChips: ['Could I get', 'a receipt', 'and a bag?'],
        distractors: ['neat', 'card'],
        typeRecall: recall('Could I get a ', 'receipt', ' and a bag?', ['receipt', 'bag', 'card', 'neat']),
        sceneCaption: "Bright erinnert sich rechtzeitig und fragt warm nach Quittung und Tüte.",
        trophyWord: trophy('neat', 'ordentlich', 'Neat, thanks.', 'Neat ist Brights kurzer, freundlicher Schlusston am Empfang.'),
        mediaCaption: "Kasse, Quittungsrolle, kleine Tüte am Rand des Tresens.",
        songSeed: { genre: 'highlife walk', mood: 'small extra' },
        visualNotes: 'Receipt curl, bag outline, warm thank-you beat.',
      }),
      wistful: createA1P2VariantInput({
        targetText: "A receipt, please. And a bag?",
        baseText: "Eine Quittung bitte. Und eine Tüte?",
        meaning: "Eine kleine Zusatzfrage, fast schon beim Weggehen.",
        chunks: [
          chunk('a-receipt', 'A receipt', 'eine Quittung'),
          chunk('please', 'please', 'bitte'),
          chunk('and-a-bag', 'And a bag', 'und eine Tüte'),
        ],
        targetChips: ['A receipt,', 'please.', 'And a bag?'],
        distractors: ['near', 'card'],
        typeRecall: recall('A ', 'receipt', ', please. And a bag?', ['receipt', 'bag', 'card', 'again']),
        sceneCaption: "Wistful hält kurz inne und fügt die Tüte vorsichtig hinzu.",
        trophyWord: trophy('paper', 'Papier', 'On paper, please.', 'Paper macht die Bitte um eine Quittung greifbar.'),
        mediaCaption: "Die Hand schon nahe an der Türe, die Quittung kommt noch dazu.",
        songSeed: { genre: 'nylon-guitar memory piece', mood: 'small afterthought' },
        visualNotes: 'Door-side pause, soft receipt paper, low warm edge.',
      }),
      sharp: createA1P2VariantInput({
        targetText: "Receipt and bag, please.",
        baseText: "Quittung und Tüte, bitte.",
        meaning: "Eine knappe, klare Zusatzbitte an der Kasse.",
        chunks: [
          chunk('receipt', 'Receipt', 'Quittung'),
          chunk('and-bag', 'and bag', 'und Tüte'),
          chunk('please', 'please', 'bitte'),
        ],
        targetChips: ['Receipt', 'and bag,', 'please.'],
        distractors: ['two', 'card'],
        typeRecall: recall('', 'Receipt', ' and bag, please.', ['Receipt', 'bag', 'card', 'cash']),
        sceneCaption: "Sharp nennt beide Dinge in einem Zug.",
        trophyWord: trophy('printed', 'gedruckt', 'Printed, please.', 'Printed ist Sharps konkrete Form für den Beleg — eine ausgedruckte Quittung statt eines digitalen Kompromisses.'),
        mediaCaption: "Quittung, Tüte, kurzer Blick zur Kasse, fertig.",
        songSeed: { genre: 'brass-hits and tight kit', mood: 'tight checkout' },
        visualNotes: 'Two-item checklist, crisp check marks, compact receipt crop.',
      }),
    },
  },
  {
    slug: 'i-have-a-reservation',
    title: 'I have a reservation',
    situation: {
      en: "You arrive at a restaurant, hotel, or desk with a booking.",
      de: "Du kommst mit einer Reservierung im Restaurant, Hotel oder am Schalter an.",
    },
    pedagogicalGoal: "Use a basic booking phrase.",
    variants: {
      bright: createA1P2VariantInput({
        targetText: "Hi, my booking is ready.",
        baseText: "Hallo, meine Buchung ist bereit.",
        meaning: "Ein freundlicher Start für einen gebuchten Platz oder Termin.",
        chunks: [
          chunk('hi', 'Hi', 'Hallo'),
          chunk('my-booking', 'my booking', 'meine Buchung'),
          chunk('is-ready', 'is ready', 'ist bereit'),
        ],
        targetChips: ['Hi,', 'my booking', 'is ready.'],
        distractors: ['kind', 'table'],
        typeRecall: recall('Hi, my ', 'booking', ' is ready.', ['booking', 'reservation', 'table', 'kind']),
        sceneCaption: "Bright kommt an und macht den gebuchten Moment freundlich klar.",
        trophyWord: trophy('kind', 'freundlich', 'Kind of you, thanks.', 'Kind passt zum warmen Empfang am Anfang.'),
        mediaCaption: "Restaurantpult, Reservierungsliste, offener erster Satz.",
        songSeed: { genre: 'power-pop quick yes', mood: 'friendly arrival' },
        visualNotes: 'Reservation book glow, warm host stand, soft name-line highlight.',
      }),
      wistful: createA1P2VariantInput({
        targetText: "My booking might be here.",
        baseText: "Meine Buchung müsste hier sein.",
        meaning: "Eine vorsichtige Buchungsphrase, wenn du noch prüfst.",
        chunks: [
          chunk('my-booking', 'My booking', 'meine Buchung'),
          chunk('might-be-here', 'might be here', 'müsste hier sein'),
        ],
        targetChips: ['My booking', 'might be here.'],
        distractors: ['calm', 'table'],
        typeRecall: recall('My ', 'booking', ' might be here.', ['booking', 'reservation', 'name', 'again']),
        sceneCaption: "Wistful gibt die Reservierung an, mit einem kleinen unsicheren Rand.",
        trophyWord: trophy('calm', 'ruhig', 'Calm, thank you.', 'Calm hält die Ankunft leise und kontrolliert.'),
        mediaCaption: "Leiser Empfangstisch, Name auf einer Liste, kurzer prüfender Blick.",
        songSeed: { genre: 'industrial ambient with a beat', mood: 'quiet arrival' },
        visualNotes: 'Low light host stand, soft name card, gentle uncertainty cue.',
      }),
      sharp: createA1P2VariantInput({
        targetText: "I have a reservation.",
        baseText: "Ich habe eine Reservierung.",
        meaning: "Eine direkte Buchungsphrase ohne Zusatz.",
        chunks: [
          chunk('i-have', 'I have', 'ich habe'),
          chunk('a-reservation', 'a reservation', 'eine Reservierung'),
        ],
        targetChips: ['I have', 'a reservation.'],
        distractors: ['direct', 'table'],
        typeRecall: recall('I have a ', 'reservation', '.', ['reservation', 'table', 'name', 'direct']),
        sceneCaption: "Sharp sagt den Status zuerst: Reservierung vorhanden.",
        trophyWord: trophy('direct', 'direkt', 'Direct and clear.', 'Direct ist Sharps ganze Empfangsstrategie.'),
        mediaCaption: "Hoststand, Name wird geprüft, direkter Satz ohne Small Talk.",
        songSeed: { genre: 'acoustic percussion grid', mood: 'direct arrival' },
        visualNotes: 'Clean reservation line, hard white label, efficient framing.',
      }),
    },
  },
  {
    slug: 'is-this-right',
    title: 'Is this right?',
    situation: {
      en: "You confirm a bus, train, place, or item before committing.",
      de: "Du bestätigst Bus, Zug, Ort oder Gegenstand, bevor du weitermachst.",
    },
    pedagogicalGoal: "Confirm bus, train, place, or item.",
    variants: {
      bright: createA1P2VariantInput({
        targetText: "Is this the right bus?",
        baseText: "Ist das der richtige Bus?",
        meaning: "Eine klare, freundliche Bestätigung vor dem Einsteigen.",
        chunks: [
          chunk('is-this', 'Is this', 'ist das'),
          chunk('the-right', 'the right', 'der richtige'),
          chunk('bus', 'bus', 'Bus'),
        ],
        targetChips: ['Is this', 'the right', 'bus?'],
        distractors: ['sure', 'train'],
        typeRecall: recall('Is this the ', 'right bus', '?', ['right bus', 'right', 'train', 'sure']),
        sceneCaption: "Bright fragt vor dem Einstieg und bleibt dabei freundlich klar.",
        trophyWord: trophy('sure', 'sicher', 'Sure, thank you.', 'Sure ist der leichte Moment, wenn die Antwort passt.'),
        mediaCaption: "Bushaltestelle, Liniennummer, kurzer Check vor dem Einsteigen.",
        songSeed: { genre: 'bossa-lite lunchroom', mood: 'sure before moving' },
        visualNotes: 'Bus number highlight, warm yes cue, open boarding frame.',
      }),
      wistful: createA1P2VariantInput({
        targetText: "Is this right, please?",
        baseText: "Ist das bitte richtig?",
        meaning: "Eine vorsichtige Bestätigungsfrage, bevor du dich festlegst.",
        chunks: [
          chunk('is-this', 'Is this', 'ist das'),
          chunk('right', 'right', 'richtig'),
          chunk('please', 'please', 'bitte'),
        ],
        targetChips: ['Is this', 'right,', 'please?'],
        distractors: ['simple', 'bus'],
        typeRecall: recall('Is this ', 'right', ', please?', ['right', 'bus', 'train', 'again']),
        sceneCaption: "Wistful prüft den Moment leise, bevor er weitergeht.",
        trophyWord: trophy('simple', 'einfach', 'Simple question.', 'Simple hält die Bestätigung klein und machbar.'),
        mediaCaption: "Haltestellenschild im weichen Licht, die Frage bleibt vorsichtig.",
        songSeed: { genre: 'late-night piano', mood: 'careful check' },
        visualNotes: 'Soft sign focus, small question mark pulse, subdued confirmation.',
      }),
      sharp: createA1P2VariantInput({
        targetText: "Is this the right train?",
        baseText: "Ist das der richtige Zug?",
        meaning: "Eine direkte Bestätigung für den richtigen Zug.",
        chunks: [
          chunk('is-this', 'Is this', 'ist das'),
          chunk('the-right', 'the right', 'der richtige'),
          chunk('train', 'train', 'Zug'),
        ],
        targetChips: ['Is this', 'the right', 'train?'],
        distractors: ['yes', 'bus'],
        typeRecall: recall('Is this the ', 'right train', '?', ['right train', 'right', 'bus', 'yes']),
        sceneCaption: "Sharp klärt Zug und Richtung, bevor die Tür schließt.",
        trophyWord: trophy('correct', 'richtig / korrekt', 'Correct, thank you.', 'Correct ist Sharps entschiedene Bestätigung — ein erwachsenes Service-Wort, kein Reflex-Ja.'),
        mediaCaption: "Bahnsteigkante, Zuganzeige, klare Frage vor dem Einstieg.",
        songSeed: { genre: 'piano + snare decisive', mood: 'confirmed route' },
        visualNotes: 'Train display crop, sharp green check, directional grid.',
      }),
    },
  },
  {
    slug: 'one-moment',
    title: 'One moment',
    situation: {
      en: "You need someone to wait while you find a card, word, or answer.",
      de: "Jemand soll kurz warten, während du Karte, Wort oder Antwort suchst.",
    },
    pedagogicalGoal: "Ask someone to wait briefly.",
    variants: {
      bright: createA1P2VariantInput({
        targetText: "One moment! I'm almost ready.",
        baseText: "Einen Moment! Ich bin fast bereit.",
        meaning: "Eine warme Bitte um kurze Zeit, ohne die Szene zu stoppen.",
        chunks: [
          chunk('one-moment', 'One moment', 'einen Moment'),
          chunk('im-almost-ready', "I'm almost ready", 'ich bin fast bereit'),
        ],
        targetChips: ['One moment!', "I'm almost ready."],
        distractors: ['cheerful', 'again'],
        typeRecall: recall('', 'One moment', '! I\'m almost ready.', ['One moment', 'almost ready', 'again', 'wait']),
        sceneCaption: "Bright braucht kurz Zeit und lässt trotzdem gute Energie im Raum.",
        trophyWord: trophy('cheerful', 'heiter', 'Cheerful, thank you.', 'Cheerful passt zum hellen Warten ohne Druck.'),
        mediaCaption: "Kartenetui offen, kleiner Blick zur Kasse, ein kurzer freundlicher Moment.",
        songSeed: { genre: 'surf-guitar shuffle', mood: 'brief pause' },
        visualNotes: 'Warm pause icon, open wallet cue, almost-ready yellow pulse.',
      }),
      wistful: createA1P2VariantInput({
        targetText: "Sorry — one moment. I need a second.",
        baseText: "Entschuldigung, einen Moment. Ich brauche eine Sekunde.",
        meaning: "Eine ruhige Bitte, kurz suchen oder denken zu dürfen.",
        chunks: [
          chunk('sorry', 'Sorry', 'Entschuldigung'),
          chunk('one-moment', 'one moment', 'einen Moment'),
          chunk('i-need-a-second', 'I need a second', 'ich brauche eine Sekunde'),
        ],
        targetChips: ['Sorry —', 'one moment.', 'I need a second.'],
        distractors: ['patient', 'again'],
        typeRecall: recall('Sorry — ', 'one moment', '. I need a second.', ['one moment', 'second', 'again', 'wait']),
        sceneCaption: "Wistful nimmt sich eine kleine Sekunde, ohne sich zu verlieren.",
        trophyWord: trophy('patient', 'geduldig', 'Patient, thank you.', 'Patient beschreibt die ruhige Hilfe, die diese Phrase braucht.'),
        mediaCaption: "Ein Blick in die Tasche, eine ruhige Handbewegung, die Szene wartet.",
        songSeed: { genre: 'wistful drum-and-bass', mood: 'patient pause' },
        visualNotes: 'Slow hand motion, soft pause ring, blue-gray stillness.',
      }),
      sharp: createA1P2VariantInput({
        targetText: "One moment. Ready soon.",
        baseText: "Einen Moment. Ich bin gleich bereit.",
        meaning: "Eine kurze Wartebitte mit klarem Abschluss.",
        chunks: [
          chunk('one-moment', 'One moment', 'einen Moment'),
          chunk('ready-soon', 'Ready soon', 'gleich bereit'),
        ],
        targetChips: ['One moment.', 'Ready soon.'],
        distractors: ['wait', 'please'],
        typeRecall: recall('', 'One moment', '. Ready soon.', ['One moment', 'ready soon', 'wait', 'ready']),
        sceneCaption: "Sharp stoppt kurz, setzt aber sofort das Ende der Pause.",
        trophyWord: trophy('wait', 'warten', 'Wait, please.', 'Wait ist Sharps klare Pause vor dem nächsten Schritt.'),
        mediaCaption: "Kurzer Stopp an der Kasse, Karte fast bereit, weiter in einem Schlag.",
        songSeed: { genre: 'spoken-sung rhythmic pop', mood: 'brief hold' },
        visualNotes: 'Compact pause mark, hard reset line, done state flash.',
      }),
    },
  },
]

const a1Practical2Lessons: GuidedLessonDefinition[] = a1Practical2Inputs.map((lessonInput, index) => {
  const lessonNumber = index + 1
  const id = `english-a1-practical-2-${String(lessonNumber).padStart(3, '0')}-${lessonInput.slug}`
  const nextInput = a1Practical2Inputs[index + 1]

  return {
    id,
    pathId: GUIDED_TODAY_PATH_TWO_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_TWO_METADATA.title,
    level: GUIDED_TODAY_PATH_TWO_METADATA.level,
    lessonNumber,
    baseLanguage: GUIDED_TODAY_PATH_TWO_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_TWO_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_TWO_METADATA,
    lessonMetadata: {
      id,
      sequence: lessonNumber,
      title: lessonInput.title,
    },
    title: lessonInput.title,
    situation: lessonInput.situation,
    pedagogicalGoal: lessonInput.pedagogicalGoal,
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: nextInput?.title ?? 'Path complete',
      situation: nextInput?.situation.de ?? 'Du hast A1 Practical 2 abgeschlossen.',
    },
    vibeVariants: {
      bright: createA1P2Variant(lessonInput.variants.bright),
      wistful: createA1P2Variant(lessonInput.variants.wistful),
      sharp: createA1P2Variant(lessonInput.variants.sharp),
    },
  }
})

type A1P3VariantInput = A1P2VariantInput

type A1P3LessonInput = {
  slug: string
  title: string
  situation: GuidedLessonDefinition['situation']
  pedagogicalGoal: string
  variants: Record<ActiveGuidedVibeId, A1P3VariantInput>
}

const a1Practical3Inputs: A1P3LessonInput[] = [
  {
    slug: 'right-or-left',
    title: 'Right or left?',
    situation: {
      en: "You ask for a simple turn and confirm the direction.",
      de: "Du fragst nach einer einfachen Abbiegung und bestätigst die Richtung.",
    },
    pedagogicalGoal: "Ask whether to turn right or left in a practical street moment.",
    variants: {
      bright: createA1P3VariantInput({
        targetText: "Excuse me, should I turn left here?",
        baseText: "Entschuldigung, soll ich hier bitte links abbiegen?",
        meaning: "Eine freundliche Richtungsfrage, bevor du weitergehst.",
        chunks: [
          chunk('excuse-me', 'Excuse me', 'Entschuldigung'),
          chunk('should-i-turn-left', 'should I turn left', 'soll ich links abbiegen'),
          chunk('here', 'here', 'hier'),
        ],
        targetChips: ['Excuse me,', 'should I turn left', 'here?'],
        distractors: ['friendly', 'right'],
        typeRecall: recall('Excuse me, should I ', 'turn left', ' here?', ['turn left', 'turn right', 'friendly', 'here']),
        sceneCaption: "Bright fragt offen an der Kreuzung und macht die Richtung leicht bestätigbar.",
        trophyWord: trophy('friendly', 'freundlich', 'Friendly direction, thanks.', 'Friendly passt zur warmen Nachfrage, ohne die Richtung zu verwischen.'),
        mediaCaption: "Sonnige Kreuzung, zwei Pfeile auf einem Stadtplan, kurzer Blick zur linken Straße.",
        songSeed: { genre: 'light acoustic pop', mood: 'warm direction check' },
        visualNotes: 'Warm left-arrow highlight, daylight street corner, friendly map cue.',
      }),
      wistful: createA1P3VariantInput({
        targetText: "Sorry, do I go right from here?",
        baseText: "Entschuldigung, gehe ich von hier bitte nach rechts?",
        meaning: "Eine vorsichtige Frage, damit du nicht in die falsche Richtung gehst.",
        chunks: [
          chunk('sorry', 'Sorry', 'Entschuldigung'),
          chunk('do-i-go-right', 'do I go right', 'gehe ich nach rechts'),
          chunk('from-here', 'from here', 'von hier'),
        ],
        targetChips: ['Sorry,', 'do I go right', 'from here?'],
        distractors: ['softly', 'left'],
        typeRecall: recall('Sorry, do I ', 'go right', ' from here?', ['go right', 'go left', 'softly', 'from here']),
        sceneCaption: "Wistful hält kurz inne und fragt leise nach der richtigen Seite.",
        trophyWord: trophy('softly', 'leise', 'Softly, I ask which way.', 'Softly beschreibt den vorsichtigen Ton der Wegfrage.'),
        mediaCaption: "Ruhige Ecke, gedimmtes Schaufensterlicht, ein kleiner Pfeil nach rechts.",
        songSeed: { genre: 'soft indie folk', mood: 'careful turn' },
        visualNotes: 'Muted right-arrow glow, slow pause at the crossing, blue-gray street light.',
      }),
      sharp: createA1P3VariantInput({
        targetText: "Turn left here, correct?",
        baseText: "Hier links abbiegen, richtig, bitte?",
        meaning: "Eine knappe Bestätigung für die nächste Abbiegung.",
        chunks: [
          chunk('turn-left', 'Turn left', 'links abbiegen'),
          chunk('here', 'here', 'hier'),
          chunk('correct', 'correct', 'richtig'),
        ],
        targetChips: ['Turn left', 'here,', 'correct?'],
        distractors: ['straight', 'right'],
        typeRecall: recall('', 'Turn left', ' here, correct?', ['Turn left', 'Turn right', 'straight', 'correct']),
        sceneCaption: "Sharp prüft die Abbiegung in einem kurzen Satz und geht weiter.",
        trophyWord: trophy('turn', 'biegen', 'Turn left.', 'Turn ist Sharps direkte Wegbeschreibung in einem Wort.'),
        mediaCaption: "Kontrastreiche Straßenecke, linker Pfeil, harte Markierung auf dem Asphalt.",
        songSeed: { genre: 'minimal synth pulse', mood: 'direct turn' },
        visualNotes: 'High-contrast left marker, compact confirmation flash, no extra copy.',
      }),
    },
  },
  {
    slug: 'how-far-is-it',
    title: 'How far is it?',
    situation: {
      en: "You ask whether the place is close enough to reach soon.",
      de: "Du fragst, ob der Ort nah genug ist und wie lange der Weg dauert.",
    },
    pedagogicalGoal: "Ask about distance with short time or walking language.",
    variants: {
      bright: createA1P3VariantInput({
        targetText: "Could you tell me, is it five minutes away?",
        baseText: "Könnten Sie mir bitte sagen, ob es etwa fünf Minuten entfernt ist?",
        meaning: "Eine warme Frage nach einer kleinen, machbaren Entfernung.",
        chunks: [
          chunk('could-you-tell-me', 'Could you tell me', 'könnten Sie mir sagen'),
          chunk('is-it-five-minutes', 'is it five minutes', 'sind es fünf Minuten'),
          chunk('away', 'away', 'entfernt'),
        ],
        targetChips: ['Could you tell me,', 'is it five minutes', 'away?'],
        distractors: ['nearby', 'bus'],
        typeRecall: recall('Could you tell me, is it ', 'five minutes', ' away?', ['five minutes', 'ten minutes', 'nearby', 'far']),
        sceneCaption: "Bright fragt nach der Dauer und macht die Strecke überschaubar.",
        trophyWord: trophy('minutes', 'Minuten', 'Five minutes away.', 'Minutes macht die Wegfrage greifbar in einer Zahl.'),
        mediaCaption: "Heller Gehweg, Telefonkarte mit kurzer Route, Zielpunkt nur wenige Blocks entfernt.",
        songSeed: { genre: 'sunny indie pop', mood: 'nearby walk' },
        visualNotes: 'Warm route dots, five-minute badge, open walking lane.',
      }),
      wistful: createA1P3VariantInput({
        targetText: "Is it a long walk from here, please?",
        baseText: "Ist es von hier bitte ein langer Weg zu Fuß?",
        meaning: "Eine vorsichtige Frage, ob der Weg zu Fuß zu weit ist.",
        chunks: [
          chunk('is-it-a-long-walk', 'is it a long walk', 'ist es ein langer Weg zu Fuß'),
          chunk('from-here', 'from here', 'von hier'),
        ],
        targetChips: ['Is it a long walk', 'from here,', 'please?'],
        distractors: ['slowly', 'near'],
        typeRecall: recall('Is it ', 'a long walk', ' from here, please?', ['a long walk', 'a short walk', 'slowly', 'near']),
        sceneCaption: "Wistful klärt die Strecke behutsam, bevor die Beine entscheiden.",
        trophyWord: trophy('walk', 'gehen', 'A short walk.', 'Walk hält die ruhige Frage nach der Strecke konkret.'),
        mediaCaption: "Leiser Gehweg am Abend, Route auf dem Handy, genug Platz zum Nachfragen.",
        songSeed: { genre: 'soft indie folk', mood: 'slow distance check' },
        visualNotes: 'Soft walking path, low-contrast distance line, calm time cue.',
      }),
      sharp: createA1P3VariantInput({
        targetText: "How far is it from here?",
        baseText: "Wie weit ist es bitte von hier?",
        meaning: "Eine direkte Frage nach der Entfernung vom aktuellen Ort.",
        chunks: [
          chunk('how-far', 'How far', 'wie weit'),
          chunk('is-it', 'is it', 'ist es'),
          chunk('from-here', 'from here', 'von hier'),
        ],
        targetChips: ['How far', 'is it', 'from here?'],
        distractors: ['exact', 'soon'],
        typeRecall: recall('How far is it ', 'from here', '?', ['from here', 'near here', 'exact', 'soon']),
        sceneCaption: "Sharp will die Distanz, nicht die Geschichte zur Distanz.",
        trophyWord: trophy('exact', 'genau', 'Exact distance, please.', 'Exact passt zu einer knappen, brauchbaren Entfernungsfrage.'),
        mediaCaption: "Klare Kartenansicht, aktueller Standort markiert, Distanzlinie zum Ziel.",
        songSeed: { genre: 'minimal synth pulse', mood: 'exact distance' },
        visualNotes: 'Precise map ruler, strong origin point, compact distance marker.',
      }),
    },
  },
  {
    slug: 'is-it-open',
    title: 'Is it open?',
    situation: {
      en: "You check whether a shop, desk, or place is open right now.",
      de: "Du prüfst, ob ein Laden, Schalter oder Ort gerade offen ist.",
    },
    pedagogicalGoal: "Ask about current opening status before walking in.",
    variants: {
      bright: createA1P3VariantInput({
        targetText: "Is it open now, please?",
        baseText: "Ist es jetzt bitte offen?",
        meaning: "Eine freundliche Frage, ob du jetzt hineingehen kannst.",
        chunks: [
          chunk('is-it-open', 'Is it open', 'ist es offen'),
          chunk('now', 'now', 'jetzt'),
          chunk('please', 'please', 'bitte'),
        ],
        targetChips: ['Is it open', 'now,', 'please?'],
        distractors: ['open', 'closed'],
        typeRecall: recall('Is it ', 'open now', ', please?', ['open now', 'closed now', 'open', 'closed']),
        sceneCaption: "Bright fragt am Eingang freundlich, ob der Moment passt.",
        trophyWord: trophy('hours', 'Öffnungszeiten', 'What are your hours?', 'Hours macht die Öffnungs-Frage bright und konkret.'),
        mediaCaption: "Ladentür mit hellem Open-Schild, Hand kurz vor dem Griff.",
        songSeed: { genre: 'light acoustic pop', mood: 'open doorway' },
        visualNotes: 'Warm door sign, soft open glow, simple entrance framing.',
      }),
      wistful: createA1P3VariantInput({
        targetText: "Just checking — are they still open?",
        baseText: "Sind sie noch geöffnet?",
        meaning: "Eine vorsichtige Nachfrage, ob noch geöffnet ist.",
        chunks: [
          chunk('just-checking', 'Just checking', 'nur zur Sicherheit'),
          chunk('are-they-still-open', 'are they still open', 'sind sie noch geöffnet'),
        ],
        targetChips: ['Just checking —', 'are they', 'still open?'],
        distractors: ['careful', 'closed'],
        typeRecall: recall('Just checking — are they ', 'still open', '?', ['still open', 'already closed', 'careful', 'desk']),
        sceneCaption: "Wistful fragt leise nach, bevor aus Hoffnung ein Umweg wird.",
        trophyWord: trophy('careful', 'vorsichtig', 'A careful hours check.', 'Careful hält den Ton prüfend und freundlich.'),
        mediaCaption: "Ruhiger Infoschalter, Licht noch an, Uhr nahe am Rand der Öffnungszeit.",
        songSeed: { genre: 'soft indie folk', mood: 'careful opening check' },
        visualNotes: 'Soft desk lamp, quiet clock cue, subdued open sign.',
      }),
      sharp: createA1P3VariantInput({
        targetText: "Open now?",
        baseText: "Ist hier jetzt bitte geöffnet?",
        meaning: "Eine kurze Statusfrage vor dem Eingang.",
        chunks: [
          chunk('open-now', 'Open now', 'jetzt geöffnet'),
        ],
        targetChips: ['Open', 'now?'],
        distractors: ['direct', 'closed'],
        typeRecall: recall('', 'Open now', '?', ['Open now', 'Closed now', 'direct', 'place']),
        sceneCaption: "Sharp prüft den Status ohne Umweg.",
        trophyWord: trophy('still', 'noch', 'Still open?', 'Still passt zur Sharp-Kontrolle vor dem Besuch.'),
        mediaCaption: "Kontrastreiches Schild am Eingang, Türlinie, klare Ja-nein-Situation.",
        songSeed: { genre: 'minimal synth pulse', mood: 'status check' },
        visualNotes: 'Crisp sign crop, binary open state, hard edge around doorway.',
      }),
    },
  },
  {
    slug: 'which-bus',
    title: 'Which bus?',
    situation: {
      en: "You ask which bus goes to the place you need.",
      de: "Du fragst, welcher Bus zu deinem Ziel fährt.",
    },
    pedagogicalGoal: "Ask for the right bus using a destination or route cue.",
    variants: {
      bright: createA1P3VariantInput({
        targetText: "Which bus goes to the museum, please?",
        baseText: "Welcher Bus fährt bitte zum Museum?",
        meaning: "Eine freundliche Frage nach der passenden Linie zum Ziel.",
        chunks: [
          chunk('which-bus', 'Which bus', 'welcher Bus'),
          chunk('goes-to', 'goes to', 'fährt zu'),
          chunk('the-museum', 'the museum', 'dem Museum'),
        ],
        targetChips: ['Which bus', 'goes to', 'the museum,', 'please?'],
        distractors: ['simple', 'train'],
        typeRecall: recall('Which bus goes to ', 'the museum', ', please?', ['the museum', 'the station', 'simple', 'train']),
        sceneCaption: "Bright verbindet die Busfrage mit einem klaren Ziel.",
        trophyWord: trophy('museum', 'Museum', 'Which bus to the museum?', 'Museum macht das Ziel konkret und greifbar.'),
        mediaCaption: "Bushaltestelle im Tageslicht, Linienplan, Museum als Zielpunkt markiert.",
        songSeed: { genre: 'sunny indie pop', mood: 'simple route' },
        visualNotes: 'Warm bus-line highlight, destination dot, open transit board.',
      }),
      wistful: createA1P3VariantInput({
        targetText: "Is this the right bus to the old town?",
        baseText: "Fährt dieser Bus bitte in die Altstadt?",
        meaning: "Eine vorsichtige Bestätigung, ob dieser Bus zur Altstadt fährt.",
        chunks: [
          chunk('is-this-the-right-bus', 'Is this the right bus', 'fährt dieser Bus'),
          chunk('to-the-old-town', 'to the old town', 'in die Altstadt'),
        ],
        targetChips: ['Is this', 'the right bus', 'to the old town?'],
        distractors: ['nearer', 'station'],
        typeRecall: recall('Is this the ', 'right bus', ' to the old town?', ['right bus', 'wrong bus', 'nearer', 'walk']),
        sceneCaption: "Wistful sucht nicht die perfekte Antwort, sondern einen nahen Ankunftspunkt.",
        trophyWord: trophy('nearer', 'näher', 'Nearer is better.', 'Nearer passt zu vorsichtiger Orientierung in einer fremden Stadt.'),
        mediaCaption: "Abendliche Haltestelle, Altstadt auf der Karte, Buslinie endet ein Stück davor.",
        songSeed: { genre: 'soft indie folk', mood: 'near old town' },
        visualNotes: 'Muted old-town marker, soft route end, gentle distance halo.',
      }),
      sharp: createA1P3VariantInput({
        targetText: "Which bus number goes downtown?",
        baseText: "Welche Busnummer fährt bitte ins Zentrum?",
        meaning: "Eine direkte Frage nach der Busnummer zum Zentrum.",
        chunks: [
          chunk('which-bus-number', 'Which bus number', 'welche Busnummer'),
          chunk('goes-downtown', 'goes downtown', 'fährt ins Zentrum'),
        ],
        targetChips: ['Which bus number', 'goes downtown?'],
        distractors: ['route', 'platform'],
        typeRecall: recall('Which ', 'bus number', ' goes downtown?', ['bus number', 'train number', 'route', 'platform']),
        sceneCaption: "Sharp will die Nummer und dann los.",
        trophyWord: trophy('route', 'Route', 'Route confirmed.', 'Route ist das knappe Wort für die richtige Verbindung.'),
        mediaCaption: "Busanzeige mit Liniennummern, Zentrum als klares Ziel, enger Zuschnitt.",
        songSeed: { genre: 'minimal synth pulse', mood: 'route number' },
        visualNotes: 'Number board crop, sharp destination line, focused route chip.',
      }),
    },
  },
  {
    slug: 'the-next-stop',
    title: 'The next stop',
    situation: {
      en: "You check whether your stop is coming next.",
      de: "Du prüfst, ob deine Haltestelle als Nächstes kommt.",
    },
    pedagogicalGoal: "Ask or confirm the next stop while riding.",
    variants: {
      bright: createA1P3VariantInput({
        targetText: "Is the next stop Central Park, please?",
        baseText: "Ist die nächste Haltestelle bitte Central Park?",
        meaning: "Eine warme Bestätigung, ob der nächste Halt dein Ziel ist.",
        chunks: [
          chunk('is-the-next-stop', 'Is the next stop', 'ist die nächste Haltestelle'),
          chunk('central-park', 'Central Park', 'Central Park'),
          chunk('please', 'please', 'bitte'),
        ],
        targetChips: ['Is the next stop', 'Central Park,', 'please?'],
        distractors: ['steady', 'station'],
        typeRecall: recall('Is the ', 'next stop', ' Central Park, please?', ['next stop', 'last stop', 'steady', 'station']),
        sceneCaption: "Bright prüft den Halt freundlich, solange noch Zeit zum Aufstehen ist.",
        trophyWord: trophy('steady', 'ruhig', 'Steady, next stop.', 'Steady gibt dem Moment Ruhe, ohne ihn schwer zu machen.'),
        mediaCaption: "Heller Businnenraum, Haltestellenanzeige, Hand nahe am Halteknopf.",
        songSeed: { genre: 'light acoustic pop', mood: 'steady arrival' },
        visualNotes: 'Warm next-stop banner, gentle stop-button glow, easy arrival cue.',
      }),
      wistful: createA1P3VariantInput({
        targetText: "Could you tell me if this stop is coming soon?",
        baseText: "Könnten Sie mir bitte sagen, ob diese Haltestelle bald kommt?",
        meaning: "Eine vorsichtige Frage, ob du dich schon bereitmachen sollst.",
        chunks: [
          chunk('could-you-tell-me', 'Could you tell me', 'könnten Sie mir sagen'),
          chunk('if-this-stop-is', 'if this stop is', 'ob diese Haltestelle'),
          chunk('coming-soon', 'coming soon', 'bald'),
        ],
        targetChips: ['Could you tell me', 'if this stop is', 'coming soon?'],
        distractors: ['calmly', 'late'],
        typeRecall: recall('Could you tell me if this stop is ', 'coming soon', '?', ['coming soon', 'coming later', 'calmly', 'late']),
        sceneCaption: "Wistful fragt früh genug, damit Aussteigen nicht hektisch wird.",
        trophyWord: trophy('calmly', 'ruhig', 'Calmly, I get ready.', 'Calmly macht den Haltestellenmoment vorsichtig statt hektisch.'),
        mediaCaption: "Leiser Waggon, Anzeige im Fensterlicht, Tasche schon locker in der Hand.",
        songSeed: { genre: 'soft indie folk', mood: 'calm next stop' },
        visualNotes: 'Soft stop display, slow readiness motion, muted aisle light.',
      }),
      sharp: createA1P3VariantInput({
        targetText: "Next stop is mine, correct?",
        baseText: "Ist das bitte meine nächste Haltestelle?",
        meaning: "Eine schnelle Bestätigung vor dem Aussteigen.",
        chunks: [
          chunk('next-stop', 'Next stop', 'nächste Haltestelle'),
          chunk('is-mine', 'is mine', 'ist meine'),
          chunk('correct', 'correct', 'richtig'),
        ],
        targetChips: ['Next stop', 'is mine,', 'correct?'],
        distractors: ['next', 'later'],
        typeRecall: recall('Next stop ', 'is mine', ', correct?', ['is mine', 'is later', 'next', 'later']),
        sceneCaption: "Sharp bestätigt und bewegt sich zur Tür.",
        trophyWord: trophy('next', 'nächste', 'Next stop.', 'Next ist knapp, häufig und perfekt für Verkehrsmomente.'),
        mediaCaption: "Türbereich, nächster Halt auf der Anzeige, direkter Blick zum Ausgang.",
        songSeed: { genre: 'minimal synth pulse', mood: 'next stop ready' },
        visualNotes: 'Hard next-stop text, door line, compact exit cue.',
      }),
    },
  },
  {
    slug: 'a-ticket-please',
    title: 'A ticket, please',
    situation: {
      en: "You buy a simple ticket for one ride or one place.",
      de: "Du kaufst ein einfaches Ticket für eine Fahrt oder einen Ort.",
    },
    pedagogicalGoal: "Ask for a ticket with a simple type or destination.",
    variants: {
      bright: createA1P3VariantInput({
        targetText: "Could I get one ticket to the city, please?",
        baseText: "Kann ich bitte ein Ticket in die Stadt bekommen?",
        meaning: "Eine warme Ticketfrage mit Ziel und Anzahl.",
        chunks: [
          chunk('could-i-get', 'Could I get', 'kann ich bekommen'),
          chunk('one-ticket', 'one ticket', 'ein Ticket'),
          chunk('to-the-city', 'to the city', 'in die Stadt'),
        ],
        targetChips: ['Could I get', 'one ticket', 'to the city,', 'please?'],
        distractors: ['valid', 'return'],
        typeRecall: recall('Could I get ', 'one ticket', ' to the city, please?', ['one ticket', 'two tickets', 'valid', 'return']),
        sceneCaption: "Bright bestellt das Ticket klar und freundlich am Schalter.",
        trophyWord: trophy('valid', 'gültig', 'Valid ticket.', 'Valid ist ein nützliches Wort, wenn Tickets kontrolliert werden.'),
        mediaCaption: "Ticketschalter, kleines Papierticket, Stadtziel auf dem Display.",
        songSeed: { genre: 'sunny indie pop', mood: 'ticket ready' },
        visualNotes: 'Warm ticket edge, destination text, simple one-ticket counter.',
      }),
      wistful: createA1P3VariantInput({
        targetText: "Could I have a single ticket, please?",
        baseText: "Könnte ich bitte eine Einzelfahrkarte haben?",
        meaning: "Eine ruhige Bitte um ein einfaches Einzelticket.",
        chunks: [
          chunk('could-i-have', 'Could I have', 'könnte ich haben'),
          chunk('a-single-ticket', 'a single ticket', 'eine Einzelfahrkarte'),
          chunk('please', 'please', 'bitte'),
        ],
        targetChips: ['Could I have', 'a single ticket,', 'please?'],
        distractors: ['perhaps', 'return'],
        typeRecall: recall('Could I have ', 'a single ticket', ', please?', ['a single ticket', 'a return ticket', 'perhaps', 'cash']),
        sceneCaption: "Wistful hält die Ticketbitte klein und deutlich.",
        trophyWord: trophy('perhaps', 'vielleicht', 'Perhaps a single ticket.', 'Perhaps passt zum vorsichtigen Klären am Schalter.'),
        mediaCaption: "Ruhiger Automat, Einzelticket-Auswahl, Finger wartet vor dem Bildschirm.",
        songSeed: { genre: 'soft indie folk', mood: 'small ticket request' },
        visualNotes: 'Soft ticket selector, single-option glow, quiet machine light.',
      }),
      sharp: createA1P3VariantInput({
        targetText: "One single ticket to the center, please.",
        baseText: "Ein Einzelticket ins Zentrum, bitte.",
        meaning: "Eine knappe Bestellung für ein Einzelticket.",
        chunks: [
          chunk('one-single-ticket', 'One single ticket', 'ein Einzelticket'),
          chunk('to-the-center', 'to the center', 'ins Zentrum'),
          chunk('please', 'please', 'bitte'),
        ],
        targetChips: ['One single ticket', 'to the center,', 'please.'],
        distractors: ['single', 'cash'],
        typeRecall: recall('One ', 'single ticket', ' to the center, please.', ['single ticket', 'return ticket', 'single', 'cash']),
        sceneCaption: "Sharp sagt Tickettyp und Ziel in einem Zug.",
        trophyWord: trophy('single', 'einfach', 'Single ticket.', 'Single ist kurz und praktisch für Ticketarten.'),
        mediaCaption: "Schalterdisplay, Einzelticket markiert, Zentrum als Zielzeile.",
        songSeed: { genre: 'minimal synth pulse', mood: 'single ticket' },
        visualNotes: 'Sharp ticket type label, center destination line, compact payment frame.',
      }),
    },
  },
  {
    slug: 'what-time-does-it-close',
    title: 'What time does it close?',
    situation: {
      en: "You ask when a place closes so you can plan the visit.",
      de: "Du fragst, wann ein Ort schließt, damit du den Besuch planen kannst.",
    },
    pedagogicalGoal: "Ask about closing time using a short A1 time question.",
    variants: {
      bright: createA1P3VariantInput({
        targetText: "What time does it close today, please?",
        baseText: "Um wie viel Uhr schließt es heute bitte?",
        meaning: "Eine freundliche Frage nach der heutigen Schließzeit.",
        chunks: [
          chunk('what-time', 'What time', 'um wie viel Uhr'),
          chunk('does-it-close', 'does it close', 'schließt es'),
          chunk('today', 'today', 'heute'),
        ],
        targetChips: ['What time', 'does it close', 'today,', 'please?'],
        distractors: ['closing', 'open'],
        typeRecall: recall('What time does it ', 'close today', ', please?', ['close today', 'open today', 'closing', 'later']),
        sceneCaption: "Bright fragt nach der Zeit und macht Planung leichter.",
        trophyWord: trophy('closing', 'Schließung', 'Closing time, please.', 'Closing ist direkt mit Öffnungszeiten verbunden und alltagstauglich.'),
        mediaCaption: "Museumseingang, Öffnungszeiten auf einem Schild, Tageslicht wird später.",
        songSeed: { genre: 'light acoustic pop', mood: 'closing time plan' },
        visualNotes: 'Warm clock highlight, closing-time row, friendly schedule card.',
      }),
      wistful: createA1P3VariantInput({
        targetText: "Do you know when it closes today?",
        baseText: "Wissen Sie, wann es heute schließt?",
        meaning: "Eine vorsichtige Frage, ob du dich beeilen musst.",
        chunks: [
          chunk('do-you-know', 'Do you know', 'wissen Sie'),
          chunk('when-it-closes', 'when it closes', 'wann es schließt'),
          chunk('today', 'today', 'heute'),
        ],
        targetChips: ['Do you know', 'when it closes', 'today?'],
        distractors: ['early', 'open'],
        typeRecall: recall('Do you know when it ', 'closes today', '?', ['closes today', 'opens today', 'early', 'today']),
        sceneCaption: "Wistful fragt behutsam, ob noch genug Zeit bleibt.",
        trophyWord: trophy('early', 'früh', 'Early today?', 'Early ist schlicht und hilfreich für Öffnungszeiten.'),
        mediaCaption: "Leises Eingangsschild, frühe Schließzeit markiert, ein Blick zur Uhr.",
        songSeed: { genre: 'soft indie folk', mood: 'early close' },
        visualNotes: 'Muted clock face, soft early label, gentle time pressure.',
      }),
      sharp: createA1P3VariantInput({
        targetText: "Closing time?",
        baseText: "Wann schließt es heute?",
        meaning: "Eine direkte Frage nach der Schließzeit des Ortes.",
        chunks: [
          chunk('closing-time', 'Closing time', 'Schließzeit'),
        ],
        targetChips: ['Closing', 'time?'],
        distractors: ['closed', 'open'],
        typeRecall: recall('', 'Closing time', '?', ['Closing time', 'Opening time', 'closed', 'late']),
        sceneCaption: "Sharp holt die Schließzeit und entscheidet sofort.",
        trophyWord: trophy('closed', 'geschlossen', 'Closed at six.', 'Closed ist das klare Gegenstück zu open und wichtig für Planung.'),
        mediaCaption: "Schwarz-weißes Öffnungszeitenschild, Schließzeit hart unterstrichen.",
        songSeed: { genre: 'minimal synth pulse', mood: 'closing decision' },
        visualNotes: 'Hard close-time underline, compact clock mark, precise schedule crop.',
      }),
    },
  },
  {
    slug: 'the-corner',
    title: 'The corner',
    situation: {
      en: "You use a corner as a simple landmark.",
      de: "Du benutzt eine Ecke als einfache Orientierung.",
    },
    pedagogicalGoal: "Ask or confirm a landmark at the corner.",
    variants: {
      bright: createA1P3VariantInput({
        targetText: "Is it on the corner, please?",
        baseText: "Ist es bitte an der Ecke?",
        meaning: "Eine freundliche Frage nach einem einfachen Orientierungspunkt.",
        chunks: [
          chunk('is-it', 'Is it', 'ist es'),
          chunk('on-the-corner', 'on the corner', 'an der Ecke'),
          chunk('please', 'please', 'bitte'),
        ],
        targetChips: ['Is it', 'on the corner,', 'please?'],
        distractors: ['corner', 'street'],
        typeRecall: recall('Is it ', 'on the corner', ', please?', ['on the corner', 'on the street', 'corner', 'nearby']),
        sceneCaption: "Bright macht die Ecke zum einfachen, freundlichen Orientierungspunkt.",
        trophyWord: trophy('corner', 'Ecke', 'On the corner.', 'Corner ist ein konkretes A1-Wegwort für Städte.'),
        mediaCaption: "Helle Straßenecke, kleines Ladenschild, Ziel direkt am Eckhaus.",
        songSeed: { genre: 'sunny indie pop', mood: 'corner landmark' },
        visualNotes: 'Warm corner outline, shop sign glow, simple landmark frame.',
      }),
      wistful: createA1P3VariantInput({
        targetText: "Is it near the quiet corner?",
        baseText: "Ist es in der Nähe der ruhigen Ecke?",
        meaning: "Eine vorsichtige Frage nach der Ecke als ruhigem Orientierungspunkt.",
        chunks: [
          chunk('is-it', 'Is it', 'ist es'),
          chunk('near-the-quiet-corner', 'near the quiet corner', 'in der Nähe der ruhigen Ecke'),
        ],
        targetChips: ['Is it', 'near the quiet', 'corner?'],
        distractors: ['quiet', 'station'],
        typeRecall: recall('Is it near the quiet ', 'corner', '?', ['corner', 'near the station', 'quiet', 'street']),
        sceneCaption: "Wistful fragt nach dem Café und bleibt bei einem ruhigen Merkpunkt.",
        trophyWord: trophy('quiet', 'ruhig', 'Quiet corner.', 'Quiet passt zu einer leisen Orientierung ohne Druck.'),
        mediaCaption: "Weiche Straßenecke, Café-Schild im Fenster, nächster Block sichtbar.",
        songSeed: { genre: 'soft indie folk', mood: 'quiet corner' },
        visualNotes: 'Soft cafe sign, muted corner edge, slow next-block marker.',
      }),
      sharp: createA1P3VariantInput({
        targetText: "We meet at the corner.",
        baseText: "Wir treffen uns bitte an der Ecke.",
        meaning: "Eine klare Ortsangabe für einen Treffpunkt.",
        chunks: [
          chunk('we-meet', 'We meet', 'wir treffen uns'),
          chunk('at-the-corner', 'at the corner', 'an der Ecke'),
        ],
        targetChips: ['We meet', 'at the corner.'],
        distractors: ['spot', 'later'],
        typeRecall: recall('We meet ', 'at the corner', '.', ['at the corner', 'at the station', 'corner', 'later']),
        sceneCaption: "Sharp setzt die Ecke als Treffpunkt und bleibt knapp.",
        trophyWord: trophy('spot', 'Treffpunkt', 'Spot set.', 'Spot benennt den Treffpunkt knapp, ohne Corner doppelt zu feiern.'),
        mediaCaption: "Markierte Ecke, Treffpunkt-Pin, keine weiteren Landmarken im Bild.",
        songSeed: { genre: 'minimal synth pulse', mood: 'corner meet' },
        visualNotes: 'Pin on corner, hard intersection lines, compact meeting cue.',
      }),
    },
  },
  {
    slug: 'by-foot-or-by-taxi',
    title: 'By foot or by taxi?',
    situation: {
      en: "You choose whether to walk or take a taxi.",
      de: "Du entscheidest, ob du zu Fuß gehst oder ein Taxi nimmst.",
    },
    pedagogicalGoal: "Ask about a simple transport choice with walking and taxi language.",
    variants: {
      bright: createA1P3VariantInput({
        targetText: "Should we walk there or take a taxi?",
        baseText: "Sollen wir bitte zu Fuß gehen oder ein Taxi nehmen?",
        meaning: "Eine warme Frage zwischen zwei einfachen Wegen.",
        chunks: [
          chunk('should-we-walk', 'Should we walk', 'sollen wir zu Fuß gehen'),
          chunk('there', 'there', 'dorthin'),
          chunk('or-take-a-taxi', 'or take a taxi', 'oder ein Taxi nehmen'),
        ],
        targetChips: ['Should we walk', 'there', 'or take a taxi?'],
        distractors: ['walkable', 'bus'],
        typeRecall: recall('Should we ', 'walk there', ' or take a taxi?', ['walk there', 'drive there', 'walkable', 'bus']),
        sceneCaption: "Bright macht die Wahl zwischen Laufen und Taxi leicht.",
        trophyWord: trophy('walkable', 'zu Fuß machbar', 'It is walkable.', 'Walkable ist praktisch, wenn Entfernung und Energie zusammenkommen.'),
        mediaCaption: "Stadtkarte, Fußweg und Taxispur nebeneinander, freundlicher Entscheidmoment.",
        songSeed: { genre: 'light acoustic pop', mood: 'walk or taxi' },
        visualNotes: 'Warm split route, walking icon, taxi line kept secondary.',
      }),
      wistful: createA1P3VariantInput({
        targetText: "Maybe we can walk, or take a taxi?",
        baseText: "Vielleicht können wir bitte zu Fuß gehen oder ein Taxi nehmen?",
        meaning: "Eine sanfte Wahl, wenn beide Wege möglich sind.",
        chunks: [
          chunk('maybe-we-can-walk', 'Maybe we can walk', 'vielleicht können wir zu Fuß gehen'),
          chunk('or-take-a-taxi', 'or take a taxi', 'oder ein Taxi nehmen'),
        ],
        targetChips: ['Maybe we can walk,', 'or take a taxi?'],
        distractors: ['gentle', 'bus'],
        typeRecall: recall('Maybe ', 'we can walk', ', or take a taxi?', ['we can walk', 'we can drive', 'gentle', 'bus']),
        sceneCaption: "Wistful lässt die Wahl offen, ohne unsicher zu werden.",
        trophyWord: trophy('gentle', 'sanft', 'A gentle walk-or-taxi pick.', 'Gentle passt zur vorsichtigen Transportentscheidung.'),
        mediaCaption: "Ruhiger Straßenrand, Taxi in der Ferne, Gehweg bleibt offen.",
        songSeed: { genre: 'soft indie folk', mood: 'gentle choice' },
        visualNotes: 'Soft split path, quiet taxi light, low-pressure choice marker.',
      }),
      sharp: createA1P3VariantInput({
        targetText: "Walk or taxi?",
        baseText: "Zu Fuß oder Taxi, bitte?",
        meaning: "Eine sehr knappe Wahl zwischen zwei Optionen.",
        chunks: [
          chunk('walk', 'Walk', 'zu Fuß'),
          chunk('or-taxi', 'or taxi', 'oder Taxi'),
        ],
        targetChips: ['Walk', 'or taxi?'],
        distractors: ['taxi', 'bus'],
        typeRecall: recall('', 'Walk or taxi', '?', ['Walk or taxi', 'Bus or train', 'taxi', 'bus']),
        sceneCaption: "Sharp reduziert die Entscheidung auf zwei klare Optionen.",
        trophyWord: trophy('cab', 'Taxi', 'A cab, please.', 'Cab ist Sharps direkter Alltagsanker für ein Taxi.'),
        mediaCaption: "Zwei harte Symbole: Fußweg links, Taxi rechts, Entscheidung in der Mitte.",
        songSeed: { genre: 'minimal synth pulse', mood: 'transport choice' },
        visualNotes: 'Binary transport toggle, high-contrast icons, no decorative copy.',
      }),
    },
  },
  {
    slug: 'i-missed-my-stop',
    title: 'I missed my stop',
    situation: {
      en: "You realize you passed your stop and need help recovering.",
      de: "Du merkst, dass du deine Haltestelle verpasst hast, und brauchst Hilfe.",
    },
    pedagogicalGoal: "Say you missed your stop and ask what to do next.",
    variants: {
      bright: createA1P3VariantInput({
        targetText: "Sorry, I missed my stop. Could you help me?",
        baseText: "Entschuldigung, ich habe meine Haltestelle verpasst. Könnten Sie mir bitte helfen?",
        meaning: "Eine freundliche Reparatur, wenn du zu weit gefahren bist.",
        chunks: [
          chunk('sorry', 'Sorry', 'Entschuldigung'),
          chunk('i-missed-my-stop', 'I missed my stop', 'ich habe meine Haltestelle verpasst'),
          chunk('could-you-help-me', 'Could you help me', 'könnten Sie mir helfen'),
        ],
        targetChips: ['Sorry,', 'I missed my stop.', 'Could you help me?'],
        distractors: ['helped', 'ticket'],
        typeRecall: recall('Sorry, I ', 'missed my stop', '. Could you help me?', ['missed my stop', 'found my stop', 'helped', 'ticket']),
        sceneCaption: "Bright macht aus dem Fehler sofort eine Bitte um Hilfe.",
        trophyWord: trophy('helped', 'geholfen', 'You helped me.', 'Helped schließt die kleine Verkehrspanne warm ab.'),
        mediaCaption: "Bus fährt weiter, Haltestelle im Rückfenster, freundliche Nachfrage im Gang.",
        songSeed: { genre: 'sunny indie pop', mood: 'help after mistake' },
        visualNotes: 'Warm recovery line, past-stop marker, helpful next-step glow.',
      }),
      wistful: createA1P3VariantInput({
        targetText: "Sorry, I think I missed my stop.",
        baseText: "Entschuldigung, ich glaube, ich habe meine Haltestelle verpasst.",
        meaning: "Eine vorsichtige, ehrliche Meldung, wenn du unsicher bist.",
        chunks: [
          chunk('sorry', 'Sorry', 'Entschuldigung'),
          chunk('i-think', 'I think', 'ich glaube'),
          chunk('i-missed-my-stop', 'I missed my stop', 'ich habe meine Haltestelle verpasst'),
        ],
        targetChips: ['Sorry,', 'I think', 'I missed my stop.'],
        distractors: ['lost', 'next'],
        typeRecall: recall('Sorry, I think I ', 'missed my stop', '.', ['missed my stop', 'missed the bus', 'lost', 'next']),
        sceneCaption: "Wistful benennt den Fehler leise, ohne in Panik zu geraten.",
        trophyWord: trophy('lost', 'verloren', 'I am lost.', 'Lost ist A1-nützlich, solange es schlicht und nicht dramatisch bleibt.'),
        mediaCaption: "Leiser Businnenraum, vertraute Haltestelle schon hinter dem Fenster.",
        songSeed: { genre: 'soft indie folk', mood: 'soft recovery' },
        visualNotes: 'Muted rear-window stop sign, small uncertainty pulse, calm recovery cue.',
      }),
      sharp: createA1P3VariantInput({
        targetText: "I missed my stop. What's next?",
        baseText: "Ich habe meine Haltestelle verpasst. Was jetzt bitte?",
        meaning: "Eine direkte Fehleransage mit sofortiger nächster Frage.",
        chunks: [
          chunk('i-missed-my-stop', 'I missed my stop', 'ich habe meine Haltestelle verpasst'),
          chunk('whats-next', "What's next", 'was kommt als Nächstes'),
        ],
        targetChips: ['I missed my stop.', "What's next?"],
        distractors: ['missed', 'later'],
        typeRecall: recall('I ', 'missed my stop', ". What's next?", ['missed my stop', 'missed the train', 'missed', 'later']),
        sceneCaption: "Sharp benennt das Problem und fragt nach dem nächsten Schritt.",
        trophyWord: trophy('missed', 'verpasst', 'Missed stop.', 'Missed ist genau das Fehlerwort für diesen Verkehrsmoment.'),
        mediaCaption: "Klare Haltestellenliste, Ziel schon übersprungen, Blick zur nächsten Ausstiegstür.",
        songSeed: { genre: 'minimal synth pulse', mood: 'missed stop recovery' },
        visualNotes: 'Hard skipped-stop marker, next-action arrow, clipped recovery panel.',
      }),
    },
  },
]

const a1Practical3Lessons: GuidedLessonDefinition[] = a1Practical3Inputs.map((lessonInput, index) => {
  const lessonNumber = index + 1
  const id = `english-a1-practical-3-${String(lessonNumber).padStart(3, '0')}-${lessonInput.slug}`
  const nextInput = a1Practical3Inputs[index + 1]

  return {
    id,
    pathId: GUIDED_TODAY_PATH_THREE_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_THREE_METADATA.title,
    level: GUIDED_TODAY_PATH_THREE_METADATA.level,
    lessonNumber,
    baseLanguage: GUIDED_TODAY_PATH_THREE_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_THREE_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_THREE_METADATA,
    lessonMetadata: {
      id,
      sequence: lessonNumber,
      title: lessonInput.title,
    },
    title: lessonInput.title,
    situation: lessonInput.situation,
    pedagogicalGoal: lessonInput.pedagogicalGoal,
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: nextInput?.title ?? 'Path complete',
      situation: nextInput?.situation.de ?? 'Du hast A1 Practical 3 abgeschlossen.',
    },
    vibeVariants: {
      bright: createA1P2Variant(lessonInput.variants.bright),
      wistful: createA1P2Variant(lessonInput.variants.wistful),
      sharp: createA1P2Variant(lessonInput.variants.sharp),
    },
  }
})

type A1P4LessonInput = A1P2LessonInput

const a1Practical4Inputs: A1P4LessonInput[] = [
  {
    slug: 'a-table-please',
    title: 'A table, please',
    situation: {
      en: 'You enter a cafe or restaurant and ask for a table.',
      de: 'Du betrittst ein Café oder Restaurant und fragst nach einem Tisch.',
    },
    pedagogicalGoal: 'Ask politely for a table, often with party size.',
    variants: {
      bright: createA1P4VariantInput({
        targetText: 'Could we have a table for two, please?',
        baseText: 'Könnten wir bitte einen Tisch für zwei Personen haben?',
        meaning: 'Eine warme Bitte beim Ankommen, mit der Personenzahl gleich dabei.',
        chunks: [
          chunk('could-we-have', 'Could we have', 'könnten wir haben'),
          chunk('a-table-for-two', 'a table for two', 'einen Tisch für zwei Personen'),
          chunk('please', 'please', 'bitte'),
        ],
        extraLessonItems: [
          chunk('by-the-window', 'by the window', 'am Fenster'),
          chunk('follow-me', 'follow me', 'folgen Sie mir bitte'),
        ],
        targetChips: ['Could we have', 'a table for two,', 'please?'],
        distractors: ['welcome', 'menu'],
        typeRecall: recall('Could we have ', 'a table for two', ', please?', ['a table for two', 'by the window', 'two people', 'the menu']),
        sceneCaption: 'Bright kommt am Café-Eingang an und fragt offen nach einem Tisch für zwei.',
        trophyWord: trophy('welcome', 'willkommen', 'Welcome in.', 'Welcome passt zum warmen ersten Moment an der Tür.'),
        mediaCaption: 'Café-Eingang mit Gastgeberin, zwei Menüs in der Hand und ein freier Tisch im Blick.',
        songSeed: { genre: 'light acoustic pop', mood: 'warm arrival' },
        visualNotes: 'Warm entrance light, host gesture, table-for-two highlight.',
      }),
      wistful: createA1P4VariantInput({
        targetText: 'Just a table for two, if you have one?',
        baseText: 'Einfach einen Tisch für zwei, falls einer frei ist?',
        meaning: 'Eine vorsichtige Tischfrage, klein gehalten und trotzdem klar.',
        chunks: [
          chunk('just-a-table', 'Just a table', 'einfach einen Tisch'),
          chunk('for-two', 'for two', 'für zwei'),
          chunk('if-you-have-one', 'if you have one', 'falls einer frei ist'),
        ],
        extraLessonItems: [
          chunk('near-the-door', 'near the door', 'in der Nähe der Tür'),
          chunk('thank-you', 'thank you', 'danke'),
        ],
        targetChips: ['Just a table', 'for two,', 'if you have one?'],
        distractors: ['quietly', 'menu'],
        typeRecall: recall('Just a ', 'table for two', ', if you have one?', ['table for two', 'near the door', 'thank you', 'menu']),
        sceneCaption: 'Wistful bleibt an der Tür stehen und fragt leise nach einem freien Tisch.',
        trophyWord: trophy('quietly', 'leise', 'Quietly, please.', 'Quietly hält die Bitte vorsichtig, ohne traurig zu wirken.'),
        mediaCaption: 'Ruhiger Restauranteingang, Hand an der Jacke, Gastgeber mit Menüs vor einem kleinen Tisch.',
        songSeed: { genre: 'soft indie folk', mood: 'quiet arrival' },
        visualNotes: 'Muted entry light, small pause, soft table marker.',
      }),
      sharp: createA1P4VariantInput({
        targetText: 'Table for two, please.',
        baseText: 'Einen Tisch für zwei, bitte.',
        meaning: 'Eine knappe, höfliche Ansage mit der wichtigsten Information zuerst.',
        chunks: [
          chunk('table', 'Table', 'Tisch'),
          chunk('for-two', 'for two', 'für zwei'),
          chunk('please', 'please', 'bitte'),
        ],
        extraLessonItems: [
          chunk('window', 'window', 'Fenster'),
          chunk('free', 'free', 'frei'),
        ],
        targetChips: ['Table', 'for two,', 'please.'],
        distractors: ['clear', 'menu'],
        typeRecall: recall('', 'Table for two', ', please.', ['Table for two', 'by the window', 'free table', 'menu']),
        sceneCaption: 'Sharp nennt am Eingang sofort Tisch und Personenzahl.',
        trophyWord: trophy('table', 'Tisch', 'Table for two.', 'Table macht die Bitte am Restaurant-Eingang sofort konkret.'),
        mediaCaption: 'Klare Eingangslinie, Gastgeber mit Menüs, Blick direkt zum freien Zweiertisch.',
        songSeed: { genre: 'minimal synth pulse', mood: 'clean arrival' },
        visualNotes: 'High-contrast doorway, two-seat icon, clipped host cue.',
      }),
    },
  },
  {
    slug: 'the-menu',
    title: 'The menu',
    situation: {
      en: 'You ask for the menu or ask what is available today.',
      de: 'Du bittest um die Speisekarte oder fragst, was es heute gibt.',
    },
    pedagogicalGoal: 'Ask for or about the menu in a cafe or small restaurant.',
    variants: {
      bright: createA1P4VariantInput({
        targetText: 'Could I see the menu, please?',
        baseText: 'Könnte ich bitte die Speisekarte sehen?',
        meaning: 'Eine freundliche Bitte, die Auswahl zuerst in Ruhe zu sehen.',
        chunks: [
          chunk('could-i-see', 'Could I see', 'könnte ich sehen'),
          chunk('the-menu', 'the menu', 'die Speisekarte'),
          chunk('please', 'please', 'bitte'),
        ],
        extraLessonItems: [
          chunk('specials', 'specials', 'Tagesgerichte'),
          chunk('dessert', 'dessert', 'Nachtisch'),
        ],
        targetChips: ['Could I see', 'the menu,', 'please?'],
        distractors: ['choice', 'bill'],
        typeRecall: recall('Could I see ', 'the menu', ', please?', ['the menu', 'today\'s specials', 'dessert', 'bill']),
        sceneCaption: 'Bright nimmt die Speisekarte freundlich an und schaut auf die Tagesgerichte.',
        trophyWord: trophy('choice', 'Auswahl', 'Good choice.', 'Choice passt zum Moment, in dem die Karte Möglichkeiten öffnet.'),
        mediaCaption: 'Server reicht eine Speisekarte über den Tisch, Tagesgerichte stehen auf einer kleinen Tafel.',
        songSeed: { genre: 'light acoustic pop', mood: 'curious menu' },
        visualNotes: 'Open menu spread, warm specials marker, simple choice cue.',
      }),
      wistful: createA1P4VariantInput({
        targetText: 'May I look at the menu for a moment?',
        baseText: 'Darf ich kurz in die Speisekarte schauen?',
        meaning: 'Eine sanfte Bitte um einen kleinen Moment zum Lesen.',
        chunks: [
          chunk('may-i-look', 'May I look', 'darf ich schauen'),
          chunk('at-the-menu', 'at the menu', 'in die Speisekarte'),
          chunk('for-a-moment', 'for a moment', 'kurz'),
        ],
        extraLessonItems: [
          chunk('drinks', 'drinks', 'Getränke'),
          chunk('food', 'food', 'Essen'),
        ],
        targetChips: ['May I look', 'at the menu', 'for a moment?'],
        distractors: ['wondering', 'bill'],
        typeRecall: recall('May I look at ', 'the menu', ' for a moment?', ['the menu', 'drinks', 'for a moment', 'bill']),
        sceneCaption: 'Wistful hält die Speisekarte einen Moment und entscheidet ohne Eile.',
        trophyWord: trophy('wondering', 'überlegend', 'Just wondering.', 'Wondering gibt dem Lesen eine vorsichtige, suchende Stimme.'),
        mediaCaption: 'Weiches Licht auf der Speisekarte, Getränkeseite offen, Finger wartet am Rand.',
        songSeed: { genre: 'soft indie folk', mood: 'slow menu look' },
        visualNotes: 'Muted menu page, soft pause, wondering highlight.',
      }),
      sharp: createA1P4VariantInput({
        targetText: 'The menu, please.',
        baseText: 'Die Speisekarte, bitte.',
        meaning: 'Eine direkte, höfliche Bitte ohne Umweg.',
        chunks: [
          chunk('the-menu', 'The menu', 'die Speisekarte'),
          chunk('please', 'please', 'bitte'),
        ],
        extraLessonItems: [
          chunk('today-specials', "today's specials", 'heutige Tagesgerichte'),
          chunk('drinks', 'drinks', 'Getränke'),
          chunk('food', 'food', 'Essen'),
        ],
        targetChips: ['The menu,', 'please.'],
        distractors: ['quick', 'bill'],
        typeRecall: recall('', 'The menu', ', please.', ['The menu', "today's specials", 'drinks', 'bill']),
        sceneCaption: 'Sharp holt die Speisekarte und scannt sofort die Auswahl.',
        trophyWord: trophy('menu', 'Speisekarte', 'The menu, please.', 'Menu ist Sharps direkter Restaurant-Anker.'),
        mediaCaption: 'Speisekarte in der Hand, klare Tageskarte daneben, Blick direkt auf die Bestellseite.',
        songSeed: { genre: 'minimal synth pulse', mood: 'menu scan' },
        visualNotes: 'Crisp menu crop, fast scan line, no decorative pause.',
      }),
    },
  },
  {
    slug: 'id-like-tea',
    title: "I'd like tea",
    situation: {
      en: 'You order tea or another simple drink.',
      de: 'Du bestellst einen Tee oder ein einfaches Getränk.',
    },
    pedagogicalGoal: 'Order a simple drink with an optional preparation detail.',
    variants: {
      bright: createA1P4VariantInput({
        targetText: "I'd love a tea with lemon, please.",
        baseText: 'Ich hätte gern einen Tee mit Zitrone, bitte.',
        meaning: 'Eine warme Bestellung für Tee mit einer einfachen Ergänzung.',
        chunks: [
          chunk('id-love', "I'd love", 'ich hätte gern'),
          chunk('a-tea', 'a tea', 'einen Tee'),
          chunk('with-lemon', 'with lemon', 'mit Zitrone'),
        ],
        extraLessonItems: [
          chunk('hot', 'hot', 'heiß'),
          chunk('thank-you', 'thank you', 'danke'),
        ],
        targetChips: ["I'd love", 'a tea', 'with lemon,', 'please.'],
        distractors: ['cozy', 'sugar'],
        typeRecall: recall("I'd love ", 'a tea with lemon', ', please.', ['a tea with lemon', 'with milk', 'hot tea', 'sugar']),
        sceneCaption: 'Bright bestellt am Tresen einen heißen Tee mit Zitrone.',
        trophyWord: trophy('cozy', 'gemütlich', 'Cozy tea, thanks.', 'Cozy trägt die warme Tee-Stimmung, bleibt aber alltagstauglich.'),
        mediaCaption: 'Tresen mit heißen Getränken, Teekanne sichtbar, Zitronenscheibe neben der Tasse.',
        songSeed: { genre: 'light acoustic pop', mood: 'warm tea order' },
        visualNotes: 'Steam cue, lemon accent, friendly cup highlight.',
      }),
      wistful: createA1P4VariantInput({
        targetText: "Maybe a tea with milk, if that's okay?",
        baseText: 'Vielleicht einen Tee mit Milch, wenn das in Ordnung ist?',
        meaning: 'Eine weiche Bestellung, die Raum für eine Antwort lässt.',
        chunks: [
          chunk('maybe-a-tea', 'Maybe a tea', 'vielleicht einen Tee'),
          chunk('with-milk', 'with milk', 'mit Milch'),
          chunk('if-thats-okay', "if that's okay", 'wenn das in Ordnung ist'),
        ],
        extraLessonItems: [
          chunk('soft', 'soft', 'sanft'),
          chunk('hot', 'hot', 'heiß'),
        ],
        targetChips: ['Maybe a tea', 'with milk,', "if that's okay?"],
        distractors: ['soothing', 'lemon'],
        typeRecall: recall('Maybe ', 'a tea with milk', ", if that's okay?", ['a tea with milk', 'with lemon', 'hot tea', 'sugar']),
        sceneCaption: 'Wistful bestellt Tee mit Milch und macht die Bitte klein.',
        trophyWord: trophy('soothing', 'beruhigend', 'Soothing tea.', 'Soothing passt zu Wistfuls ruhigem Getränkemoment.'),
        mediaCaption: 'Leiser Tresen, Milchkännchen neben der Tasse, Dampf steigt langsam auf.',
        songSeed: { genre: 'soft indie folk', mood: 'soft tea order' },
        visualNotes: 'Blue-gray steam, small milk pour, soft okay cue.',
      }),
      sharp: createA1P4VariantInput({
        targetText: 'Black tea, please.',
        baseText: 'Schwarzen Tee, bitte.',
        meaning: 'Eine kurze Bestellung mit klarer Tee-Art.',
        chunks: [
          chunk('black-tea', 'Black tea', 'schwarzen Tee'),
          chunk('please', 'please', 'bitte'),
        ],
        extraLessonItems: [
          chunk('hot', 'hot', 'heiß'),
          chunk('with-milk', 'with milk', 'mit Milch'),
          chunk('with-lemon', 'with lemon', 'mit Zitrone'),
        ],
        targetChips: ['Black tea,', 'please.'],
        distractors: ['plain', 'coffee'],
        typeRecall: recall('', 'Black tea', ', please.', ['Black tea', 'with milk', 'with lemon', 'coffee']),
        sceneCaption: 'Sharp bestellt direkt schwarzen Tee und wartet auf die Tasse.',
        trophyWord: trophy('black', 'schwarz', 'Black tea.', 'Black ist die knappe Zubereitungsinfo für Tee.'),
        mediaCaption: 'Getränkemenü am Tresen, schwarzer Tee markiert, Tasse unter dem Ausguss.',
        songSeed: { genre: 'minimal synth pulse', mood: 'plain tea order' },
        visualNotes: 'Hard tea label, black cup line, compact counter frame.',
      }),
    },
  },
  {
    slug: 'no-sugar',
    title: 'No sugar',
    situation: {
      en: 'You say that you do not want sugar.',
      de: 'Du sagst, dass du keinen Zucker möchtest.',
    },
    pedagogicalGoal: 'State a simple preference about sugar.',
    variants: {
      bright: createA1P4VariantInput({
        targetText: 'No sugar for me, thank you.',
        baseText: 'Für mich keinen Zucker, danke.',
        meaning: 'Eine freundliche, klare Vorliebe ohne Zucker.',
        chunks: [
          chunk('no-sugar', 'No sugar', 'keinen Zucker'),
          chunk('for-me', 'for me', 'für mich'),
          chunk('thank-you', 'thank you', 'danke'),
        ],
        extraLessonItems: [
          chunk('without-sugar', 'without sugar', 'ohne Zucker'),
          chunk('milk', 'milk', 'Milch'),
        ],
        targetChips: ['No sugar', 'for me,', 'thank you.'],
        distractors: ['clean', 'lemon'],
        typeRecall: recall('', 'No sugar', ' for me, thank you.', ['No sugar', 'without sugar', 'with milk', 'lemon']),
        sceneCaption: 'Bright lehnt Zucker freundlich ab, während die Tasse vorbereitet wird.',
        trophyWord: trophy('clean', 'klar', 'Clean taste.', 'Clean passt zur einfachen Vorliebe ohne Zucker.'),
        mediaCaption: 'Tasse auf dem Tresen, Zuckerpäckchen daneben, freundliche Handbewegung zum Ablehnen.',
        songSeed: { genre: 'light acoustic pop', mood: 'clear preference' },
        visualNotes: 'Sugar packet aside, warm refusal gesture, clean cup focus.',
      }),
      wistful: createA1P4VariantInput({
        targetText: "No sugar, if that's alright?",
        baseText: 'Keinen Zucker, wenn das in Ordnung ist?',
        meaning: 'Eine sanfte Vorliebe, fast entschuldigend, aber verständlich.',
        chunks: [
          chunk('no-sugar', 'No sugar', 'keinen Zucker'),
          chunk('if-thats-alright', "if that's alright", 'wenn das in Ordnung ist'),
        ],
        extraLessonItems: [
          chunk('without', 'without', 'ohne'),
          chunk('milk', 'milk', 'Milch'),
          chunk('lemon', 'lemon', 'Zitrone'),
        ],
        targetChips: ['No sugar,', "if that's alright?"],
        distractors: ['plain', 'milk'],
        typeRecall: recall('', 'No sugar', ", if that's alright?", ['No sugar', 'without sugar', 'with milk', 'lemon']),
        sceneCaption: 'Wistful sagt die Vorliebe weich, bevor Zucker in die Tasse kommt.',
        trophyWord: trophy('plain', 'einfach', 'Plain is fine.', 'Plain hält die Vorliebe schlicht und ruhig.'),
        mediaCaption: 'Zuckerpäckchen bleibt liegen, Tasse im weichen Licht, kleine ablehnende Geste.',
        songSeed: { genre: 'soft indie folk', mood: 'plain preference' },
        visualNotes: 'Soft sugar packet shadow, small no cue, gentle cup line.',
      }),
      sharp: createA1P4VariantInput({
        targetText: 'No sugar.',
        baseText: 'Keinen Zucker.',
        meaning: 'Eine direkte Vorliebe ohne Zusatz.',
        chunks: [
          chunk('no-sugar', 'No sugar', 'keinen Zucker'),
        ],
        extraLessonItems: [
          chunk('without-sugar', 'without sugar', 'ohne Zucker'),
          chunk('milk', 'milk', 'Milch'),
          chunk('lemon', 'lemon', 'Zitrone'),
          chunk('thanks', 'thanks', 'danke'),
        ],
        targetChips: ['No', 'sugar.'],
        distractors: ['none', 'milk'],
        typeRecall: recall('', 'No sugar', '.', ['No sugar', 'without sugar', 'with milk', 'lemon']),
        sceneCaption: 'Sharp setzt die Grenze kurz: kein Zucker.',
        trophyWord: trophy('none', 'keiner', 'None for me.', 'None ist Sharps knappes Wort für nichts hinzufügen.'),
        mediaCaption: 'Klare Tasse, Zuckerpäckchen bleibt geschlossen, kurze Geste neben dem Löffel.',
        songSeed: { genre: 'minimal synth pulse', mood: 'no sugar' },
        visualNotes: 'Sugar packet crossed by hard line, compact preference state.',
      }),
    },
  },
  {
    slug: 'is-it-fresh',
    title: 'Is it fresh?',
    situation: {
      en: 'You ask whether a food item is fresh.',
      de: 'Du fragst, ob ein Lebensmittel frisch ist.',
    },
    pedagogicalGoal: 'Ask a simple freshness question about food.',
    variants: {
      bright: createA1P4VariantInput({
        targetText: 'Is it fresh today, please?',
        baseText: 'Ist das heute frisch?',
        meaning: 'Eine freundliche Frage nach Frische am selben Tag.',
        chunks: [
          chunk('is-it', 'Is it', 'ist es'),
          chunk('fresh-today', 'fresh today', 'heute frisch'),
          chunk('please', 'please', 'bitte'),
        ],
        extraLessonItems: [
          chunk('bread', 'bread', 'Brot'),
          chunk('pastry', 'pastry', 'Gebäck'),
        ],
        targetChips: ['Is it', 'fresh today,', 'please?'],
        distractors: ['crisp', 'old'],
        typeRecall: recall('Is it ', 'fresh today', ', please?', ['fresh today', "today's bread", 'pastry', 'old']),
        sceneCaption: 'Bright fragt an der Auslage freundlich, ob das Gebäck heute frisch ist.',
        trophyWord: trophy('crisp', 'knusprig', 'Crisp today.', 'Crisp gibt frischem Gebäck eine klare, appetitliche Note.'),
        mediaCaption: 'Bäckerei-Auslage mit Brot und Gebäck, kleines Heute-Schild direkt daneben.',
        songSeed: { genre: 'light acoustic pop', mood: 'fresh counter' },
        visualNotes: 'Warm bakery case, crisp bread edge, today label.',
      }),
      wistful: createA1P4VariantInput({
        targetText: 'Just checking, is the bread fresh?',
        baseText: 'Ich frage nur kurz: Ist das Brot frisch?',
        meaning: 'Eine vorsichtige Nachfrage, bevor du etwas auswählst.',
        chunks: [
          chunk('just-checking', 'Just checking', 'ich frage nur kurz'),
          chunk('is-the-bread', 'is the bread', 'ist das Brot'),
          chunk('fresh', 'fresh', 'frisch'),
        ],
        extraLessonItems: [
          chunk('today', 'today', 'heute'),
          chunk('fruit', 'fruit', 'Obst'),
        ],
        targetChips: ['Just checking,', 'is the bread', 'fresh?'],
        distractors: ['careful', 'old'],
        typeRecall: recall('Just checking, ', 'is the bread fresh', '?', ['is the bread fresh', 'fresh today', 'fruit', 'old']),
        sceneCaption: 'Wistful prüft das Brot vorsichtig, ohne die Person hinter der Theke zu drängen.',
        trophyWord: trophy('fresh', 'frisch', 'Is it fresh?', 'Fresh ist das genaue A1-Wort für die Nachfrage am Tresen.'),
        mediaCaption: 'Ruhige Brotauslage, Hand knapp vor der Scheibe, Blick auf das frische Brot.',
        songSeed: { genre: 'soft indie folk', mood: 'careful freshness check' },
        visualNotes: 'Soft bakery glass, careful hand pause, bread focus.',
      }),
      sharp: createA1P4VariantInput({
        targetText: 'Fresh today?',
        baseText: 'Heute frisch?',
        meaning: 'Eine sehr kurze Frage nach der heutigen Frische.',
        chunks: [
          chunk('fresh', 'Fresh', 'frisch'),
          chunk('today', 'today', 'heute'),
        ],
        extraLessonItems: [
          chunk('bread', 'bread', 'Brot'),
          chunk('pastry', 'pastry', 'Gebäck'),
          chunk('fruit', 'fruit', 'Obst'),
        ],
        targetChips: ['Fresh', 'today?'],
        distractors: ['now', 'old'],
        typeRecall: recall('', 'Fresh today', '?', ['Fresh today', "today's bread", 'fruit', 'old']),
        sceneCaption: 'Sharp zeigt auf die Auslage und klärt die Frische in zwei Worten.',
        trophyWord: trophy('baked', 'gebacken', 'Baked today?', 'Baked macht die Frische-Frage konkret und bäcker-spezifisch.'),
        mediaCaption: 'Klare Frischetheke, Brot vorne, heutiges Datum auf einem kleinen Schild.',
        songSeed: { genre: 'minimal synth pulse', mood: 'fresh now' },
        visualNotes: 'Hard today marker, bakery item crop, direct question state.',
      }),
    },
  },
  {
    slug: 'anything-else',
    title: 'Anything else?',
    situation: {
      en: "You answer 'Anything else?' with yes, no, or one extra item.",
      de: "Du antwortest auf die Frage 'Sonst noch etwas?' und sagst entweder ja oder nein.",
    },
    pedagogicalGoal: "Respond to a common service follow-up with a short add-on or close.",
    variants: {
      bright: createA1P4VariantInput({
        targetText: 'Yes, a croissant too, please.',
        baseText: 'Ja, ein Croissant auch, bitte.',
        meaning: 'Eine warme Ergänzung, wenn noch ein kleines Teil dazukommt.',
        chunks: [
          chunk('yes', 'Yes', 'ja'),
          chunk('a-croissant-too', 'a croissant too', 'ein Croissant auch'),
          chunk('please', 'please', 'bitte'),
        ],
        extraLessonItems: [
          chunk('water', 'water', 'Wasser'),
          chunk('thats-all', "that's all", 'das ist alles'),
        ],
        targetChips: ['Yes,', 'a croissant too,', 'please.'],
        distractors: ['plenty', 'bag'],
        typeRecall: recall('Yes, ', 'a croissant too', ', please.', ['a croissant too', "that's all", 'water', 'bag']),
        sceneCaption: 'Bright ergänzt am Tresen noch ein Croissant und schließt freundlich ab.',
        trophyWord: trophy('plenty', 'reichlich', 'Plenty, thank you.', 'Plenty passt zum warmen Gefühl, genug ausgewählt zu haben.'),
        mediaCaption: 'Tresen mit Kaffee, Croissantzange in der Hand, die Bedienung wartet auf die Antwort.',
        songSeed: { genre: 'light acoustic pop', mood: 'small add-on' },
        visualNotes: 'Warm pastry cue, yes marker, friendly add-on beat.',
      }),
      wistful: createA1P4VariantInput({
        targetText: "No, that's all, thank you.",
        baseText: 'Nein, das ist alles, danke.',
        meaning: 'Eine ruhige Absage, wenn die Bestellung vollständig ist.',
        chunks: [
          chunk('no', 'No', 'nein'),
          chunk('thats-all', "that's all", 'das ist alles'),
          chunk('thank-you', 'thank you', 'danke'),
        ],
        extraLessonItems: [
          chunk('just', 'just', 'nur'),
          chunk('water', 'water', 'Wasser'),
        ],
        targetChips: ['No,', "that's all,", 'thank you.'],
        distractors: ['enough', 'more'],
        typeRecall: recall('No, ', "that's all", ', thank you.', ["that's all", 'just water', 'more', 'croissant']),
        sceneCaption: 'Wistful entscheidet, dass es reicht, und bedankt sich leise.',
        trophyWord: trophy('enough', 'genug', 'Enough, thank you.', 'Enough gibt der ruhigen Absage einen nützlichen Abschluss.'),
        mediaCaption: 'Kleine Bestellung auf dem Tresen, Bedienung wartet, Wistful schließt mit einem Dank.',
        songSeed: { genre: 'soft indie folk', mood: 'quiet enough' },
        visualNotes: 'Small order grouping, soft no cue, enough line.',
      }),
      sharp: createA1P4VariantInput({
        targetText: "That's all, thanks.",
        baseText: 'Das ist alles, danke.',
        meaning: 'Eine knappe Antwort, die die Bestellung beendet.',
        chunks: [
          chunk('thats-all', "That's all", 'das ist alles'),
          chunk('thanks', 'thanks', 'danke'),
        ],
        extraLessonItems: [
          chunk('no', 'no', 'nein'),
          chunk('yes', 'yes', 'ja'),
          chunk('next', 'next', 'nächste'),
        ],
        targetChips: ["That's all,", 'thanks.'],
        distractors: ['done', 'more'],
        typeRecall: recall('', "That's all", ', thanks.', ["That's all", 'one more', 'next', 'water']),
        sceneCaption: 'Sharp beendet die Bestellung kurz und gibt den Tresen frei.',
        trophyWord: trophy('all', 'alles', "That's all.", 'All schließt die Bestellung knapp ab.'),
        mediaCaption: 'Artikel stehen fertig am Tresen, kurzer Dank, Bedienung greift zur Kasse.',
        songSeed: { genre: 'minimal synth pulse', mood: 'order complete' },
        visualNotes: 'Compact order line, done state, hard counter edge.',
      }),
    },
  },
  {
    slug: 'to-go-please',
    title: 'To go, please',
    situation: {
      en: 'You say that you want the food or drink to take away.',
      de: 'Du sagst, dass du das Essen oder Getränk zum Mitnehmen möchtest.',
    },
    pedagogicalGoal: 'Ask for an order to take away.',
    variants: {
      bright: createA1P4VariantInput({
        targetText: 'Could I get that to go, please?',
        baseText: 'Könnte ich das bitte zum Mitnehmen bekommen?',
        meaning: 'Eine freundliche Bitte, die Bestellung mitzunehmen.',
        chunks: [
          chunk('could-i-get-that', 'Could I get that', 'könnte ich das bekommen'),
          chunk('to-go', 'to go', 'zum Mitnehmen'),
          chunk('please', 'please', 'bitte'),
        ],
        extraLessonItems: [
          chunk('bag', 'bag', 'Tüte'),
          chunk('cup', 'cup', 'Becher'),
        ],
        targetChips: ['Could I get that', 'to go,', 'please?'],
        distractors: ['ready', 'here'],
        typeRecall: recall('Could I get that ', 'to go', ', please?', ['to go', 'to take away', 'for here', 'bag']),
        sceneCaption: 'Bright bittet am Tresen freundlich darum, die Bestellung mitzunehmen.',
        trophyWord: trophy('bag', 'Tüte', 'In a bag, please.', 'Bag macht das Mitnehmen sofort konkret.'),
        mediaCaption: 'Pappbecher und Tüte auf dem Tresen, Hand faltet die Verpackung zu.',
        songSeed: { genre: 'light acoustic pop', mood: 'packed and ready' },
        visualNotes: 'Warm takeaway bag, cup lid cue, ready label.',
      }),
      wistful: createA1P4VariantInput({
        targetText: 'To go, if possible?',
        baseText: 'Zum Mitnehmen, wenn das möglich ist?',
        meaning: 'Eine rücksichtsvolle Bitte, falls Mitnehmen möglich ist.',
        chunks: [
          chunk('to-go', 'To go', 'zum Mitnehmen'),
          chunk('if-possible', 'if possible', 'wenn das möglich ist'),
        ],
        extraLessonItems: [
          chunk('takeaway', 'takeaway', 'zum Mitnehmen'),
          chunk('bag', 'bag', 'Tüte'),
          chunk('eat-in', 'eat in', 'hier essen'),
        ],
        targetChips: ['To go,', 'if possible?'],
        distractors: ['lightly', 'here'],
        typeRecall: recall('', 'To go', ', if possible?', ['To go', 'to take away', 'eat in', 'bag']),
        sceneCaption: 'Wistful fragt leise nach Mitnehmen, während die Tüte bereitliegt.',
        trophyWord: trophy('lightly', 'leicht', 'Lightly packed.', 'Lightly passt zu einer kleinen, rücksichtsvollen Bitte.'),
        mediaCaption: 'Ruhige Packbewegung, Tüte halb offen, Becher wartet neben der Kasse.',
        songSeed: { genre: 'soft indie folk', mood: 'soft takeaway' },
        visualNotes: 'Soft bag fold, gentle movement, low-pressure possible cue.',
      }),
      sharp: createA1P4VariantInput({
        targetText: 'To go, please.',
        baseText: 'Zum Mitnehmen, bitte.',
        meaning: 'Eine kurze Mitnahmebitte mit klarer Richtung.',
        chunks: [
          chunk('to-go', 'To go', 'zum Mitnehmen'),
          chunk('please', 'please', 'bitte'),
        ],
        extraLessonItems: [
          chunk('takeaway', 'takeaway', 'zum Mitnehmen'),
          chunk('here', 'here', 'hier'),
          chunk('packed', 'packed', 'eingepackt'),
        ],
        targetChips: ['To go,', 'please.'],
        distractors: ['packed', 'here'],
        typeRecall: recall('', 'To go', ', please.', ['To go', 'for here', 'packed', 'cup']),
        sceneCaption: 'Sharp entscheidet Mitnehmen und lässt die Bestellung einpacken.',
        trophyWord: trophy('packed', 'eingepackt', 'Packed to go.', 'Packed ist das direkte Ergebnis der kurzen Mitnahmebitte.'),
        mediaCaption: 'Tüte auf dem Tresen, Becherdeckel sitzt, Packbewegung fast abgeschlossen.',
        songSeed: { genre: 'minimal synth pulse', mood: 'packed order' },
        visualNotes: 'Hard bag outline, packed label, compact counter crop.',
      }),
    },
  },
  {
    slug: 'it-was-good',
    title: 'It was good',
    situation: {
      en: 'After eating or drinking, you say that it was good.',
      de: 'Du sagst nach dem Essen oder Trinken, dass es gut war.',
    },
    pedagogicalGoal: 'Give a brief compliment after food or drink.',
    variants: {
      bright: createA1P4VariantInput({
        targetText: 'That was lovely, thank you.',
        baseText: 'Das war sehr schön, danke.',
        meaning: 'Ein kurzer, erwachsener Dank nach einem guten Essen.',
        chunks: [
          chunk('that-was', 'That was', 'das war'),
          chunk('lovely', 'lovely', 'sehr schön'),
          chunk('thank-you', 'thank you', 'danke'),
        ],
        extraLessonItems: [
          chunk('good', 'good', 'gut'),
          chunk('delicious', 'delicious', 'lecker'),
        ],
        targetChips: ['That was', 'lovely,', 'thank you.'],
        distractors: ['again', 'bad'],
        typeRecall: recall('', 'That was lovely', ', thank you.', ['That was lovely', 'it was good', 'delicious', 'again']),
        sceneCaption: 'Bright schaut auf den leeren Teller und bedankt sich für das gute Essen.',
        trophyWord: trophy('lovely', 'sehr schön', 'That was lovely.', 'Lovely gibt dem Lob Wärme, ohne übertrieben zu klingen.'),
        mediaCaption: 'Leerer Teller, Tasse daneben, freundliche Geste nach dem letzten Bissen.',
        songSeed: { genre: 'light acoustic pop', mood: 'warm praise' },
        visualNotes: 'Warm empty plate, subtle thank-you cue, lovely highlight.',
      }),
      wistful: createA1P4VariantInput({
        targetText: 'That was really nice.',
        baseText: 'Das war wirklich schön.',
        meaning: 'Ein leises, ehrliches Lob nach dem Trinken oder Essen.',
        chunks: [
          chunk('that-was', 'That was', 'das war'),
          chunk('really-nice', 'really nice', 'wirklich schön'),
        ],
        extraLessonItems: [
          chunk('good', 'good', 'gut'),
          chunk('thank-you', 'thank you', 'danke'),
          chunk('again', 'again', 'wieder'),
        ],
        targetChips: ['That was', 'really nice.'],
        distractors: ['kind', 'bad'],
        typeRecall: recall('That was ', 'really nice', '.', ['really nice', 'it was good', 'thank you', 'again']),
        sceneCaption: 'Wistful lässt ein ruhiges Lob stehen, ohne daraus eine große Szene zu machen.',
        trophyWord: trophy('tasty', 'lecker', 'It was tasty.', 'Tasty schließt das Restaurant warm und konkret ab.'),
        mediaCaption: 'Halbleere Tasse, ruhiger Blick zur Theke, kleines ehrliches Lächeln.',
        songSeed: { genre: 'soft indie folk', mood: 'quiet appreciation' },
        visualNotes: 'Soft cup shadow, small smile cue, restrained praise line.',
      }),
      sharp: createA1P4VariantInput({
        targetText: 'Very good, thanks.',
        baseText: 'Sehr gut, danke.',
        meaning: 'Ein kurzes, klares Lob am Ende.',
        chunks: [
          chunk('very-good', 'Very good', 'sehr gut'),
          chunk('thanks', 'thanks', 'danke'),
        ],
        extraLessonItems: [
          chunk('good', 'good', 'gut'),
          chunk('delicious', 'delicious', 'lecker'),
          chunk('again', 'again', 'wieder'),
        ],
        targetChips: ['Very good,', 'thanks.'],
        distractors: ['solid', 'bad'],
        typeRecall: recall('', 'Very good', ', thanks.', ['Very good', 'very tasty', 'again', 'bad']),
        sceneCaption: 'Sharp gibt ein kurzes Lob und beendet den Moment.',
        trophyWord: trophy('solid', 'solide', 'Solid meal.', 'Solid ist Sharps knappes, positives Urteil.'),
        mediaCaption: 'Leerer Teller, Serviette gefaltet, kurzer Daumen neben der Tasse.',
        songSeed: { genre: 'minimal synth pulse', mood: 'brief praise' },
        visualNotes: 'Hard plate crop, solid check cue, concise praise state.',
      }),
    },
  },
  {
    slug: 'small-talk-at-the-counter',
    title: 'Small talk at the counter',
    situation: {
      en: 'You exchange a few friendly words with the person behind the counter.',
      de: 'Du wechselst ein paar freundliche Worte mit der Person hinter dem Tresen.',
    },
    pedagogicalGoal: 'Say one short small-talk line about the day, weather, or counter mood.',
    variants: {
      bright: createA1P4VariantInput({
        targetText: "Beautiful day, isn't it?",
        baseText: 'Schöner Tag heute, oder?',
        meaning: 'Ein warmer Small-Talk-Start über den Tag.',
        chunks: [
          chunk('beautiful-day', 'Beautiful day', 'schöner Tag'),
          chunk('isnt-it', "isn't it", 'oder'),
        ],
        extraLessonItems: [
          chunk('weather', 'weather', 'Wetter'),
          chunk('today', 'today', 'heute'),
          chunk('nice', 'nice', 'nett'),
        ],
        targetChips: ['Beautiful day,', "isn't it?"],
        distractors: ['chatty', 'rain'],
        typeRecall: recall('', 'Beautiful day', ", isn't it?", ['Beautiful day', 'lovely day', 'busy today', 'rain']),
        sceneCaption: 'Bright nutzt den kurzen Blickkontakt am Tresen für eine freundliche Bemerkung.',
        trophyWord: trophy('chatty', 'gesprächig', 'A chatty day.', 'Chatty passt zur kleinen offenen Bemerkung am Tresen.'),
        mediaCaption: 'Tresen mit Tageslicht im Fenster, kurzer Blickkontakt, Kaffeemaschine im Hintergrund.',
        songSeed: { genre: 'light acoustic pop', mood: 'friendly counter chat' },
        visualNotes: 'Warm counter light, eye-contact cue, day label.',
      }),
      wistful: createA1P4VariantInput({
        targetText: "Quiet today, isn't it?",
        baseText: 'Heute ist es ruhig, oder?',
        meaning: 'Eine schüchterne Beobachtung, die trotzdem freundlich bleibt.',
        chunks: [
          chunk('quiet-today', 'Quiet today', 'heute ruhig'),
          chunk('isnt-it', "isn't it", 'oder'),
        ],
        extraLessonItems: [
          chunk('weather', 'weather', 'Wetter'),
          chunk('busy', 'busy', 'viel los'),
          chunk('nice', 'nice', 'nett'),
        ],
        targetChips: ['Quiet today,', "isn't it?"],
        distractors: ['shy', 'loud'],
        typeRecall: recall('', 'Quiet today', ", isn't it?", ['Quiet today', 'busy today', 'lovely day', 'loud']),
        sceneCaption: 'Wistful bemerkt die ruhige Theke und sagt nur einen kleinen Satz.',
        trophyWord: trophy('shy', 'schüchtern', 'A shy hello.', 'Shy beschreibt die leise Beobachtung ohne Traurigkeit.'),
        mediaCaption: 'Ruhiger Tresen, wenige Gäste, kurzer Blick zur Person hinter der Kasse.',
        songSeed: { genre: 'soft indie folk', mood: 'quiet counter note' },
        visualNotes: 'Muted counter space, small observation pulse, shy line.',
      }),
      sharp: createA1P4VariantInput({
        targetText: 'Busy day.',
        baseText: 'Viel los heute.',
        meaning: 'Eine sehr kurze Bemerkung, die den Moment anerkennt.',
        chunks: [
          chunk('busy-day', 'Busy day', 'viel los heute'),
        ],
        extraLessonItems: [
          chunk('today', 'today', 'heute'),
          chunk('weather', 'weather', 'Wetter'),
          chunk('quiet', 'quiet', 'ruhig'),
          chunk('nice', 'nice', 'nett'),
        ],
        targetChips: ['Busy', 'day.'],
        distractors: ['brief', 'quiet'],
        typeRecall: recall('', 'Busy day', '.', ['Busy day', 'busy today', 'quiet today', 'weather']),
        sceneCaption: 'Sharp erkennt den vollen Tresen kurz an und hält die Schlange nicht auf.',
        trophyWord: trophy('busy', 'beschäftigt', 'Busy day.', 'Busy ist Sharps knappe Small-Talk-Beobachtung.'),
        mediaCaption: 'Voller Tresen, Bestellungen laufen, ein kurzer Blick reicht für die Bemerkung.',
        songSeed: { genre: 'minimal synth pulse', mood: 'brief counter note' },
        visualNotes: 'Busy counter crop, short text beat, clean acknowledgement.',
      }),
    },
  },
  {
    slug: 'the-bill-please',
    title: 'The bill, please',
    situation: {
      en: 'At the end, you ask for the bill.',
      de: 'Du bittest am Ende um die Rechnung.',
    },
    pedagogicalGoal: 'Ask for the bill and optionally connect it to payment.',
    variants: {
      bright: createA1P4VariantInput({
        targetText: 'Could I have the bill, please?',
        baseText: 'Könnte ich bitte die Rechnung haben?',
        meaning: 'Ein freundlicher Abschluss, bevor du bezahlst.',
        chunks: [
          chunk('could-i-have', 'Could I have', 'könnte ich haben'),
          chunk('the-bill', 'the bill', 'die Rechnung'),
          chunk('please', 'please', 'bitte'),
        ],
        extraLessonItems: [
          chunk('card', 'card', 'Karte'),
          chunk('cash', 'cash', 'Bargeld'),
        ],
        targetChips: ['Could I have', 'the bill,', 'please?'],
        distractors: ['settled', 'menu'],
        typeRecall: recall('Could I have ', 'the bill', ', please?', ['the bill', 'altogether', 'by card', 'menu']),
        sceneCaption: 'Bright beendet den Besuch höflich und bittet um die Rechnung.',
        trophyWord: trophy('settled', 'bezahlt', 'All settled.', 'Settled passt zum ruhigen Abschluss nach dem Bezahlen.'),
        mediaCaption: 'Rechnungsmappe auf dem Tisch, Karte daneben, freundlicher Blick zur Bedienung.',
        songSeed: { genre: 'light acoustic pop', mood: 'settled close' },
        visualNotes: 'Warm bill folder, card cue, settled close state.',
      }),
      wistful: createA1P4VariantInput({
        targetText: "Just the bill, if that's alright?",
        baseText: 'Nur die Rechnung, wenn das in Ordnung ist?',
        meaning: 'Eine sanfte Bitte um den Abschluss der Szene.',
        chunks: [
          chunk('just-the-bill', 'Just the bill', 'nur die Rechnung'),
          chunk('if-thats-alright', "if that's alright", 'wenn das in Ordnung ist'),
        ],
        extraLessonItems: [
          chunk('card', 'card', 'Karte'),
          chunk('together', 'together', 'zusammen'),
          chunk('separately', 'separately', 'getrennt'),
        ],
        targetChips: ['Just the bill,', "if that's alright?"],
        distractors: ['softly', 'menu'],
        typeRecall: recall('Just ', 'the bill', ", if that's alright?", ['the bill', 'separately', 'together', 'menu']),
        sceneCaption: 'Wistful bittet leise um die Rechnung und bleibt beim Abschluss freundlich.',
        trophyWord: trophy('softly', 'sanft', 'Softly closed.', 'Softly passt zum vorsichtigen Ende der Begegnung.'),
        mediaCaption: 'Ruhiger Tisch, kleine Rechnungsmappe, Hand liegt neben der Bankkarte.',
        songSeed: { genre: 'soft indie folk', mood: 'gentle close' },
        visualNotes: 'Soft bill folder, calm card edge, quiet ending cue.',
      }),
      sharp: createA1P4VariantInput({
        targetText: 'The bill, please.',
        baseText: 'Die Rechnung, bitte.',
        meaning: 'Eine direkte, höfliche Bitte um die Rechnung.',
        chunks: [
          chunk('the-bill', 'The bill', 'die Rechnung'),
          chunk('please', 'please', 'bitte'),
        ],
        extraLessonItems: [
          chunk('card', 'card', 'Karte'),
          chunk('cash', 'cash', 'Bargeld'),
          chunk('total', 'total', 'Summe'),
        ],
        targetChips: ['The bill,', 'please.'],
        distractors: ['total', 'menu'],
        typeRecall: recall('', 'The bill', ', please.', ['The bill', 'the menu', 'total', 'card']),
        sceneCaption: 'Sharp fragt nach der Rechnung und ist bereit zu zahlen.',
        trophyWord: trophy('total', 'Summe', 'Total, please.', 'Total passt zum klaren Zahlungsende.'),
        mediaCaption: 'Rechnungsmappe, Kartengerät am Tischrand, Summe auf dem kleinen Display.',
        songSeed: { genre: 'minimal synth pulse', mood: 'bill close' },
        visualNotes: 'Hard bill folder crop, total line, precise payment frame.',
      }),
    },
  },
]

const a1Practical4Lessons: GuidedLessonDefinition[] = a1Practical4Inputs.map((lessonInput, index) => {
  const lessonNumber = index + 1
  const id = `english-a1-practical-4-${String(lessonNumber).padStart(3, '0')}-${lessonInput.slug}`
  const nextInput = a1Practical4Inputs[index + 1]

  return {
    id,
    pathId: GUIDED_TODAY_PATH_FOUR_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_FOUR_METADATA.title,
    level: GUIDED_TODAY_PATH_FOUR_METADATA.level,
    lessonNumber,
    baseLanguage: GUIDED_TODAY_PATH_FOUR_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_FOUR_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_FOUR_METADATA,
    lessonMetadata: {
      id,
      sequence: lessonNumber,
      title: lessonInput.title,
    },
    title: lessonInput.title,
    situation: lessonInput.situation,
    pedagogicalGoal: lessonInput.pedagogicalGoal,
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: nextInput?.title ?? 'Path complete',
      situation: nextInput?.situation.de ?? 'Du hast A1 Practical 4 abgeschlossen.',
    },
    vibeVariants: {
      bright: createA1P2Variant(lessonInput.variants.bright),
      wistful: createA1P2Variant(lessonInput.variants.wistful),
      sharp: createA1P2Variant(lessonInput.variants.sharp),
    },
  }
})

type A1P5LessonInput = A1P2LessonInput

const a1Practical5Inputs: A1P5LessonInput[] = [
  {
    slug: 'sorry-im-late',
    title: "Sorry, I'm late",
    situation: {
      en: 'You apologize because you arrive late.',
      de: 'Du entschuldigst dich, dass du zu spät kommst.',
    },
    pedagogicalGoal: 'Apologize simply for arriving late.',
    variants: {
      bright: createA1P5VariantInput({
        targetText: "I'm so sorry I'm late!",
        baseText: 'Es tut mir sehr leid, ich bin zu spät!',
        meaning: 'Eine warme, ehrliche Entschuldigung, wenn du etwas zu spät ankommst.',
        chunks: [
          chunk('im-so-sorry', "I'm so sorry", 'es tut mir sehr leid'),
          chunk('im-late', "I'm late", 'ich bin zu spät'),
        ],
        extraLessonItems: [
          chunk('late', 'late', 'spät'),
          chunk('traffic', 'traffic', 'Verkehr'),
          chunk('im-here', "I'm here", 'ich bin da'),
          chunk('no-problem', 'no problem', 'kein Problem'),
        ],
        targetChips: ["I'm so sorry", "I'm late!"],
        distractors: ['traffic', 'train'],
        typeRecall: recall("I'm so sorry ", "I'm late", '!', ["I'm late", 'the bus was slow', "I'm here", 'no problem']),
        sceneCaption: 'Bright kommt etwas außer Atem an, schaut kurz auf die Uhr und entschuldigt sich ehrlich.',
        trophyWord: trophy('sincere', 'aufrichtig', 'Sincere sorry.', 'Sincere hält die Entschuldigung warm und glaubwürdig.'),
        mediaCaption: 'Heller Eingang, schneller Schritt, Uhrblick und ein freundliches Ankommen trotz Verspätung.',
        songSeed: { genre: 'light acoustic pop', mood: 'warm late arrival' },
        visualNotes: 'Warm doorway, watch glance, soft arrival motion, sincere apology cue.',
      }),
      wistful: createA1P5VariantInput({
        targetText: 'Sorry, the bus was slow.',
        baseText: 'Entschuldigung, der Bus war langsam.',
        meaning: 'Eine ruhige Erklärung, warum du zu spät bist, ohne die Szene schwer zu machen.',
        chunks: [
          chunk('sorry', 'Sorry', 'Entschuldigung'),
          chunk('the-bus', 'the bus', 'der Bus'),
          chunk('was-slow', 'was slow', 'war langsam'),
        ],
        extraLessonItems: [
          chunk('late', 'late', 'zu spät'),
          chunk('traffic', 'traffic', 'Verkehr'),
          chunk('train', 'train', 'Zug'),
          chunk('no-problem', 'no problem', 'kein Problem'),
        ],
        targetChips: ['Sorry,', 'the bus', 'was slow.'],
        distractors: ['relief', 'train'],
        typeRecall: recall('Sorry, ', 'the bus was slow', '.', ['the bus was slow', "I'm late", 'the train was slow', 'traffic']),
        sceneCaption: 'Wistful kommt ruhig an, nennt den Bus und lässt die Entschuldigung klein bleiben.',
        trophyWord: trophy('relief', 'Erleichterung', 'Relief now.', 'Relief passt zum Moment, in dem die Verspätung ausgesprochen ist.'),
        mediaCaption: 'Bushaltestelle im Hintergrund, leiser Uhrblick, vorsichtiger Schritt zur wartenden Person.',
        songSeed: { genre: 'soft indie folk', mood: 'soft late arrival' },
        visualNotes: 'Muted bus stop, small watch glance, low-pressure apology rhythm.',
      }),
      sharp: createA1P5VariantInput({
        targetText: 'Sorry, late.',
        baseText: 'Entschuldigung, ich bin spät dran.',
        meaning: 'Eine knappe Entschuldigung: Problem nennen und sofort präsent sein.',
        chunks: [
          chunk('sorry', 'Sorry', 'Entschuldigung'),
          chunk('late', 'late', 'spät dran'),
        ],
        extraLessonItems: [
          chunk('im-here', "I'm here", 'ich bin da'),
          chunk('bus', 'bus', 'Bus'),
          chunk('train', 'train', 'Zug'),
          chunk('traffic', 'traffic', 'Verkehr'),
        ],
        targetChips: ['Sorry,', 'late.'],
        distractors: ['quick', 'train'],
        typeRecall: recall('', 'Sorry, late', '.', ['Sorry, late', "I'm here", 'traffic', 'bus']),
        sceneCaption: 'Sharp kommt an, sagt kurz sorry und richtet den Blick sofort auf den nächsten Schritt.',
        trophyWord: trophy('quick', 'schnell', 'Quick apology.', 'Quick passt zur kurzen Entschuldigung ohne lange Erklärung.'),
        mediaCaption: 'Klare Eingangslinie, Uhr am Handgelenk, direkter Blick nach dem schnellen Ankommen.',
        songSeed: { genre: 'minimal synth pulse', mood: 'brief late arrival' },
        visualNotes: 'Hard watch crop, quick arrival beat, compact apology line.',
      }),
    },
  },
  {
    slug: 'i-forgot',
    title: 'I forgot',
    situation: {
      en: 'You say that you forgot something.',
      de: 'Du sagst, dass du etwas vergessen hast.',
    },
    pedagogicalGoal: 'Admit forgetting something without making the moment bigger.',
    variants: {
      bright: createA1P5VariantInput({
        targetText: 'Oh, I forgot. Sorry!',
        baseText: 'Oh, ich habe es vergessen. Entschuldigung!',
        meaning: 'Eine warme, selbstkritische Korrektur, wenn dir der Fehler auffällt.',
        chunks: [
          chunk('oh', 'Oh', 'oh'),
          chunk('i-forgot', 'I forgot', 'ich habe es vergessen'),
          chunk('sorry', 'sorry', 'Entschuldigung'),
        ],
        extraLessonItems: [
          chunk('name', 'name', 'Name'),
          chunk('time', 'time', 'Uhrzeit'),
          chunk('i-remember-now', 'I remember now', 'ich erinnere mich jetzt'),
          chunk('my-fault', 'my fault', 'mein Fehler'),
        ],
        targetChips: ['Oh,', 'I forgot.', 'Sorry!'],
        distractors: ['recover', 'again'],
        typeRecall: recall('Oh, ', 'I forgot', '. Sorry!', ['I forgot', 'I remember now', 'my fault', 'again']),
        sceneCaption: 'Bright hebt kurz die Hand an die Stirn und findet den Faden freundlich wieder.',
        trophyWord: trophy('recover', 'wiederfinden', 'Recover and smile.', 'Recover gibt dem Vergessen eine leichte Rückkehr statt Scham.'),
        mediaCaption: 'Hand an der Stirn, kurzer Aha-Moment, Notiz oder Name kommt wieder in den Blick.',
        songSeed: { genre: 'light acoustic pop', mood: 'warm recovery' },
        visualNotes: 'Warm realization gesture, note cue, recovery highlight.',
      }),
      wistful: createA1P5VariantInput({
        targetText: 'Sorry, I think I forgot.',
        baseText: 'Entschuldigung, ich glaube, ich habe es vergessen.',
        meaning: 'Eine vorsichtige Einsicht, wenn du merkst, dass dir etwas entfallen ist.',
        chunks: [
          chunk('sorry', 'Sorry', 'Entschuldigung'),
          chunk('i-think', 'I think', 'ich glaube'),
          chunk('i-forgot', 'I forgot', 'ich habe es vergessen'),
        ],
        extraLessonItems: [
          chunk('again', 'again', 'noch einmal'),
          chunk('time', 'time', 'Uhrzeit'),
          chunk('name', 'name', 'Name'),
          chunk('my-fault', 'my fault', 'mein Fehler'),
        ],
        targetChips: ['Sorry,', 'I think', 'I forgot.'],
        distractors: ['honest', 'time'],
        typeRecall: recall('Sorry, I think ', 'I forgot', '.', ['I forgot', 'I remember now', 'again', 'my fault']),
        sceneCaption: 'Wistful bleibt einen Moment stehen und gibt das Vergessen ruhig zu.',
        trophyWord: trophy('honest', 'ehrlich', 'Honest mistake.', 'Honest macht die kleine Panne offen, aber nicht traurig.'),
        mediaCaption: 'Weiches Licht auf einer Notiz, Hand an der Stirn, kleiner stiller Erkenntnismoment.',
        songSeed: { genre: 'soft indie folk', mood: 'quiet admission' },
        visualNotes: 'Soft forehead gesture, note blur, honest admission cue.',
      }),
      sharp: createA1P5VariantInput({
        targetText: 'I forgot.',
        baseText: 'Ich habe es vergessen.',
        meaning: 'Eine direkte Fehleransage ohne Ausschmückung.',
        chunks: [
          chunk('i-forgot', 'I forgot', 'ich habe es vergessen'),
        ],
        extraLessonItems: [
          chunk('i-remember-now', 'I remember now', 'ich erinnere mich jetzt'),
          chunk('again', 'again', 'noch einmal'),
          chunk('time', 'time', 'Uhrzeit'),
          chunk('my-fault', 'my fault', 'mein Fehler'),
        ],
        targetChips: ['I', 'forgot.'],
        distractors: ['noted', 'later'],
        typeRecall: recall('', 'I forgot', '.', ['I forgot', 'I remember now', 'again', 'my fault']),
        sceneCaption: 'Sharp benennt das Vergessen und wartet direkt auf die Wiederholung.',
        trophyWord: trophy('noted', 'gemerkt', 'Noted now.', 'Noted passt zur knappen Korrektur nach dem Fehler.'),
        mediaCaption: 'Klare Notizkante, kurzer Stirnblick, Stift bereit für die fehlende Information.',
        songSeed: { genre: 'minimal synth pulse', mood: 'direct admission' },
        visualNotes: 'Crisp note edge, direct realization beat, no extra apology copy.',
      }),
    },
  },
  {
    slug: 'whats-your-name',
    title: "What's your name?",
    situation: {
      en: "You ask another person for their name.",
      de: 'Du fragst eine andere Person nach ihrem Namen.',
    },
    pedagogicalGoal: "Ask for someone's name in a basic introduction.",
    variants: {
      bright: createA1P5VariantInput({
        targetText: "What's your name?",
        baseText: 'Wie heißt du?',
        meaning: 'Eine einfache, offene Namensfrage beim Kennenlernen.',
        chunks: [
          chunk('whats', "What's", 'wie ist'),
          chunk('your-name', 'your name', 'dein Name'),
        ],
        extraLessonItems: [
          chunk('my-name-is', 'my name is', 'ich heiße'),
          chunk('first-name', 'first name', 'Vorname'),
          chunk('last-name', 'last name', 'Nachname'),
          chunk('please', 'please', 'bitte'),
        ],
        targetChips: ["What's", 'your name?'],
        distractors: ['curious', 'city'],
        typeRecall: recall("What's ", 'your name', '?', ['your name', 'my name is', 'first name', 'last name']),
        sceneCaption: 'Bright hält die Hand offen und fragt freundlich nach dem Namen.',
        trophyWord: trophy('curious', 'neugierig', 'Curious hello.', 'Curious passt zur warmen, offenen ersten Frage.'),
        mediaCaption: 'Offene Handbewegung, höflicher Blickkontakt und ein kleines Namensschild im Hintergrund.',
        songSeed: { genre: 'light acoustic pop', mood: 'warm introduction' },
        visualNotes: 'Open palm, name-card cue, warm eye contact.',
      }),
      wistful: createA1P5VariantInput({
        targetText: 'May I ask your name?',
        baseText: 'Darf ich nach deinem Namen fragen?',
        meaning: 'Eine zurückhaltende Namensfrage mit höflichem Abstand.',
        chunks: [
          chunk('may-i-ask', 'May I ask', 'darf ich fragen'),
          chunk('your-name', 'your name', 'dein Name'),
        ],
        extraLessonItems: [
          chunk('you', 'you', 'du'),
          chunk('please', 'please', 'bitte'),
          chunk('first-name', 'first name', 'Vorname'),
          chunk('my-name-is', 'my name is', 'ich heiße'),
        ],
        targetChips: ['May I ask', 'your name?'],
        distractors: ['ask', 'last name'],
        typeRecall: recall('May I ask ', 'your name', '?', ['your name', 'my name is', 'first name', 'please']),
        sceneCaption: 'Wistful hält den Blickkontakt vorsichtig und fragt nach dem Namen.',
        trophyWord: trophy('ask', 'fragen', 'Ask gently.', 'Ask ist der kleine mutige Schritt in dieser Vorstellung.'),
        mediaCaption: 'Ruhiger Blickkontakt, kleine Pause vor der Frage, Namensschild nur halb sichtbar.',
        songSeed: { genre: 'soft indie folk', mood: 'careful introduction' },
        visualNotes: 'Muted eye contact, small pause, name question focus.',
      }),
      sharp: createA1P5VariantInput({
        targetText: 'Your name?',
        baseText: 'Wie ist dein Name?',
        meaning: 'Eine sehr kurze Namensfrage, klar und trotzdem nicht schroff.',
        chunks: [
          chunk('your-name', 'Your name', 'dein Name'),
        ],
        extraLessonItems: [
          chunk('please', 'please', 'bitte'),
          chunk('first-name', 'first name', 'Vorname'),
          chunk('last-name', 'last name', 'Nachname'),
          chunk('you', 'you', 'du'),
        ],
        targetChips: ['Your', 'name?'],
        distractors: ['direct', 'city'],
        typeRecall: recall('', 'Your name', '?', ['Your name', "What's your name", 'first name', 'last name']),
        sceneCaption: 'Sharp fragt knapp nach dem Namen und bleibt beim Blickkontakt höflich.',
        trophyWord: trophy('name', 'Name', 'Your name?', 'Name ist der direkte Kern der Sharp-Frage.'),
        mediaCaption: 'Klarer Blickkontakt, kurzer Nicken-Moment, Name als einzige offene Information.',
        songSeed: { genre: 'minimal synth pulse', mood: 'direct introduction' },
        visualNotes: 'Crisp eye-line, name field highlight, compact question state.',
      }),
    },
  },
  {
    slug: 'nice-to-meet-you',
    title: 'Nice to meet you',
    situation: {
      en: 'You respond warmly after an introduction.',
      de: 'Du erwiderst eine Vorstellung freundlich.',
    },
    pedagogicalGoal: 'Respond to an introduction with a short friendly line.',
    variants: {
      bright: createA1P5VariantInput({
        targetText: 'Nice to meet you!',
        baseText: 'Schön, dich kennenzulernen!',
        meaning: 'Eine volle, warme Antwort nach dem ersten Namen.',
        chunks: [
          chunk('nice', 'Nice', 'schön'),
          chunk('to-meet-you', 'to meet you', 'dich kennenzulernen'),
        ],
        extraLessonItems: [
          chunk('too', 'too', 'auch'),
          chunk('glad', 'glad', 'froh'),
          chunk('pleased', 'pleased', 'erfreut'),
          chunk('hello', 'hello', 'hallo'),
          chunk('hi', 'hi', 'hi'),
        ],
        targetChips: ['Nice', 'to meet you!'],
        distractors: ['delighted', 'bye'],
        typeRecall: recall('', 'Nice to meet you', '!', ['Nice to meet you', 'pleased to meet you', 'hello', 'too']),
        sceneCaption: 'Bright reagiert auf die Vorstellung mit einem warmen Lächeln und offenem Händedruck.',
        trophyWord: trophy('pleasure', 'Vergnügen', 'A pleasure to meet you.', 'Pleasure ist Brights warme, höfliche Begrüßung.'),
        mediaCaption: 'Freundlicher Händedruck, offenes Lächeln, zwei Personen stehen einander zugewandt.',
        songSeed: { genre: 'light acoustic pop', mood: 'warm meeting' },
        visualNotes: 'Warm handshake, smile cue, bright introduction close.',
      }),
      wistful: createA1P5VariantInput({
        targetText: 'Nice to meet you, too.',
        baseText: 'Schön, dich auch kennenzulernen.',
        meaning: 'Eine leise, höfliche Erwiderung, wenn die andere Person zuerst grüßt.',
        chunks: [
          chunk('nice-to-meet-you', 'Nice to meet you', 'schön, dich kennenzulernen'),
          chunk('too', 'too', 'auch'),
        ],
        extraLessonItems: [
          chunk('pleased', 'pleased', 'erfreut'),
          chunk('hello', 'hello', 'hallo'),
          chunk('glad', 'glad', 'froh'),
          chunk('nod', 'nod', 'Nicken'),
        ],
        targetChips: ['Nice to meet you,', 'too.'],
        distractors: ['pleased', 'bye'],
        typeRecall: recall('', 'Nice to meet you', ', too.', ['Nice to meet you', 'pleased to meet you', 'too', 'hello']),
        sceneCaption: 'Wistful nickt freundlich und erwidert die Vorstellung ohne Eile.',
        trophyWord: trophy('pleased', 'erfreut', 'Pleased, too.', 'Pleased hält die Antwort freundlich und zurückhaltend.'),
        mediaCaption: 'Sanftes Nicken, kleiner Händedruck, ruhige Distanz zwischen zwei neuen Personen.',
        songSeed: { genre: 'soft indie folk', mood: 'soft meeting' },
        visualNotes: 'Soft nod, muted handshake, pleased response cue.',
      }),
      sharp: createA1P5VariantInput({
        targetText: 'Pleasure.',
        baseText: 'Freut mich.',
        meaning: 'Eine kurze positive Antwort nach der Vorstellung.',
        chunks: [
          chunk('pleasure', 'Pleasure', 'ich freue mich'),
        ],
        extraLessonItems: [
          chunk('nice', 'nice', 'nett'),
          chunk('to-meet-you', 'to meet you', 'dich kennenzulernen'),
          chunk('hello', 'hello', 'hallo'),
          chunk('too', 'too', 'auch'),
        ],
        targetChips: ['Pleasure.'],
        distractors: ['brief', 'bye'],
        typeRecall: recall('', 'Pleasure', '.', ['Pleasure', 'Nice to meet you', 'hello', 'too']),
        sceneCaption: 'Sharp nickt knapp und bestätigt die Vorstellung freundlich.',
        trophyWord: trophy('brief', 'kurz', 'Brief warmth.', 'Brief hält Sharps Antwort freundlich, aber sehr kompakt.'),
        mediaCaption: 'Kurzer Händedruck, klares Nicken, Vorstellung ist erledigt und die Szene geht weiter.',
        songSeed: { genre: 'minimal synth pulse', mood: 'brief meeting' },
        visualNotes: 'Hard nod cue, short handshake frame, compact positive close.',
      }),
    },
  },
  {
    slug: 'where-are-you-from',
    title: 'Where are you from?',
    situation: {
      en: 'You ask where the other person is from.',
      de: 'Du fragst, woher die andere Person kommt.',
    },
    pedagogicalGoal: 'Ask a simple origin question in conversation.',
    variants: {
      bright: createA1P5VariantInput({
        targetText: 'Where are you from?',
        baseText: 'Woher kommst du?',
        meaning: 'Eine offene Frage nach Herkunft, freundlich und leicht.',
        chunks: [
          chunk('where', 'Where', 'wo'),
          chunk('are-you-from', 'are you from', 'kommst du her'),
        ],
        extraLessonItems: [
          chunk('from', 'from', 'aus'),
          chunk('city', 'city', 'Stadt'),
          chunk('country', 'country', 'Land'),
          chunk('here', 'here', 'hier'),
          chunk('originally', 'originally', 'ursprünglich'),
        ],
        targetChips: ['Where are', 'you from?'],
        distractors: ['open', 'local'],
        typeRecall: recall('', 'Where are you from', '?', ['Where are you from', 'from here', 'from the city', 'originally']),
        sceneCaption: 'Bright fragt in einem entspannten Gespräch offen nach der Herkunft.',
        trophyWord: trophy('open', 'offen', 'Open question.', 'Open passt zur warmen Neugier ohne Druck.'),
        mediaCaption: 'Zwei Personen im lockeren Gespräch, Stadtplan auf dem Tisch, Blick freundlich zur anderen Person.',
        songSeed: { genre: 'light acoustic pop', mood: 'open origin question' },
        visualNotes: 'Warm conversation angle, map hint, origin question marker.',
      }),
      wistful: createA1P5VariantInput({
        targetText: "May I ask where you're from?",
        baseText: 'Darf ich fragen, woher du kommst?',
        meaning: 'Eine vorsichtige Herkunftsfrage mit höflichem Abstand.',
        chunks: [
          chunk('may-i-ask', 'May I ask', 'darf ich fragen'),
          chunk('where-youre-from', "where you're from", 'woher du kommst'),
        ],
        extraLessonItems: [
          chunk('abroad', 'abroad', 'Ausland'),
          chunk('far', 'far', 'weit weg'),
          chunk('here', 'here', 'hier'),
          chunk('country', 'country', 'Land'),
        ],
        targetChips: ['May I ask', "where you're from?"],
        distractors: ['roots', 'city'],
        typeRecall: recall('May I ask ', "where you're from", '?', ["where you're from", 'from here', 'from abroad', 'country']),
        sceneCaption: 'Wistful fragt nach Herkunft, aber lässt der anderen Person Raum.',
        trophyWord: trophy('roots', 'Wurzeln', 'Roots matter.', 'Roots macht die Herkunft konkret, ohne poetisch zu werden.'),
        mediaCaption: 'Ruhiges Gespräch am Fenster, Stadtkarte gefaltet, vorsichtiger Blick zur anderen Person.',
        songSeed: { genre: 'soft indie folk', mood: 'careful origin question' },
        visualNotes: 'Muted map edge, careful eye contact, roots cue.',
      }),
      sharp: createA1P5VariantInput({
        targetText: 'Where from?',
        baseText: 'Woher kommst du?',
        meaning: 'Eine knappe Herkunftsfrage mit klarer Richtung.',
        chunks: [
          chunk('where-from', 'Where from', 'woher'),
        ],
        extraLessonItems: [
          chunk('city', 'city', 'Stadt'),
          chunk('country', 'country', 'Land'),
          chunk('abroad', 'abroad', 'Ausland'),
          chunk('far', 'far', 'weit weg'),
        ],
        targetChips: ['Where', 'from?'],
        distractors: ['origin', 'local'],
        typeRecall: recall('', 'Where from', '?', ['Where from', 'from here', 'city', 'country']),
        sceneCaption: 'Sharp fragt kurz nach der Herkunft und wartet direkt auf die Antwort.',
        trophyWord: trophy('origin', 'Herkunft', 'Origin question.', 'Origin benennt genau, worum die kurze Frage geht.'),
        mediaCaption: 'Klares Gesprächsprofil, Stadtkarte am Rand, eine kurze Frage steht im Vordergrund.',
        songSeed: { genre: 'minimal synth pulse', mood: 'direct origin question' },
        visualNotes: 'Crisp map edge, direct question line, no extra context.',
      }),
    },
  },
  {
    slug: 'do-you-live-here',
    title: 'Do you live here?',
    situation: {
      en: 'You ask whether the person lives here.',
      de: 'Du fragst, ob die Person hier wohnt.',
    },
    pedagogicalGoal: 'Check if someone is local in a simple conversation.',
    variants: {
      bright: createA1P5VariantInput({
        targetText: 'Do you live here?',
        baseText: 'Wohnst du hier?',
        meaning: 'Eine freundliche Frage, ob die andere Person vor Ort lebt.',
        chunks: [
          chunk('do-you-live', 'Do you live', 'wohnst du'),
          chunk('here', 'here', 'hier'),
        ],
        extraLessonItems: [
          chunk('near', 'near', 'in der Nähe'),
          chunk('far', 'far', 'weit weg'),
          chunk('visitor', 'visitor', 'Besucher'),
          chunk('born-here', 'born here', 'hier geboren'),
        ],
        targetChips: ['Do you live', 'here?'],
        distractors: ['neighbor', 'tourist'],
        typeRecall: recall('Do you ', 'live here', '?', ['live here', 'from around here', 'near here', 'visitor']),
        sceneCaption: 'Bright lehnt sich im Gespräch leicht vor und fragt freundlich nach dem Zuhause.',
        trophyWord: trophy('neighbor', 'Nachbar', 'Neighbor nearby.', 'Neighbor macht die lokale Frage warm und konkret.'),
        mediaCaption: 'Locker stehende Personen vor einem Laden, Straßenecke im Hintergrund, freundlicher Gesprächsabstand.',
        songSeed: { genre: 'light acoustic pop', mood: 'friendly local check' },
        visualNotes: 'Warm street corner, lean-in cue, local question marker.',
      }),
      wistful: createA1P5VariantInput({
        targetText: 'Just curious, do you live here?',
        baseText: 'Nur aus Neugier: Wohnst du hier?',
        meaning: 'Eine sanfte Nachfrage, die klar macht, dass kein Druck dahintersteht.',
        chunks: [
          chunk('just-curious', 'Just curious', 'nur aus Neugier'),
          chunk('do-you-live-here', 'do you live here', 'wohnst du hier'),
        ],
        extraLessonItems: [
          chunk('tourist', 'tourist', 'Tourist'),
          chunk('near', 'near', 'in der Nähe'),
          chunk('visitor', 'visitor', 'Besucher'),
          chunk('born-here', 'born here', 'hier geboren'),
        ],
        targetChips: ['Just curious,', 'do you live here?'],
        distractors: ['gentle', 'far'],
        typeRecall: recall('Just curious, do you ', 'live here', '?', ['live here', 'from around here', 'visitor', 'tourist']),
        sceneCaption: 'Wistful macht die Frage klein und fragt vorsichtig nach dem Wohnort.',
        trophyWord: trophy('live', 'wohnen', 'Do you live here?', 'Live macht die Nachbarschafts-Frage konkret und A1-natürlich.'),
        mediaCaption: 'Leiser Straßenrand, kleine Gesprächspause, Blick zur Nachbarschaft statt auf die Person gedrückt.',
        songSeed: { genre: 'soft indie folk', mood: 'gentle local check' },
        visualNotes: 'Muted street corner, small pause, gentle local cue.',
      }),
      sharp: createA1P5VariantInput({
        targetText: 'Local?',
        baseText: 'Wohnst du hier?',
        meaning: 'Eine sehr kurze Frage, ob jemand von hier ist.',
        chunks: [
          chunk('local', 'Local', 'von hier'),
        ],
        extraLessonItems: [
          chunk('near', 'near', 'in der Nähe'),
          chunk('far', 'far', 'weit weg'),
          chunk('tourist', 'tourist', 'Tourist'),
          chunk('visitor', 'visitor', 'Besucher'),
        ],
        targetChips: ['Local?'],
        distractors: ['check', 'abroad'],
        typeRecall: recall('', 'Local', '?', ['Local', 'from around here', 'visitor', 'tourist']),
        sceneCaption: 'Sharp prüft knapp, ob die Person von hier ist.',
        trophyWord: trophy('local', 'einheimisch', 'Local check.', 'Local ist die kürzeste saubere Frage nach Ortskenntnis.'),
        mediaCaption: 'Klare Straßenecke, kurzer Blick zur Umgebung, Frage und Antwort bleiben kompakt.',
        songSeed: { genre: 'minimal synth pulse', mood: 'brief local check' },
        visualNotes: 'Hard street-corner crop, local marker, compact check state.',
      }),
    },
  },
  {
    slug: 'are-you-free-tonight',
    title: 'Are you free tonight?',
    situation: {
      en: 'You ask if someone has time tonight.',
      de: 'Du fragst, ob jemand heute Abend Zeit hat.',
    },
    pedagogicalGoal: 'Ask about availability for the same evening.',
    variants: {
      bright: createA1P5VariantInput({
        targetText: 'Are you free tonight?',
        baseText: 'Hast du heute Abend Zeit?',
        meaning: 'Eine warme Frage nach Zeit heute Abend.',
        chunks: [
          chunk('are-you-free', 'Are you free', 'hast du Zeit'),
          chunk('tonight', 'tonight', 'heute Abend'),
        ],
        extraLessonItems: [
          chunk('time', 'time', 'Zeit'),
          chunk('busy', 'busy', 'beschäftigt'),
          chunk('evening', 'evening', 'Abend'),
          chunk('later', 'later', 'später'),
          chunk('plan', 'plan', 'Plan'),
        ],
        targetChips: ['Are you free', 'tonight?'],
        distractors: ['eager', 'tomorrow'],
        typeRecall: recall('Are you ', 'free tonight', '?', ['free tonight', 'tonight at six', 'busy tonight', 'later']),
        sceneCaption: 'Bright fragt beim lockeren Treffen freundlich nach Zeit am Abend.',
        trophyWord: trophy('tonight', 'heute Abend', 'Free tonight?', 'Tonight macht die Einladung sofort konkret.'),
        mediaCaption: 'Zwei Personen vor einem Café, Abendlicht beginnt, eine Einladung liegt in der Luft.',
        songSeed: { genre: 'light acoustic pop', mood: 'warm invitation' },
        visualNotes: 'Warm cafe edge, evening cue, friendly invitation focus.',
      }),
      wistful: createA1P5VariantInput({
        targetText: 'Would you be free tonight?',
        baseText: 'Wärst du heute Abend frei?',
        meaning: 'Eine vorsichtige Verfügbarkeitsfrage mit Raum für Nein.',
        chunks: [
          chunk('would-you', 'Would you', 'würdest du'),
          chunk('be-free-tonight', 'be free tonight', 'heute Abend frei sein'),
        ],
        extraLessonItems: [
          chunk('later', 'later', 'später'),
          chunk('busy', 'busy', 'beschäftigt'),
          chunk('time', 'time', 'Zeit'),
          chunk('plan', 'plan', 'Plan'),
        ],
        targetChips: ['Would you', 'be free tonight?'],
        distractors: ['tentative', 'tomorrow'],
        typeRecall: recall('Would you be ', 'free tonight', '?', ['free tonight', 'tonight at six', 'busy tonight', 'later']),
        sceneCaption: 'Wistful fragt mit kleiner Pause, ob heute Abend Zeit ist.',
        trophyWord: trophy('tentative', 'vorsichtig', 'Tentative invite.', 'Tentative macht die Einladung vorsichtig, aber noch nutzbar.'),
        mediaCaption: 'Ruhiger Bürgersteig vor dem Café, Abendlicht, ein kurzer Moment vor der Frage.',
        songSeed: { genre: 'soft indie folk', mood: 'tentative invitation' },
        visualNotes: 'Muted evening cafe, pause before invite, tentative cue.',
      }),
      sharp: createA1P5VariantInput({
        targetText: 'Free tonight?',
        baseText: 'Heute Abend Zeit?',
        meaning: 'Eine knappe Verfügbarkeitsfrage für heute Abend.',
        chunks: [
          chunk('free-tonight', 'Free tonight', 'heute Abend Zeit'),
        ],
        extraLessonItems: [
          chunk('at-six', 'at six', 'um sechs'),
          chunk('busy', 'busy', 'beschäftigt'),
          chunk('later', 'later', 'später'),
          chunk('plan', 'plan', 'Plan'),
        ],
        targetChips: ['Free', 'tonight?'],
        distractors: ['slot', 'tomorrow'],
        typeRecall: recall('', 'Free tonight', '?', ['Free tonight', 'tonight at six', 'busy', 'later']),
        sceneCaption: 'Sharp prüft kurz, ob heute Abend ein Zeitfenster frei ist.',
        trophyWord: trophy('slot', 'Zeitfenster', 'Open slot.', 'Slot passt zur kurzen Prüfung, ob Zeit frei ist.'),
        mediaCaption: 'Kompakter Abendblick, Uhrzeit am Rand, Frage nach Verfügbarkeit steht klar im Vordergrund.',
        songSeed: { genre: 'minimal synth pulse', mood: 'direct availability check' },
        visualNotes: 'Hard time marker, compact evening frame, slot cue.',
      }),
    },
  },
  {
    slug: 'lets-meet-at-the-cafe',
    title: "Let's meet at the café",
    situation: {
      en: 'You suggest meeting at a specific place.',
      de: 'Du schlägst vor, sich an einem bestimmten Ort zu treffen.',
    },
    pedagogicalGoal: 'Suggest a simple meeting place and time.',
    variants: {
      bright: createA1P5VariantInput({
        targetText: "Let's meet at the café!",
        baseText: 'Lass uns im Café treffen!',
        meaning: 'Ein warmer Vorschlag für einen Treffpunkt.',
        chunks: [
          chunk('lets-meet', "Let's meet", 'treffen wir uns'),
          chunk('at-the-cafe', 'at the café', 'im Café'),
        ],
        extraLessonItems: [
          chunk('at-six', 'at six', 'um sechs'),
          chunk('see-you', 'see you', 'bis dann'),
          chunk('plan', 'plan', 'Plan'),
          chunk('corner', 'corner', 'Ecke'),
          chunk('evening', 'evening', 'Abend'),
        ],
        targetChips: ["Let's meet", 'at the café!'],
        distractors: ['plan', 'tomorrow'],
        typeRecall: recall("Let's meet ", 'at the café', '!', ['at the café', "let's meet at", 'at six', 'corner']),
        sceneCaption: 'Bright zeigt auf den Treffpunkt und macht den Plan freundlich konkret.',
        trophyWord: trophy('invite', 'einladen', 'I invite you!', 'Invite macht Brights freundliche Einladung warm und konkret.'),
        mediaCaption: 'Kleine Karte auf dem Tisch, Finger zeigt auf das Café, Uhrzeit steht daneben.',
        songSeed: { genre: 'light acoustic pop', mood: 'warm plan proposal' },
        visualNotes: 'Warm map point, cafe marker, simple plan cue.',
      }),
      wistful: createA1P5VariantInput({
        targetText: 'Maybe at the café?',
        baseText: 'Vielleicht im Café?',
        meaning: 'Ein sanfter Treffpunktvorschlag, der offen bleibt.',
        chunks: [
          chunk('maybe', 'Maybe', 'vielleicht'),
          chunk('at-the-cafe', 'at the café', 'im Café'),
        ],
        extraLessonItems: [
          chunk('meet', 'meet', 'treffen'),
          chunk('at-six', 'at six', 'um sechs'),
          chunk('corner', 'corner', 'Ecke'),
          chunk('plan', 'plan', 'Plan'),
        ],
        targetChips: ['Maybe', 'at the café?'],
        distractors: ['suggest', 'street'],
        typeRecall: recall('Maybe ', 'at the café', '?', ['at the café', "let's meet at", 'at six', 'corner']),
        sceneCaption: 'Wistful deutet auf das Café und schlägt den Ort vorsichtig vor.',
        trophyWord: trophy('suggest', 'vorschlagen', 'Suggest the café.', 'Suggest macht den Plan weich, ohne unklar zu werden.'),
        mediaCaption: 'Ruhige Skizze mit Café-Schild, Finger bleibt kurz über dem Treffpunkt stehen.',
        songSeed: { genre: 'soft indie folk', mood: 'gentle plan proposal' },
        visualNotes: 'Soft map sketch, cafe sign, gentle suggestion state.',
      }),
      sharp: createA1P5VariantInput({
        targetText: "Café, six o'clock.",
        baseText: 'Ich komme um sechs ins Café.',
        meaning: 'Ein knapper Plan mit Ort und Zeit.',
        chunks: [
          chunk('cafe', 'Café', 'Café'),
          chunk('six-oclock', "six o'clock", 'sechs Uhr'),
        ],
        extraLessonItems: [
          chunk('meet', 'meet', 'treffen'),
          chunk('plan', 'plan', 'Plan'),
          chunk('corner', 'corner', 'Ecke'),
          chunk('see-you', 'see you', 'bis dann'),
        ],
        targetChips: ['Café,', "six o'clock."],
        distractors: ['fixed', 'tomorrow'],
        typeRecall: recall('Café, ', "six o'clock", '.', ["six o'clock", 'at the café', 'corner', 'plan']),
        sceneCaption: 'Sharp legt Ort und Uhrzeit fest und schließt den Plan.',
        trophyWord: trophy('fixed', 'fest', 'Fixed plan.', 'Fixed passt zum klar gesetzten Treffpunkt.'),
        mediaCaption: 'Klare Kartenskizze, Café markiert, sechs Uhr neben dem Ort notiert.',
        songSeed: { genre: 'minimal synth pulse', mood: 'locked plan' },
        visualNotes: 'Hard cafe marker, six-o-clock label, locked plan cue.',
      }),
    },
  },
  {
    slug: 'maybe-tomorrow',
    title: 'Maybe tomorrow',
    situation: {
      en: 'You politely move the plan to tomorrow.',
      de: 'Du verschiebst freundlich auf morgen.',
    },
    pedagogicalGoal: 'Postpone a simple plan without closing the door.',
    variants: {
      bright: createA1P5VariantInput({
        targetText: 'Could we try tomorrow?',
        baseText: 'Können wir es morgen versuchen?',
        meaning: 'Eine freundliche Verschiebung mit offenem Ersatzvorschlag.',
        chunks: [
          chunk('could-we-try', 'Could we try', 'können wir versuchen'),
          chunk('tomorrow', 'tomorrow', 'morgen'),
        ],
        extraLessonItems: [
          chunk('later', 'later', 'später'),
          chunk('another-day', 'another day', 'ein anderer Tag'),
          chunk('busy', 'busy', 'beschäftigt'),
          chunk('then', 'then', 'dann'),
        ],
        targetChips: ['Could we try', 'tomorrow?'],
        distractors: ['hopeful', 'tonight'],
        typeRecall: recall('Could we try ', 'tomorrow', '?', ['tomorrow', 'next time', 'later', 'another day']),
        sceneCaption: 'Bright schaut kurz in den Planer und bietet morgen freundlich als neue Möglichkeit an.',
        trophyWord: trophy('hopeful', 'hoffnungsvoll', 'Hopeful tomorrow.', 'Hopeful hält die Verschiebung positiv und lösungsorientiert.'),
        mediaCaption: 'Planer oder Handy in der Hand, heutiger Termin verschoben, morgen sichtbar markiert.',
        songSeed: { genre: 'light acoustic pop', mood: 'optimistic postpone' },
        visualNotes: 'Warm planner glance, tomorrow marker, hopeful reschedule cue.',
      }),
      wistful: createA1P5VariantInput({
        targetText: "Maybe tomorrow, if that's okay?",
        baseText: 'Vielleicht morgen, wenn das in Ordnung ist?',
        meaning: 'Eine vorsichtige Verschiebung, die nach Zustimmung fragt.',
        chunks: [
          chunk('maybe-tomorrow', 'Maybe tomorrow', 'vielleicht morgen'),
          chunk('if-thats-okay', "if that's okay", 'wenn das in Ordnung ist'),
        ],
        extraLessonItems: [
          chunk('later', 'later', 'später'),
          chunk('next-time', 'next time', 'nächstes Mal'),
          chunk('busy', 'busy', 'beschäftigt'),
          chunk('another-day', 'another day', 'anderer Tag'),
        ],
        targetChips: ['Maybe tomorrow,', "if that's okay?"],
        distractors: ['defer', 'tonight'],
        typeRecall: recall('', 'Maybe tomorrow', ", if that's okay?", ['Maybe tomorrow', 'next time', 'later', 'another day']),
        sceneCaption: 'Wistful schaut in den Planer und verschiebt vorsichtig auf morgen.',
        trophyWord: trophy('defer', 'verschieben', 'Defer to tomorrow.', 'Defer benennt das freundliche Verschieben ohne schwere Stimmung.'),
        mediaCaption: 'Leiser Blick aufs Handy, morgen im Kalender markiert, kleine entschuldigende Handbewegung.',
        songSeed: { genre: 'soft indie folk', mood: 'gentle defer' },
        visualNotes: 'Muted planner light, tomorrow highlight, gentle defer cue.',
      }),
      sharp: createA1P5VariantInput({
        targetText: 'Tomorrow instead.',
        baseText: 'Morgen statt heute.',
        meaning: 'Eine kurze Verschiebung auf den nächsten Tag.',
        chunks: [
          chunk('tomorrow', 'Tomorrow', 'morgen'),
          chunk('instead', 'instead', 'statt heute'),
        ],
        extraLessonItems: [
          chunk('maybe', 'maybe', 'vielleicht'),
          chunk('later', 'later', 'später'),
          chunk('then', 'then', 'dann'),
          chunk('next-time', 'next time', 'nächstes Mal'),
        ],
        targetChips: ['Tomorrow', 'instead.'],
        distractors: ['shift', 'tonight'],
        typeRecall: recall('', 'Tomorrow instead', '.', ['Tomorrow instead', 'Maybe tomorrow', 'next time', 'later']),
        sceneCaption: 'Sharp verschiebt den Plan kurz auf morgen und bleibt dabei sachlich.',
        trophyWord: trophy('shift', 'Verschiebung', 'Shift to tomorrow.', 'Shift passt zur kurzen Änderung des Plans.'),
        mediaCaption: 'Klarer Kalenderblick, heutiger Slot gestrichen, morgiger Slot markiert.',
        songSeed: { genre: 'minimal synth pulse', mood: 'brief schedule shift' },
        visualNotes: 'Hard planner crop, today-to-tomorrow arrow, compact shift state.',
      }),
    },
  },
  {
    slug: 'see-you-tomorrow',
    title: 'See you tomorrow',
    situation: {
      en: 'You say goodbye until the next meeting.',
      de: 'Du verabschiedest dich bis zum nächsten Treffen.',
    },
    pedagogicalGoal: 'Confirm a friendly goodbye until tomorrow.',
    variants: {
      bright: createA1P5VariantInput({
        targetText: 'See you tomorrow!',
        baseText: 'Bis morgen!',
        meaning: 'Ein warmer Abschied mit klarer nächster Begegnung.',
        chunks: [
          chunk('see-you', 'See you', 'bis dann'),
          chunk('tomorrow', 'tomorrow', 'morgen'),
        ],
        extraLessonItems: [
          chunk('soon', 'soon', 'bald'),
          chunk('take-care', 'take care', "mach's gut"),
          chunk('bye', 'bye', 'tschüss'),
          chunk('later', 'later', 'später'),
        ],
        targetChips: ['See you', 'tomorrow!'],
        distractors: ['farewell', 'tonight'],
        typeRecall: recall('', 'See you tomorrow', '!', ['See you tomorrow', 'until then', 'tomorrow', 'bye']),
        sceneCaption: 'Bright winkt an der Tür und bestätigt das Wiedersehen morgen.',
        trophyWord: trophy('farewell', 'Abschied', 'Warm farewell.', 'Farewell passt zum freundlichen Schluss bis morgen.'),
        mediaCaption: 'Türrahmen oder Straßenecke, warme Abschiedswelle, morgiges Treffen bleibt im Blick.',
        songSeed: { genre: 'light acoustic pop', mood: 'warm farewell' },
        visualNotes: 'Warm doorway wave, tomorrow marker, friendly close cue.',
      }),
      wistful: createA1P5VariantInput({
        targetText: 'Until tomorrow, then.',
        baseText: 'Dann bis morgen.',
        meaning: 'Ein sanfter Abschied, der die Verabredung ruhig bestätigt.',
        chunks: [
          chunk('until-tomorrow', 'Until tomorrow', 'bis morgen'),
          chunk('then', 'then', 'dann'),
        ],
        extraLessonItems: [
          chunk('soon', 'soon', 'bald'),
          chunk('take-care', 'take care', "mach's gut"),
          chunk('bye', 'bye', 'tschüss'),
          chunk('later', 'later', 'später'),
        ],
        targetChips: ['Until tomorrow,', 'then.'],
        distractors: ['then', 'tonight'],
        typeRecall: recall('', 'Until tomorrow', ', then.', ['Until tomorrow', 'see you tomorrow', 'tomorrow', 'bye']),
        sceneCaption: 'Wistful winkt leise und lässt das morgige Treffen bestätigt stehen.',
        trophyWord: trophy('then', 'dann', 'Then tomorrow.', 'Then gibt dem sanften Abschied einen klaren Abschluss.'),
        mediaCaption: 'Ruhiger Abschied an der Tür, kleine Welle, Blick noch kurz zurück zur anderen Person.',
        songSeed: { genre: 'soft indie folk', mood: 'gentle farewell' },
        visualNotes: 'Muted doorway wave, small look back, then cue.',
      }),
      sharp: createA1P5VariantInput({
        targetText: 'Tomorrow. See you.',
        baseText: 'Morgen. Bis dann.',
        meaning: 'Ein kurzer Abschluss: Termin steht, Abschied folgt.',
        chunks: [
          chunk('tomorrow', 'Tomorrow', 'morgen'),
          chunk('see-you', 'See you', 'bis dann'),
        ],
        extraLessonItems: [
          chunk('soon', 'soon', 'bald'),
          chunk('bye', 'bye', 'tschüss'),
          chunk('take-care', 'take care', "mach's gut"),
          chunk('later', 'later', 'später'),
        ],
        targetChips: ['Tomorrow.', 'See you.'],
        distractors: ['close', 'tonight'],
        typeRecall: recall('', 'Tomorrow. See you', '.', ['Tomorrow. See you', 'see you tomorrow', 'until then', 'bye']),
        sceneCaption: 'Sharp bestätigt morgen und beendet die Szene mit kurzem Abschied.',
        trophyWord: trophy('close', 'Schluss', 'Clean close.', 'Close passt zum knappen Ende der Verabredung.'),
        mediaCaption: 'Klare Abschiedslinie an der Straße, kurze Welle, Bewegung direkt aus der Szene.',
        songSeed: { genre: 'minimal synth pulse', mood: 'brief close' },
        visualNotes: 'Hard street exit, compact wave, clean close state.',
      }),
    },
  },
]

const a1Practical5Lessons: GuidedLessonDefinition[] = a1Practical5Inputs.map((lessonInput, index) => {
  const lessonNumber = index + 1
  const id = `english-a1-practical-5-${String(lessonNumber).padStart(3, '0')}-${lessonInput.slug}`
  const nextInput = a1Practical5Inputs[index + 1]

  return {
    id,
    pathId: GUIDED_TODAY_PATH_FIVE_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_FIVE_METADATA.title,
    level: GUIDED_TODAY_PATH_FIVE_METADATA.level,
    lessonNumber,
    baseLanguage: GUIDED_TODAY_PATH_FIVE_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_FIVE_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_FIVE_METADATA,
    lessonMetadata: {
      id,
      sequence: lessonNumber,
      title: lessonInput.title,
    },
    title: lessonInput.title,
    situation: lessonInput.situation,
    pedagogicalGoal: lessonInput.pedagogicalGoal,
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: nextInput?.title ?? 'Path complete',
      situation: nextInput?.situation.de ?? 'Du hast A1 Practical 5 abgeschlossen.',
    },
    vibeVariants: {
      bright: createA1P2Variant(lessonInput.variants.bright),
      wistful: createA1P2Variant(lessonInput.variants.wistful),
      sharp: createA1P2Variant(lessonInput.variants.sharp),
    },
  }
})

type A1P6LessonInput = A1P2LessonInput

const a1Practical6Inputs: A1P6LessonInput[] = [
  {
    slug: 'i-dont-feel-well',
    title: "I don't feel well",
    situation: {
      en: 'You feel unwell and ask for simple help.',
      de: 'Dir geht es nicht gut und du bittest einfach um Hilfe.',
    },
    pedagogicalGoal: 'Say that you do not feel well and ask for basic help without explaining a medical issue.',
    variants: {
      bright: createA1P6VariantInput({
        targetText: "I don't feel well. Could you help me?",
        baseText: 'Mir geht es nicht gut. Könnten Sie mir helfen?',
        meaning: 'Eine freundliche, klare Bitte um einfache Hilfe.',
        chunks: [
          chunk('i-dont', "I don't", 'ich nicht'),
          chunk('feel-well', 'feel well', 'fühle mich gut'),
          chunk('could-help', 'Could you help me?', 'Könnten Sie mir helfen?'),
        ],
        extraLessonItems: [
          chunk('safe', 'safe', 'sicher'),
          chunk('careful', 'careful', 'vorsichtig'),
          chunk('calm', 'calm', 'ruhig'),
          chunk('slowly', 'slowly', 'langsam'),
        ],
        targetChips: ["I don't", 'feel well.', 'Could you', 'help me?'],
        distractors: ['better', 'ready'],
        typeRecall: recall("I don't ", 'feel well', '. Could you help me?', ['feel well', 'need help', 'feel better', 'feel ready']),
        sceneCaption: 'Bright bleibt freundlich und sagt klar, dass es ihm nicht gut geht.',
        trophyWord: trophy('safe', 'sicher', 'I want to feel safe.', 'Safe passt zu einer ruhigen Bitte um Hilfe.'),
        mediaCaption: 'Heller Apotheken- oder Empfangsbereich, eine Person bittet ruhig um Hilfe.',
        songSeed: { genre: 'warm acoustic pop', mood: 'gentle help request' },
        visualNotes: 'Friendly counter, open posture, simple help signal.',
      }),
      wistful: createA1P6VariantInput({
        targetText: 'I feel a little unwell.',
        baseText: 'Mir ist ein bisschen unwohl.',
        meaning: 'Eine vorsichtige Aussage, ohne viel zu erklären.',
        chunks: [
          chunk('i-feel', 'I feel', 'mir ist'),
          chunk('a-little', 'a little', 'ein bisschen'),
          chunk('unwell', 'unwell', 'unwohl'),
        ],
        extraLessonItems: [
          chunk('careful', 'careful', 'vorsichtig'),
          chunk('safe', 'safe', 'sicher'),
          chunk('help', 'help', 'Hilfe'),
          chunk('calm', 'calm', 'ruhig'),
        ],
        targetChips: ['I feel', 'a little', 'unwell.'],
        distractors: ['fine', 'later'],
        typeRecall: recall('I feel ', 'a little unwell', '.', ['a little unwell', 'unwell', 'not well', 'a little better']),
        sceneCaption: 'Wistful sagt leise, dass etwas nicht stimmt, bleibt aber konkret.',
        trophyWord: trophy('unwell', 'unwohl', 'I feel unwell.', 'Unwell hält die leise Selbstaussage präzise und körperlich.'),
        mediaCaption: 'Ruhiger Laden, gedämpftes Licht, eine Person sammelt sich kurz am Tresen.',
        songSeed: { genre: 'soft indie folk', mood: 'quietly vulnerable' },
        visualNotes: 'Soft pharmacy light, small pause, careful expression.',
      }),
      sharp: createA1P6VariantInput({
        targetText: "I don't feel well.",
        baseText: 'Mir geht es nicht gut.',
        meaning: 'Eine knappe, direkte Aussage ohne Zusatz.',
        chunks: [
          chunk('i-dont', "I don't", 'ich nicht'),
          chunk('feel', 'feel', 'fühle'),
          chunk('well', 'well', 'gut'),
        ],
        extraLessonItems: [
          chunk('clear', 'clear', 'klar'),
          chunk('help', 'help', 'Hilfe'),
          chunk('now', 'now', 'jetzt'),
          chunk('safe', 'safe', 'sicher'),
        ],
        targetChips: ["I don't", 'feel', 'well.'],
        distractors: ['fine', 'ready'],
        typeRecall: recall("I don't ", 'feel well', '.', ['feel well', 'need help', 'feel ready', 'feel fine']),
        sceneCaption: 'Sharp benennt den Zustand kurz und verständlich.',
        trophyWord: trophy('sick', 'krank', 'I feel sick.', 'Sick benennt das Problem in einem direkten A1-Wort.'),
        mediaCaption: 'Sachlicher Tresen, klare Geste, kurzer Satz zur eigenen Lage.',
        songSeed: { genre: 'minimal synth pulse', mood: 'steady directness' },
        visualNotes: 'Clean counter line, direct face, no extra drama.',
      }),
    },
  },
  {
    slug: 'a-pharmacy-nearby',
    title: 'A pharmacy nearby?',
    situation: {
      en: 'You ask whether there is a pharmacy nearby.',
      de: 'Du fragst, ob eine Apotheke in der Nähe ist.',
    },
    pedagogicalGoal: 'Ask for a nearby pharmacy with a short A1 question.',
    variants: {
      bright: createA1P6VariantInput({
        targetText: 'Could you show me a pharmacy nearby?',
        baseText: 'Könnten Sie mir eine Apotheke in der Nähe zeigen?',
        meaning: 'Eine freundliche Frage nach dem nächsten passenden Ort.',
        chunks: [
          chunk('could-show', 'Could you show me', 'Könnten Sie mir zeigen'),
          chunk('a-pharmacy', 'a pharmacy', 'eine Apotheke'),
          chunk('nearby', 'nearby', 'in der Nähe'),
        ],
        extraLessonItems: [
          chunk('nearby', 'nearby', 'in der Nähe'),
          chunk('here', 'here', 'hier'),
          chunk('street', 'street', 'Straße'),
          chunk('left', 'left', 'links'),
        ],
        targetChips: ['Could you', 'show me', 'a pharmacy', 'nearby?'],
        distractors: ['doctor', 'later'],
        typeRecall: recall('Could you show me a ', 'pharmacy', ' nearby?', ['pharmacy', 'doctor', 'shop', 'station']),
        sceneCaption: 'Bright fragt offen nach einer Apotheke in der Nähe.',
        trophyWord: trophy('pharmacy', 'Apotheke', 'The pharmacy is nearby.', 'Pharmacy ist der Ort, den du in dieser Szene suchst.'),
        mediaCaption: 'Straßenecke mit Apothekenschild, freundliche Wegfrage an eine Person.',
        songSeed: { genre: 'light acoustic pop', mood: 'helpful direction' },
        visualNotes: 'Pharmacy sign, nearby gesture, bright street corner.',
      }),
      wistful: createA1P6VariantInput({
        targetText: 'Is there a pharmacy near here?',
        baseText: 'Gibt es hier in der Nähe eine Apotheke?',
        meaning: 'Eine ruhige Frage, wenn du dich nicht ganz sicher fühlst.',
        chunks: [
          chunk('is-there', 'Is there', 'gibt es'),
          chunk('a-pharmacy', 'a pharmacy', 'eine Apotheke'),
          chunk('near-here', 'near here', 'hier in der Nähe'),
        ],
        extraLessonItems: [
          chunk('nearby', 'nearby', 'in der Nähe'),
          chunk('help', 'help', 'Hilfe'),
          chunk('corner', 'corner', 'Ecke'),
          chunk('slowly', 'slowly', 'langsam'),
        ],
        targetChips: ['Is there', 'a pharmacy', 'near here?'],
        distractors: ['tonight', 'ticket'],
        typeRecall: recall('Is there a ', 'pharmacy', ' near here?', ['pharmacy', 'place', 'doctor', 'shop']),
        sceneCaption: 'Wistful sucht vorsichtig nach einer Apotheke in der Nähe.',
        trophyWord: trophy('nearby', 'in der Nähe', 'Is it nearby?', 'Nearby hilft, nach einem nahen Ort zu fragen.'),
        mediaCaption: 'Leise Straßenszene, Person schaut zum Apothekenschild und fragt vorsichtig.',
        songSeed: { genre: 'soft indie folk', mood: 'careful searching' },
        visualNotes: 'Muted street, searching eyes, nearby cue.',
      }),
      sharp: createA1P6VariantInput({
        targetText: 'Pharmacy nearby?',
        baseText: 'Apotheke in der Nähe?',
        meaning: 'Eine sehr kurze Frage, wenn es schnell gehen soll.',
        chunks: [
          chunk('pharmacy', 'Pharmacy', 'Apotheke'),
          chunk('nearby', 'nearby', 'in der Nähe'),
        ],
        extraLessonItems: [
          chunk('here', 'here', 'hier'),
          chunk('left', 'left', 'links'),
          chunk('right', 'right', 'rechts'),
          chunk('street', 'street', 'Straße'),
        ],
        targetChips: ['Pharmacy', 'nearby?'],
        distractors: ['later', 'ticket'],
        typeRecall: recall('', 'Pharmacy', ' nearby?', ['Pharmacy', 'Doctor', 'Shop', 'Station']),
        sceneCaption: 'Sharp fragt knapp nach einer Apotheke in der Nähe.',
        trophyWord: trophy('near', 'nah', 'Is it near?', 'Near hält Sharps Ortsfrage in einem Wort.'),
        mediaCaption: 'Klare Straßenecke, Apothekenschild, direkter Blick zur nächsten Tür.',
        songSeed: { genre: 'minimal synth pulse', mood: 'direct location ask' },
        visualNotes: 'Sharp street sign, concise location cue, pharmacy marker.',
      }),
    },
  },
  {
    slug: 'i-need-medicine',
    title: 'I need medicine',
    situation: {
      en: 'At a pharmacy, you say that you need medicine in general terms.',
      de: 'In der Apotheke sagst du allgemein, dass du Medizin brauchst.',
    },
    pedagogicalGoal: 'Ask for medicine in a general way without amount or use details.',
    variants: {
      bright: createA1P6VariantInput({
        targetText: 'I need medicine, please.',
        baseText: 'Ich brauche Medizin, bitte.',
        meaning: 'Eine einfache Bitte an der Apotheke, ohne Details.',
        chunks: [
          chunk('i-need', 'I need', 'ich brauche'),
          chunk('medicine', 'medicine', 'Medizin'),
          chunk('please', 'please', 'bitte'),
        ],
        extraLessonItems: [
          chunk('pharmacy', 'pharmacy', 'Apotheke'),
          chunk('water', 'water', 'Wasser'),
          chunk('help', 'help', 'Hilfe'),
          chunk('safe', 'safe', 'sicher'),
        ],
        targetChips: ['I need', 'medicine,', 'please.'],
        distractors: ['ticket', 'table'],
        typeRecall: recall('I need ', 'medicine', ', please.', ['medicine', 'water', 'help', 'a ticket']),
        sceneCaption: 'Bright bittet freundlich um Medizin und bleibt allgemein.',
        trophyWord: trophy('medicine', 'Medizin', 'I need medicine.', 'Medicine ist der praktische Kern dieser Bitte.'),
        mediaCaption: 'Apothekentresen, einfache Bitte, keine Details zu Krankheit oder Anwendung.',
        songSeed: { genre: 'warm acoustic pop', mood: 'simple pharmacy ask' },
        visualNotes: 'Pharmacy counter, clear medicine cue, warm posture.',
      }),
      wistful: createA1P6VariantInput({
        targetText: 'Do you have any medicine?',
        baseText: 'Haben Sie irgendeine Medizin?',
        meaning: 'Eine vorsichtige Frage nach einer einfachen Möglichkeit.',
        chunks: [
          chunk('do-you-have', 'Do you have', 'haben Sie'),
          chunk('any', 'any', 'irgendeine'),
          chunk('medicine', 'medicine', 'Medizin'),
        ],
        extraLessonItems: [
          chunk('any', 'any', 'irgendeine'),
          chunk('please', 'please', 'bitte'),
          chunk('wait', 'wait', 'warten'),
          chunk('careful', 'careful', 'vorsichtig'),
        ],
        targetChips: ['Do you have', 'any', 'medicine?'],
        distractors: ['doctor', 'coffee'],
        typeRecall: recall('Do you have ', 'any medicine', '?', ['any medicine', 'medicine', 'water', 'a receipt']),
        sceneCaption: 'Wistful fragt behutsam, ob es allgemein Medizin gibt.',
        trophyWord: trophy('any', 'irgendein', 'Do you have any medicine?', 'Any macht die Frage offen und einfach.'),
        mediaCaption: 'Ruhige Apotheke, fragender Blick, kleine und allgemeine Bitte.',
        songSeed: { genre: 'soft indie folk', mood: 'careful pharmacy ask' },
        visualNotes: 'Quiet counter, soft hands, open question.',
      }),
      sharp: createA1P6VariantInput({
        targetText: 'Medicine, please.',
        baseText: 'Medizin, bitte.',
        meaning: 'Eine knappe Bitte, die trotzdem höflich bleibt.',
        chunks: [
          chunk('medicine', 'Medicine', 'Medizin'),
          chunk('please', 'please', 'bitte'),
        ],
        extraLessonItems: [
          chunk('careful', 'careful', 'vorsichtig'),
          chunk('water', 'water', 'Wasser'),
          chunk('help', 'help', 'Hilfe'),
          chunk('now', 'now', 'jetzt'),
        ],
        targetChips: ['Medicine,', 'please.'],
        distractors: ['ticket', 'coffee'],
        typeRecall: recall('', 'Medicine', ', please.', ['Medicine', 'Water', 'Help', 'Ticket']),
        sceneCaption: 'Sharp hält die Bitte kurz und höflich.',
        trophyWord: trophy('pain', 'Schmerz', 'For pain, please.', 'Pain ist Sharps konkrete Apotheken-Bitte ohne Umweg.'),
        mediaCaption: 'Sachlicher Apothekentresen, kurzer Blick, klare Bitte.',
        songSeed: { genre: 'minimal synth pulse', mood: 'controlled pharmacy ask' },
        visualNotes: 'Clean counter, short phrase card, direct posture.',
      }),
    },
  },
  {
    slug: 'it-hurts-here',
    title: 'It hurts here',
    situation: {
      en: 'You point to a place and say that it hurts.',
      de: 'Du zeigst auf eine Stelle und sagst, dass es dort weh tut.',
    },
    pedagogicalGoal: 'Name pain location simply without diagnosis or explanation.',
    variants: {
      bright: createA1P6VariantInput({
        targetText: 'It hurts here.',
        baseText: 'Es tut mir hier weh.',
        meaning: 'Eine kurze, klare Angabe zur Stelle.',
        chunks: [
          chunk('it-hurts', 'It hurts', 'es tut weh'),
          chunk('here', 'here', 'hier'),
        ],
        extraLessonItems: [
          chunk('here', 'here', 'hier'),
          chunk('slowly', 'slowly', 'langsam'),
          chunk('careful', 'careful', 'vorsichtig'),
          chunk('clear', 'clear', 'klar'),
        ],
        targetChips: ['It hurts', 'here.'],
        distractors: ['there', 'later'],
        typeRecall: recall('It ', 'hurts', ' here.', ['hurts', 'helps', 'waits', 'works']),
        sceneCaption: 'Bright zeigt ruhig auf die Stelle und sagt den einfachen Satz.',
        trophyWord: trophy('here', 'hier', 'It hurts here.', 'Here macht die Stelle in einem Wort klar.'),
        mediaCaption: 'Person zeigt vorsichtig auf eine Stelle, ruhiger Apothekenkontext.',
        songSeed: { genre: 'light acoustic pop', mood: 'clear body cue' },
        visualNotes: 'Simple pointing gesture, calm face, here cue.',
      }),
      wistful: createA1P6VariantInput({
        targetText: 'This part hurts a little.',
        baseText: 'Diese Stelle tut ein bisschen weh.',
        meaning: 'Eine sanfte Angabe, ohne es dramatisch zu machen.',
        chunks: [
          chunk('this-part', 'This part', 'diese Stelle'),
          chunk('hurts', 'hurts', 'tut weh'),
          chunk('a-little', 'a little', 'ein bisschen'),
        ],
        extraLessonItems: [
          chunk('slowly', 'slowly', 'langsam'),
          chunk('careful', 'careful', 'vorsichtig'),
          chunk('rest', 'rest', 'Ruhe'),
          chunk('safe', 'safe', 'sicher'),
        ],
        targetChips: ['This part', 'hurts', 'a little.'],
        distractors: ['better', 'nearby'],
        typeRecall: recall('This part ', 'hurts', ' a little.', ['hurts', 'helps', 'waits', 'feels']),
        sceneCaption: 'Wistful benennt die Stelle leise und ohne Übertreibung.',
        trophyWord: trophy('little', 'wenig', 'A little hurt.', 'Little hält die Schmerzaussage vorsichtig und realistisch.'),
        mediaCaption: 'Gedämpfte Szene, eine kleine Geste zur schmerzenden Stelle.',
        songSeed: { genre: 'soft indie folk', mood: 'soft body cue' },
        visualNotes: 'Muted hand gesture, careful pacing, low drama.',
      }),
      sharp: createA1P6VariantInput({
        targetText: 'Here. It hurts.',
        baseText: 'Hier. Es tut mir weh.',
        meaning: 'Zwei kurze Sätze: Ort, dann Problem.',
        chunks: [
          chunk('here', 'Here', 'hier'),
          chunk('it-hurts', 'It hurts', 'es tut weh'),
        ],
        extraLessonItems: [
          chunk('hurts', 'hurts', 'tut weh'),
          chunk('clear', 'clear', 'klar'),
          chunk('now', 'now', 'jetzt'),
          chunk('help', 'help', 'Hilfe'),
        ],
        targetChips: ['Here.', 'It hurts.'],
        distractors: ['later', 'fine'],
        typeRecall: recall('Here. It ', 'hurts', '.', ['hurts', 'helps', 'waits', 'works']),
        sceneCaption: 'Sharp trennt Ort und Aussage in zwei klare kurze Sätze.',
        trophyWord: trophy('hurts', 'tut weh', 'It hurts.', 'Hurts ist der einfache A1-Kern für Schmerz.'),
        mediaCaption: 'Klare Zeigegeste, kurzer Blick, keine weiteren Details.',
        songSeed: { genre: 'minimal synth pulse', mood: 'precise body cue' },
        visualNotes: 'Direct point, concise phrase, controlled frame.',
      }),
    },
  },
  {
    slug: 'i-have-a-headache',
    title: 'I have a headache',
    situation: {
      en: 'You say that you have a headache.',
      de: 'Du sagst, dass du Kopfschmerzen hast.',
    },
    pedagogicalGoal: 'State a common symptom in simple English without asking for a remedy.',
    variants: {
      bright: createA1P6VariantInput({
        targetText: 'I have a headache.',
        baseText: 'Ich habe Kopfschmerzen.',
        meaning: 'Eine einfache Aussage über Kopfschmerzen.',
        chunks: [
          chunk('i-have', 'I have', 'ich habe'),
          chunk('a-headache', 'a headache', 'Kopfschmerzen'),
        ],
        extraLessonItems: [
          chunk('headache', 'headache', 'Kopfschmerzen'),
          chunk('water', 'water', 'Wasser'),
          chunk('rest', 'rest', 'Ruhe'),
          chunk('careful', 'careful', 'vorsichtig'),
        ],
        targetChips: ['I have', 'a headache.'],
        distractors: ['a ticket', 'a table'],
        typeRecall: recall('I have a ', 'headache', '.', ['headache', 'problem', 'ticket', 'reservation']),
        sceneCaption: 'Bright sagt freundlich und klar, dass er Kopfschmerzen hat.',
        trophyWord: trophy('headache', 'Kopfschmerzen', 'I have a headache.', 'Headache ist ein konkretes, häufiges A1-Wort.'),
        mediaCaption: 'Apothekenlicht, Hand an der Stirn, kurze Aussage ohne weitere Erklärung.',
        songSeed: { genre: 'warm acoustic pop', mood: 'plain symptom cue' },
        visualNotes: 'Hand to forehead, calm expression, headache cue.',
      }),
      wistful: createA1P6VariantInput({
        targetText: 'My head hurts a little.',
        baseText: 'Mein Kopf tut ein bisschen weh.',
        meaning: 'Eine vorsichtige, einfache Beschreibung.',
        chunks: [
          chunk('my-head', 'My head', 'mein Kopf'),
          chunk('hurts', 'hurts', 'tut weh'),
          chunk('a-little', 'a little', 'ein bisschen'),
        ],
        extraLessonItems: [
          chunk('rest', 'rest', 'Ruhe'),
          chunk('slowly', 'slowly', 'langsam'),
          chunk('water', 'water', 'Wasser'),
          chunk('quiet', 'quiet', 'ruhig'),
        ],
        targetChips: ['My head', 'hurts', 'a little.'],
        distractors: ['tomorrow', 'nearby'],
        typeRecall: recall('My head ', 'hurts', ' a little.', ['hurts', 'helps', 'waits', 'works']),
        sceneCaption: 'Wistful sagt behutsam, dass der Kopf ein bisschen weh tut.',
        trophyWord: trophy('rest', 'Ruhe', 'Rest feels good.', 'Rest bleibt ein einfaches, vorsichtiges Ankerwort.'),
        mediaCaption: 'Ruhige Ecke, Hand an der Stirn, sanfter Ausdruck.',
        songSeed: { genre: 'soft indie folk', mood: 'quiet discomfort' },
        visualNotes: 'Soft forehead gesture, muted color, gentle cue.',
      }),
      sharp: createA1P6VariantInput({
        targetText: 'Headache.',
        baseText: 'Ich habe Kopfschmerzen.',
        meaning: 'Ein einzelnes klares Wort, wenn wenig Zeit ist.',
        chunks: [
          chunk('headache', 'Headache', 'Kopfschmerzen'),
        ],
        extraLessonItems: [
          chunk('urgent', 'urgent', 'dringend'),
          chunk('help', 'help', 'Hilfe'),
          chunk('water', 'water', 'Wasser'),
          chunk('rest', 'rest', 'Ruhe'),
        ],
        targetChips: ['Headache.'],
        distractors: ['Ticket.', 'Coffee.'],
        typeRecall: recall('', 'Headache', '.', ['Headache', 'Medicine', 'Water', 'Ticket']),
        sceneCaption: 'Sharp nennt das Symptom in einem Wort.',
        trophyWord: trophy('urgent', 'dringend', 'This feels urgent.', 'Urgent bleibt kurz, ohne mehr zu behaupten.'),
        mediaCaption: 'Minimaler Apothekenmoment, kurzer Hinweis auf Kopfschmerzen.',
        songSeed: { genre: 'minimal synth pulse', mood: 'single-word symptom' },
        visualNotes: 'Compact symptom cue, sharp framing, no extra detail.',
      }),
    },
  },
  {
    slug: 'i-need-water',
    title: 'I need water',
    situation: {
      en: 'You ask for water.',
      de: 'Du bittest um Wasser.',
    },
    pedagogicalGoal: 'Ask for water politely in a simple way.',
    variants: {
      bright: createA1P6VariantInput({
        targetText: 'Could I have some water, please?',
        baseText: 'Könnte ich bitte etwas Wasser haben?',
        meaning: 'Eine freundliche Bitte um Wasser.',
        chunks: [
          chunk('could-i-have', 'Could I have', 'könnte ich haben'),
          chunk('some-water', 'some water', 'etwas Wasser'),
          chunk('please', 'please', 'bitte'),
        ],
        extraLessonItems: [
          chunk('water', 'water', 'Wasser'),
          chunk('wait', 'wait', 'warten'),
          chunk('safe', 'safe', 'sicher'),
          chunk('ready', 'ready', 'bereit'),
        ],
        targetChips: ['Could I have', 'some water,', 'please?'],
        distractors: ['medicine', 'ticket'],
        typeRecall: recall('Could I have some ', 'water', ', please?', ['water', 'medicine', 'tea', 'a ticket']),
        sceneCaption: 'Bright bittet höflich um Wasser.',
        trophyWord: trophy('water', 'Wasser', 'Could I have water?', 'Water ist ein einfacher, wichtiger Bedarf.'),
        mediaCaption: 'Glas Wasser am Tresen, freundliche Bitte, ruhige Szene.',
        songSeed: { genre: 'warm acoustic pop', mood: 'small practical need' },
        visualNotes: 'Water glass, gentle ask, warm counter.',
      }),
      wistful: createA1P6VariantInput({
        targetText: 'Just some water, please?',
        baseText: 'Nur etwas Wasser, bitte?',
        meaning: 'Eine kleine, vorsichtige Bitte.',
        chunks: [
          chunk('just', 'Just', 'nur'),
          chunk('some-water', 'some water', 'etwas Wasser'),
          chunk('please', 'please', 'bitte'),
        ],
        extraLessonItems: [
          chunk('wait', 'wait', 'warten'),
          chunk('water', 'water', 'Wasser'),
          chunk('rest', 'rest', 'Ruhe'),
          chunk('careful', 'careful', 'vorsichtig'),
        ],
        targetChips: ['Just', 'some water,', 'please?'],
        distractors: ['later', 'coffee'],
        typeRecall: recall('Just some ', 'water', ', please?', ['water', 'rest', 'help', 'coffee']),
        sceneCaption: 'Wistful fragt leise nach etwas Wasser.',
        trophyWord: trophy('just', 'nur', 'Just some water.', 'Just hält die kleine Bitte um Wasser sanft und A1-natürlich.'),
        mediaCaption: 'Leises Glas Wasser, kleine Bitte, gedämpfte Stimmung.',
        songSeed: { genre: 'soft indie folk', mood: 'small quiet need' },
        visualNotes: 'Soft water glass, small hand gesture, quiet request.',
      }),
      sharp: createA1P6VariantInput({
        targetText: 'Water, please.',
        baseText: 'Wasser, bitte.',
        meaning: 'Eine kurze, höfliche Bitte.',
        chunks: [
          chunk('water', 'Water', 'Wasser'),
          chunk('please', 'please', 'bitte'),
        ],
        extraLessonItems: [
          chunk('rest', 'rest', 'Ruhe'),
          chunk('now', 'now', 'jetzt'),
          chunk('ready', 'ready', 'bereit'),
          chunk('safe', 'safe', 'sicher'),
        ],
        targetChips: ['Water,', 'please.'],
        distractors: ['Ticket,', 'Coffee,'],
        typeRecall: recall('', 'Water', ', please.', ['Water', 'Medicine', 'Ticket', 'Coffee']),
        sceneCaption: 'Sharp bittet kurz und klar um Wasser.',
        trophyWord: trophy('thirsty', 'durstig', 'I am thirsty.', 'Thirsty ist Sharps direkter Anker für die Wasserbitte.'),
        mediaCaption: 'Klares Glas Wasser, kurzer Satz, kontrollierter Ton.',
        songSeed: { genre: 'minimal synth pulse', mood: 'brief water ask' },
        visualNotes: 'Clean water glass, concise request, steady frame.',
      }),
    },
  },
  {
    slug: 'is-there-a-doctor',
    title: 'Is there a doctor?',
    situation: {
      en: 'You ask whether there is a doctor nearby.',
      de: 'Du fragst, ob ein Arzt in der Nähe ist.',
    },
    pedagogicalGoal: 'Ask for a doctor as a location/help question, without giving medical instructions.',
    variants: {
      bright: createA1P6VariantInput({
        targetText: 'Is there a doctor here?',
        baseText: 'Gibt es hier einen Arzt?',
        meaning: 'Eine einfache Frage nach ärztlicher Hilfe am Ort.',
        chunks: [
          chunk('is-there', 'Is there', 'gibt es'),
          chunk('a-doctor', 'a doctor', 'einen Arzt'),
          chunk('here', 'here', 'hier'),
        ],
        extraLessonItems: [
          chunk('nearby', 'nearby', 'in der Nähe'),
          chunk('doctor', 'doctor', 'Arzt'),
          chunk('help', 'help', 'Hilfe'),
          chunk('safe', 'safe', 'sicher'),
        ],
        targetChips: ['Is there', 'a doctor', 'here?'],
        distractors: ['pharmacy', 'ticket'],
        typeRecall: recall('Is there a ', 'doctor', ' here?', ['doctor', 'pharmacy', 'station', 'table']),
        sceneCaption: 'Bright fragt freundlich, ob hier ein Arzt erreichbar ist.',
        trophyWord: trophy('visit', 'Besuch', 'A doctor visit, please.', 'Visit macht die Frage nach dem Arzt konkret und ruhig.'),
        mediaCaption: 'Empfang oder Apotheke, Frage nach einem Arzt am Ort.',
        songSeed: { genre: 'light acoustic pop', mood: 'helpful doctor ask' },
        visualNotes: 'Reception counter, location ask, helpful tone.',
      }),
      wistful: createA1P6VariantInput({
        targetText: 'Could I find a doctor near here?',
        baseText: 'Kann ich hier in der Nähe einen Arzt finden?',
        meaning: 'Eine vorsichtige Frage nach einem Arzt in der Nähe.',
        chunks: [
          chunk('could-i-find', 'Could I find', 'kann ich finden'),
          chunk('a-doctor', 'a doctor', 'einen Arzt'),
          chunk('near-here', 'near here', 'hier in der Nähe'),
        ],
        extraLessonItems: [
          chunk('calm', 'calm', 'ruhig'),
          chunk('nearby', 'nearby', 'in der Nähe'),
          chunk('wait', 'wait', 'warten'),
          chunk('help', 'help', 'Hilfe'),
        ],
        targetChips: ['Could I find', 'a doctor', 'near here?'],
        distractors: ['tonight', 'coffee'],
        typeRecall: recall('Could I find a ', 'doctor', ' near here?', ['doctor', 'pharmacy', 'person', 'shop']),
        sceneCaption: 'Wistful fragt behutsam, ob ein Arzt in der Nähe ist.',
        trophyWord: trophy('find', 'finden', 'Could I find a doctor?', 'Find ist die ruhige A1-Suche nach Hilfe in der Nähe.'),
        mediaCaption: 'Gedämpfter Empfangsbereich, vorsichtige Frage nach Hilfe.',
        songSeed: { genre: 'soft indie folk', mood: 'careful help search' },
        visualNotes: 'Soft reception light, careful eye contact, calm cue.',
      }),
      sharp: createA1P6VariantInput({
        targetText: 'Doctor nearby?',
        baseText: 'Arzt in der Nähe?',
        meaning: 'Eine extrem kurze Frage nach einem Arzt.',
        chunks: [
          chunk('doctor', 'Doctor', 'Arzt'),
          chunk('nearby', 'nearby', 'in der Nähe'),
        ],
        extraLessonItems: [
          chunk('doctor', 'doctor', 'Arzt'),
          chunk('help', 'help', 'Hilfe'),
          chunk('urgent', 'urgent', 'dringend'),
          chunk('here', 'here', 'hier'),
        ],
        targetChips: ['Doctor', 'nearby?'],
        distractors: ['Ticket', 'Coffee'],
        typeRecall: recall('', 'Doctor', ' nearby?', ['Doctor', 'Pharmacy', 'Station', 'Shop']),
        sceneCaption: 'Sharp fragt knapp nach einem Arzt in der Nähe.',
        trophyWord: trophy('doctor', 'Arzt', 'Doctor nearby?', 'Doctor ist der direkte Suchbegriff in dieser Szene.'),
        mediaCaption: 'Klare Empfangsszene, kurze Frage nach einem Arzt.',
        songSeed: { genre: 'minimal synth pulse', mood: 'direct doctor ask' },
        visualNotes: 'Clean reception sign, direct question, sharp layout.',
      }),
    },
  },
  {
    slug: 'i-have-an-allergy',
    title: 'I have an allergy',
    situation: {
      en: 'You say that you have an allergy.',
      de: 'Du sagst, dass du eine Allergie hast.',
    },
    pedagogicalGoal: 'State an allergy simply, without details or medical advice.',
    variants: {
      bright: createA1P6VariantInput({
        targetText: 'Please, I have an allergy.',
        baseText: 'Bitte, ich habe eine Allergie.',
        meaning: 'Eine klare, höfliche Aussage, damit die andere Person Bescheid weiß.',
        chunks: [
          chunk('i-have', 'I have', 'ich habe'),
          chunk('an-allergy', 'an allergy', 'eine Allergie'),
        ],
        extraLessonItems: [
          chunk('clear', 'clear', 'klar'),
          chunk('allergy', 'allergy', 'Allergie'),
          chunk('careful', 'careful', 'vorsichtig'),
          chunk('safe', 'safe', 'sicher'),
        ],
        targetChips: ['Please,', 'I have', 'an allergy.'],
        distractors: ['a ticket', 'a receipt'],
        typeRecall: recall('Please, I have an ', 'allergy', '.', ['allergy', 'headache', 'ticket', 'reservation']),
        sceneCaption: 'Bright sagt freundlich und klar, dass er eine Allergie hat.',
        trophyWord: trophy('tell', 'sagen', 'Please tell the staff.', 'Tell macht Brights freundliche Offenlegung der Allergie konkret.'),
        mediaCaption: 'Apothekentresen, ruhige Aussage über eine Allergie.',
        songSeed: { genre: 'warm acoustic pop', mood: 'clear safety note' },
        visualNotes: 'Friendly counter, clear allergy cue, calm posture.',
      }),
      wistful: createA1P6VariantInput({
        targetText: 'A small allergy, sorry.',
        baseText: 'Eine kleine Allergie, Entschuldigung.',
        meaning: 'Eine sanfte kurze Aussage, ohne sie auszuschmücken.',
        chunks: [
          chunk('a-small', 'A small', 'eine kleine'),
          chunk('allergy', 'allergy', 'Allergie'),
          chunk('sorry', 'sorry', 'Entschuldigung'),
        ],
        extraLessonItems: [
          chunk('safe', 'safe', 'sicher'),
          chunk('careful', 'careful', 'vorsichtig'),
          chunk('clear', 'clear', 'klar'),
          chunk('wait', 'wait', 'warten'),
        ],
        targetChips: ['A small', 'allergy,', 'sorry.'],
        distractors: ['headache', 'ticket'],
        typeRecall: recall('A small ', 'allergy', ', sorry.', ['allergy', 'headache', 'problem', 'plan']),
        sceneCaption: 'Wistful nennt die Allergie vorsichtig und konkret.',
        trophyWord: trophy('tiny', 'klein', 'A tiny allergy.', 'Tiny hält die Allergie-Aussage vorsichtig und konkret.'),
        mediaCaption: 'Leise Apothekenszene, kleine Information, vorsichtiger Ton.',
        songSeed: { genre: 'soft indie folk', mood: 'gentle safety note' },
        visualNotes: 'Muted counter, slight pause, safe cue.',
      }),
      sharp: createA1P6VariantInput({
        targetText: 'Allergy.',
        baseText: 'Ich habe eine Allergie.',
        meaning: 'Ein einzelnes klares Wort, wenn es schnell sein muss.',
        chunks: [
          chunk('allergy', 'Allergy', 'Allergie'),
        ],
        extraLessonItems: [
          chunk('allergy', 'allergy', 'Allergie'),
          chunk('safe', 'safe', 'sicher'),
          chunk('clear', 'clear', 'klar'),
          chunk('careful', 'careful', 'vorsichtig'),
        ],
        targetChips: ['Allergy.'],
        distractors: ['Ticket.', 'Coffee.'],
        typeRecall: recall('', 'Allergy', '.', ['Allergy', 'Headache', 'Medicine', 'Ticket']),
        sceneCaption: 'Sharp nennt nur das wichtige Wort.',
        trophyWord: trophy('allergy', 'Allergie', 'Allergy.', 'Allergy ist das klare Kernwort in dieser Szene.'),
        mediaCaption: 'Minimaler Hinweis am Tresen, ein klares Wort im Fokus.',
        songSeed: { genre: 'minimal synth pulse', mood: 'single-word safety note' },
        visualNotes: 'Single-word cue, clean framing, direct context.',
      }),
    },
  },
  {
    slug: 'can-you-call-for-help',
    title: 'Can you call for help?',
    situation: {
      en: 'You ask someone to call for help.',
      de: 'Du bittest jemanden, Hilfe zu rufen.',
    },
    pedagogicalGoal: 'Ask another person to call for help without making an emergency claim.',
    variants: {
      bright: createA1P6VariantInput({
        targetText: 'Please get help for me.',
        baseText: 'Bitte holen Sie Hilfe für mich.',
        meaning: 'Eine höfliche Bitte, Hilfe zu holen.',
        chunks: [
          chunk('please-get', 'Please get', 'bitte holen'),
          chunk('help', 'help', 'Hilfe'),
          chunk('for-me', 'for me', 'für mich'),
        ],
        extraLessonItems: [
          chunk('calm', 'calm', 'ruhig'),
          chunk('help', 'help', 'Hilfe'),
          chunk('call', 'call', 'rufen'),
          chunk('wait', 'wait', 'warten'),
        ],
        targetChips: ['Please get', 'help', 'for me.'],
        distractors: ['pay by card', 'write it'],
        typeRecall: recall('Please get ', 'help', ' for me.', ['help', 'water', 'medicine', 'a ticket']),
        sceneCaption: 'Bright bittet ruhig darum, Hilfe zu rufen.',
        trophyWord: trophy('get', 'holen', 'Please get help.', 'Get macht die Bitte um Hilfe sofort konkret.'),
        mediaCaption: 'Person spricht eine andere Person an, klare Bitte um Hilfe.',
        songSeed: { genre: 'warm acoustic pop', mood: 'calm help call' },
        visualNotes: 'Helpful gesture, phone nearby, calm request.',
      }),
      wistful: createA1P6VariantInput({
        targetText: 'Could you call someone for help?',
        baseText: 'Könnten Sie jemanden um Hilfe rufen?',
        meaning: 'Eine vorsichtige Bitte an eine Person in der Nähe.',
        chunks: [
          chunk('could-you', 'Could you', 'Könnten Sie'),
          chunk('call-someone', 'call someone', 'jemanden rufen'),
          chunk('for-help', 'for help', 'um Hilfe'),
        ],
        extraLessonItems: [
          chunk('urgent', 'urgent', 'dringend'),
          chunk('help', 'help', 'Hilfe'),
          chunk('someone', 'someone', 'jemand'),
          chunk('careful', 'careful', 'vorsichtig'),
        ],
        targetChips: ['Could you', 'call someone', 'for help?'],
        distractors: ['tomorrow', 'coffee'],
        typeRecall: recall('Could you call someone for ', 'help', '?', ['help', 'water', 'money', 'coffee']),
        sceneCaption: 'Wistful bittet behutsam, jemanden für Hilfe zu rufen.',
        trophyWord: trophy('someone', 'jemand', 'Could you call someone?', 'Someone macht die leise Hilferufung konkret und menschlich.'),
        mediaCaption: 'Gedämpfter Flur, vorsichtige Bitte an eine Person mit Telefon.',
        songSeed: { genre: 'soft indie folk', mood: 'careful help call' },
        visualNotes: 'Soft phone cue, restrained concern, careful ask.',
      }),
      sharp: createA1P6VariantInput({
        targetText: 'Call for help, please.',
        baseText: 'Hilfe rufen, bitte.',
        meaning: 'Eine kurze, direkte Bitte um Hilfe.',
        chunks: [
          chunk('call', 'Call', 'rufen'),
          chunk('for-help', 'for help', 'um Hilfe'),
          chunk('please', 'please', 'bitte'),
        ],
        extraLessonItems: [
          chunk('helped', 'helped', 'geholfen'),
          chunk('phone', 'phone', 'Telefon'),
          chunk('clear', 'clear', 'klar'),
          chunk('now', 'now', 'jetzt'),
        ],
        targetChips: ['Call', 'for help,', 'please.'],
        distractors: ['Pay', 'Write'],
        typeRecall: recall('', 'Call for help', ', please.', ['Call for help', 'Write it down', 'Pay by card', 'Wait here']),
        sceneCaption: 'Sharp sagt die Bitte kurz und direkt.',
        trophyWord: trophy('rush', 'Eile', 'No rush.', 'Rush macht Sharps Tempo nach der Hilferufung greifbar.'),
        mediaCaption: 'Klarer Telefonmoment, direkte Bitte, keine zusätzliche Dramatik.',
        songSeed: { genre: 'minimal synth pulse', mood: 'direct help call' },
        visualNotes: 'Phone icon cue, direct phrase, controlled urgency.',
      }),
    },
  },
  {
    slug: 'i-feel-better-now',
    title: 'I feel better now',
    situation: {
      en: 'You say that you feel better now.',
      de: 'Du sagst, dass es dir jetzt besser geht.',
    },
    pedagogicalGoal: 'Close the interaction by saying you feel better now and thanking the other person.',
    variants: {
      bright: createA1P6VariantInput({
        targetText: 'I feel better now, thank you.',
        baseText: 'Mir geht es jetzt besser, danke.',
        meaning: 'Ein warmer Abschluss nach der kleinen Hilfe.',
        chunks: [
          chunk('i-feel', 'I feel', 'mir geht es'),
          chunk('better-now', 'better now', 'jetzt besser'),
          chunk('thank-you', 'thank you', 'danke'),
        ],
        extraLessonItems: [
          chunk('ready', 'ready', 'bereit'),
          chunk('better', 'better', 'besser'),
          chunk('thanks', 'thanks', 'danke'),
          chunk('safe', 'safe', 'sicher'),
        ],
        targetChips: ['I feel', 'better now,', 'thank you.'],
        distractors: ['late', 'lost'],
        typeRecall: recall('I feel ', 'better', ' now, thank you.', ['better', 'ready', 'safe', 'late']),
        sceneCaption: 'Bright bedankt sich und sagt, dass es ihm besser geht.',
        trophyWord: trophy('pleased', 'erfreut', 'Pleased to be okay.', 'Pleased schließt die Gesundheits-Szene mit warmer Erleichterung.'),
        mediaCaption: 'Freundlicher Abschluss am Tresen, Danke und entspannter Ausdruck.',
        songSeed: { genre: 'warm acoustic pop', mood: 'relieved close' },
        visualNotes: 'Warm thank-you, relaxed shoulders, better cue.',
      }),
      wistful: createA1P6VariantInput({
        targetText: 'I feel a little better now.',
        baseText: 'Mir geht es jetzt ein bisschen besser.',
        meaning: 'Ein vorsichtiger Abschluss: Es ist etwas besser.',
        chunks: [
          chunk('i-feel', 'I feel', 'mir geht es'),
          chunk('a-little-better', 'a little better', 'ein bisschen besser'),
          chunk('now', 'now', 'jetzt'),
        ],
        extraLessonItems: [
          chunk('better', 'better', 'besser'),
          chunk('calm', 'calm', 'ruhig'),
          chunk('ready', 'ready', 'bereit'),
          chunk('thanks', 'thanks', 'danke'),
        ],
        targetChips: ['I feel', 'a little better', 'now.'],
        distractors: ['lost', 'late'],
        typeRecall: recall('I feel a little ', 'better', ' now.', ['better', 'ready', 'safe', 'late']),
        sceneCaption: 'Wistful sagt vorsichtig, dass es jetzt ein bisschen besser ist.',
        trophyWord: trophy('better', 'besser', 'I feel better now.', 'Better schließt die kleine Gesundheits-Szene einfach ab.'),
        mediaCaption: 'Ruhige Abschlussszene, kleines Danke, sichtbare Entspannung.',
        songSeed: { genre: 'soft indie folk', mood: 'quiet relief' },
        visualNotes: 'Soft relief, small nod, better-now cue.',
      }),
      sharp: createA1P6VariantInput({
        targetText: "I'm okay now. Thank you.",
        baseText: 'Es ist jetzt okay. Danke.',
        meaning: 'Ein knapper Abschluss mit Dank.',
        chunks: [
          chunk('im-okay-now', "I'm okay now", 'es ist jetzt okay'),
          chunk('thank-you', 'Thank you', 'danke'),
        ],
        extraLessonItems: [
          chunk('calm', 'calm', 'ruhig'),
          chunk('ready', 'ready', 'bereit'),
          chunk('clear', 'clear', 'klar'),
          chunk('safe', 'safe', 'sicher'),
        ],
        targetChips: ["I'm okay now.", 'Thank you.'],
        distractors: ['Late now.', 'Lost now.'],
        typeRecall: recall("I'm ", 'okay now', '. Thank you.', ['okay now', 'ready now', 'safe now', 'late now']),
        sceneCaption: 'Sharp beendet die Szene knapp: besser jetzt, danke.',
        trophyWord: trophy('now', 'jetzt', "I'm okay now.", 'Now hält den Abschluss präsent und klar.'),
        mediaCaption: 'Sachlicher Abschluss, kurzer Dank, entspannter Stand.',
        songSeed: { genre: 'minimal synth pulse', mood: 'brief relieved close' },
        visualNotes: 'Clean close, direct thanks, calm final cue.',
      }),
    },
  },
]

const a1Practical6Lessons: GuidedLessonDefinition[] = a1Practical6Inputs.map((lessonInput, index) => {
  const lessonNumber = index + 1
  const id = `english-a1-practical-6-${String(lessonNumber).padStart(3, '0')}-${lessonInput.slug}`
  const nextInput = a1Practical6Inputs[index + 1]

  return {
    id,
    pathId: GUIDED_TODAY_PATH_SIX_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_SIX_METADATA.title,
    level: GUIDED_TODAY_PATH_SIX_METADATA.level,
    lessonNumber,
    baseLanguage: GUIDED_TODAY_PATH_SIX_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_SIX_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_SIX_METADATA,
    lessonMetadata: {
      id,
      sequence: lessonNumber,
      title: lessonInput.title,
    },
    title: lessonInput.title,
    situation: lessonInput.situation,
    pedagogicalGoal: lessonInput.pedagogicalGoal,
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: nextInput?.title ?? 'Path complete',
      situation: nextInput?.situation.de ?? 'Du hast English A1 P6 abgeschlossen.',
    },
    vibeVariants: {
      bright: createA1P2Variant(lessonInput.variants.bright),
      wistful: createA1P2Variant(lessonInput.variants.wistful),
      sharp: createA1P2Variant(lessonInput.variants.sharp),
    },
  }
})

type A1P7LessonInput = A1P2LessonInput

const a1Practical7Inputs: A1P7LessonInput[] = [
  {
    slug: 'i-need-a-ticket',
    title: 'I need a ticket',
    situation: {
      en: 'At a station counter, you ask for one ticket.',
      de: 'Am Schalter am Bahnhof bittest du um eine Fahrkarte.',
    },
    pedagogicalGoal: 'Ask for a ticket with short, polite travel language.',
    variants: {
      bright: createA1P7VariantInput({
        targetText: 'I need a ticket, please.',
        baseText: 'Ich brauche eine Fahrkarte, bitte.',
        meaning: 'Eine freundliche, klare Bitte am Schalter.',
        chunks: [
          chunk('i-need', 'I need', 'ich brauche'),
          chunk('a-ticket', 'a ticket', 'eine Fahrkarte'),
          chunk('please', 'please', 'bitte'),
        ],
        extraLessonItems: [
          chunk('ticket', 'ticket', 'Fahrkarte'),
          chunk('station', 'station', 'Bahnhof'),
          chunk('help', 'help', 'Hilfe'),
          chunk('ready', 'ready', 'bereit'),
        ],
        targetChips: ['I need', 'a ticket,', 'please.'],
        distractors: ['a taxi', 'water'],
        typeRecall: recall('I need a ', 'ticket', ', please.', ['ticket', 'taxi', 'bus', 'receipt']),
        sceneCaption: 'Bright bittet offen und freundlich um eine Fahrkarte.',
        trophyWord: trophy('ticket', 'Fahrkarte', 'I need a ticket.', 'Ticket ist der praktische Anker am Schalter.'),
        mediaCaption: 'Heller Bahnhofsschalter, eine Person bittet freundlich um eine Fahrkarte.',
        songSeed: { genre: 'warm acoustic pop', mood: 'friendly ticket ask' },
        visualNotes: 'Station counter, open posture, ticket cue.',
      }),
      wistful: createA1P7VariantInput({
        targetText: 'Could I have one ticket?',
        baseText: 'Könnte ich eine Fahrkarte haben?',
        meaning: 'Eine vorsichtige Bitte um eine einzelne Fahrkarte.',
        chunks: [
          chunk('could-i-have', 'Could I have', 'könnte ich haben'),
          chunk('one-ticket', 'one ticket', 'eine Fahrkarte'),
        ],
        extraLessonItems: [
          chunk('help', 'help', 'Hilfe'),
          chunk('one', 'one', 'eins'),
          chunk('please', 'please', 'bitte'),
          chunk('careful', 'careful', 'vorsichtig'),
        ],
        targetChips: ['Could I have', 'one ticket?'],
        distractors: ['two taxis', 'some water'],
        typeRecall: recall('Could I have one ', 'ticket', '?', ['ticket', 'taxi', 'bus', 'menu']),
        sceneCaption: 'Wistful fragt leise nach einer Fahrkarte.',
        trophyWord: trophy('help', 'Hilfe', 'Help with a ticket, please.', 'Help passt zur vorsichtigen Frage am Schalter.'),
        mediaCaption: 'Ruhiger Bahnhofsschalter, eine kurze Frage mit vorsichtigem Blick.',
        songSeed: { genre: 'soft indie folk', mood: 'careful ticket ask' },
        visualNotes: 'Muted station light, small pause, one-ticket cue.',
      }),
      sharp: createA1P7VariantInput({
        targetText: 'One ticket, please.',
        baseText: 'Eine Fahrkarte, bitte.',
        meaning: 'Eine knappe, höfliche Bitte am Schalter.',
        chunks: [
          chunk('one-ticket', 'One ticket', 'eine Fahrkarte'),
          chunk('please', 'please', 'bitte'),
        ],
        extraLessonItems: [
          chunk('ready', 'ready', 'bereit'),
          chunk('ticket', 'ticket', 'Fahrkarte'),
          chunk('clear', 'clear', 'klar'),
          chunk('station', 'station', 'Bahnhof'),
        ],
        targetChips: ['One ticket,', 'please.'],
        distractors: ['One taxi', 'Water'],
        typeRecall: recall('One ', 'ticket', ', please.', ['ticket', 'taxi', 'bus', 'receipt']),
        sceneCaption: 'Sharp bleibt kurz, höflich und verständlich.',
        trophyWord: trophy('one', 'einen', 'One ticket, please.', 'One macht die kurze Bitte am Schalter eindeutig.'),
        mediaCaption: 'Klarer Bahnhofsschalter, kurzer Satz, Ticket im Fokus.',
        songSeed: { genre: 'minimal synth pulse', mood: 'direct ticket ask' },
        visualNotes: 'Clean counter line, direct phrase, ticket focus.',
      }),
    },
  },
  {
    slug: 'where-is-the-bus',
    title: 'Where is the bus?',
    situation: {
      en: 'Near a station, you ask where the bus is.',
      de: 'In der Nähe vom Bahnhof fragst du, wo der Bus ist.',
    },
    pedagogicalGoal: 'Ask for the bus or bus stop with simple location language.',
    variants: {
      bright: createA1P7VariantInput({
        targetText: 'Where is the bus stop?',
        baseText: 'Wo ist die Bushaltestelle?',
        meaning: 'Eine offene Frage nach der Haltestelle.',
        chunks: [
          chunk('where-is', 'Where is', 'wo ist'),
          chunk('the-bus-stop', 'the bus stop', 'die Bushaltestelle'),
        ],
        extraLessonItems: [
          chunk('bus', 'bus', 'Bus'),
          chunk('nearby', 'nearby', 'in der Nähe'),
          chunk('where', 'where', 'wo'),
          chunk('here', 'here', 'hier'),
        ],
        targetChips: ['Where is', 'the bus stop?'],
        distractors: ['the taxi?', 'the bill?'],
        typeRecall: recall('Where is the ', 'bus stop', '?', ['bus stop', 'station', 'taxi', 'counter']),
        sceneCaption: 'Bright fragt freundlich nach der Bushaltestelle.',
        trophyWord: trophy('bus', 'Bus', 'Where is the bus?', 'Bus ist der zentrale Reiseanker in der Szene.'),
        mediaCaption: 'Bahnhofsnähe mit Haltestellenschild, freundliche Wegfrage.',
        songSeed: { genre: 'light acoustic pop', mood: 'friendly bus search' },
        visualNotes: 'Bus stop sign, open gesture, station edge.',
      }),
      wistful: createA1P7VariantInput({
        targetText: 'Where can I find the bus?',
        baseText: 'Wo finde ich den Bus?',
        meaning: 'Eine vorsichtige Frage, wenn du dich orientierst.',
        chunks: [
          chunk('where-can-i-find', 'Where can I find', 'wo finde ich'),
          chunk('the-bus', 'the bus', 'den Bus'),
        ],
        extraLessonItems: [
          chunk('nearby', 'nearby', 'in der Nähe'),
          chunk('help', 'help', 'Hilfe'),
          chunk('slowly', 'slowly', 'langsam'),
          chunk('station', 'station', 'Bahnhof'),
        ],
        targetChips: ['Where can I find', 'the bus?'],
        distractors: ['the café?', 'my water?'],
        typeRecall: recall('Where can I find the ', 'bus', '?', ['bus', 'taxi', 'train', 'shop']),
        sceneCaption: 'Wistful fragt ruhig, wo der Bus zu finden ist.',
        trophyWord: trophy('somewhere', 'irgendwo', 'Somewhere close?', 'Somewhere passt zur leisen Ortsfrage ohne sichere Stelle.'),
        mediaCaption: 'Gedämpfte Bahnhofsnähe, suchender Blick, Bus-Schild im Hintergrund.',
        songSeed: { genre: 'soft indie folk', mood: 'careful bus search' },
        visualNotes: 'Soft station light, searching posture, nearby cue.',
      }),
      sharp: createA1P7VariantInput({
        targetText: 'Please show me the bus.',
        baseText: 'Bitte zeigen Sie mir den Bus.',
        meaning: 'Eine direkte Bitte, den Bus zu zeigen.',
        chunks: [
          chunk('please-show-me', 'Please show me', 'bitte zeigen Sie mir'),
          chunk('the-bus', 'the bus', 'den Bus'),
        ],
        extraLessonItems: [
          chunk('where', 'where', 'wo'),
          chunk('bus', 'bus', 'Bus'),
          chunk('clear', 'clear', 'klar'),
          chunk('right', 'right', 'richtig'),
        ],
        targetChips: ['Please show me', 'the bus.'],
        distractors: ['the bill', 'the tea'],
        typeRecall: recall('Please show me the ', 'bus', '.', ['bus', 'taxi', 'train', 'menu']),
        sceneCaption: 'Sharp bittet klar darum, den Bus zu zeigen.',
        trophyWord: trophy('where', 'wo', 'Where is the bus?', 'Where bleibt der klare Ortsanker.'),
        mediaCaption: 'Klares Haltestellenschild, direkte Bitte, ruhige Haltung.',
        songSeed: { genre: 'minimal synth pulse', mood: 'direct bus search' },
        visualNotes: 'Sharp bus sign, direct pointing cue, concise ask.',
      }),
    },
  },
  {
    slug: 'what-time-does-it-leave',
    title: 'What time does it leave?',
    situation: {
      en: 'You ask when the bus or train leaves.',
      de: 'Du fragst, wann der Bus oder Zug abfährt.',
    },
    pedagogicalGoal: 'Ask about a simple departure time without planning a full trip.',
    variants: {
      bright: createA1P7VariantInput({
        targetText: 'What time does the bus leave?',
        baseText: 'Um wie viel Uhr fährt der Bus ab?',
        meaning: 'Eine klare Frage nach der Abfahrtszeit.',
        chunks: [
          chunk('what-time', 'What time', 'um wie viel Uhr'),
          chunk('does-the-bus', 'does the bus', 'fährt der Bus'),
          chunk('leave', 'leave', 'ab'),
        ],
        extraLessonItems: [
          chunk('leave', 'leave', 'abfahren'),
          chunk('time', 'time', 'Uhrzeit'),
          chunk('bus', 'bus', 'Bus'),
          chunk('wait', 'wait', 'warten'),
        ],
        targetChips: ['What time', 'does the bus', 'leave?'],
        distractors: ['arrive?', 'cost?'],
        typeRecall: recall('What time does the bus ', 'leave', '?', ['leave', 'arrive', 'stop', 'wait']),
        sceneCaption: 'Bright fragt freundlich, wann der Bus abfährt.',
        trophyWord: trophy('leave', 'abfahren', 'What time does it leave?', 'Leave ist der einfache Anker für Abfahrt.'),
        mediaCaption: 'Bahnhofsanzeige im Hintergrund, kurze Frage nach der Uhrzeit.',
        songSeed: { genre: 'warm acoustic pop', mood: 'clear time ask' },
        visualNotes: 'Clock, bus sign, friendly departure question.',
      }),
      wistful: createA1P7VariantInput({
        targetText: 'When does it leave?',
        baseText: 'Wann fährt es ab?',
        meaning: 'Eine kurze, vorsichtige Zeitfrage.',
        chunks: [
          chunk('when-does', 'When does', 'wann'),
          chunk('it-leave', 'it leave', 'fährt es ab'),
        ],
        extraLessonItems: [
          chunk('time', 'time', 'Uhrzeit'),
          chunk('slowly', 'slowly', 'langsam'),
          chunk('wait', 'wait', 'warten'),
          chunk('clear', 'clear', 'klar'),
        ],
        targetChips: ['When does', 'it leave?'],
        distractors: ['it stop?', 'we pay?'],
        typeRecall: recall('When does it ', 'leave', '?', ['leave', 'arrive', 'stop', 'take']),
        sceneCaption: 'Wistful hält die Zeitfrage sehr kurz.',
        trophyWord: trophy('when', 'wann', 'When does it leave?', 'When ist Wistfuls leise Zeitfrage in einem Wort.'),
        mediaCaption: 'Ruhiger Bahnsteig, Blick zur Uhr, kurze Frage.',
        songSeed: { genre: 'soft indie folk', mood: 'careful time ask' },
        visualNotes: 'Soft station clock, small pause, time cue.',
      }),
      sharp: createA1P7VariantInput({
        targetText: 'Please tell me the time.',
        baseText: 'Bitte sagen Sie mir die Uhrzeit.',
        meaning: 'Eine direkte Bitte um die Zeit.',
        chunks: [
          chunk('please-tell-me', 'Please tell me', 'bitte sagen Sie mir'),
          chunk('the-time', 'the time', 'die Uhrzeit'),
        ],
        extraLessonItems: [
          chunk('clear', 'clear', 'klar'),
          chunk('time', 'time', 'Uhrzeit'),
          chunk('ready', 'ready', 'bereit'),
          chunk('wait', 'wait', 'warten'),
        ],
        targetChips: ['Please tell me', 'the time.'],
        distractors: ['the ticket', 'the table'],
        typeRecall: recall('Please tell me the ', 'time', '.', ['time', 'station', 'ticket', 'menu']),
        sceneCaption: 'Sharp fragt direkt nach der Uhrzeit.',
        trophyWord: trophy('minute', 'Minute', 'In a minute.', 'Minute hilft beim genauen Nachfragen zur Abfahrtszeit.'),
        mediaCaption: 'Klare Uhranzeige, kurzer Blick, sachliche Frage.',
        songSeed: { genre: 'minimal synth pulse', mood: 'direct time ask' },
        visualNotes: 'Clock detail, clean frame, direct time cue.',
      }),
    },
  },
  {
    slug: 'is-this-the-right-train',
    title: 'Is this the right train?',
    situation: {
      en: 'You check if this is the right train.',
      de: 'Du prüfst, ob das der richtige Zug ist.',
    },
    pedagogicalGoal: 'Confirm the right vehicle with a short A1 question.',
    variants: {
      bright: createA1P7VariantInput({
        targetText: 'Is this the right train?',
        baseText: 'Ist das der richtige Zug?',
        meaning: 'Eine klare Frage, bevor du einsteigst.',
        chunks: [
          chunk('is-this', 'Is this', 'ist das'),
          chunk('the-right', 'the right', 'der richtige'),
          chunk('train', 'train', 'Zug'),
        ],
        extraLessonItems: [
          chunk('train', 'train', 'Zug'),
          chunk('right', 'right', 'richtig'),
          chunk('station', 'station', 'Bahnhof'),
          chunk('clear', 'clear', 'klar'),
        ],
        targetChips: ['Is this', 'the right', 'train?'],
        distractors: ['bus?', 'table?'],
        typeRecall: recall('Is this the right ', 'train', '?', ['train', 'bus', 'taxi', 'shop']),
        sceneCaption: 'Bright prüft freundlich, ob es der richtige Zug ist.',
        trophyWord: trophy('train', 'Zug', 'Is this the right train?', 'Train ist der Kern der Frage.'),
        mediaCaption: 'Bahnsteig mit Zug, freundliche Rückfrage vor dem Einsteigen.',
        songSeed: { genre: 'light acoustic pop', mood: 'friendly train check' },
        visualNotes: 'Train doors, open question, right-train cue.',
      }),
      wistful: createA1P7VariantInput({
        targetText: 'Is this my train?',
        baseText: 'Ist das mein Zug?',
        meaning: 'Eine vorsichtige Frage, ob dieser Zug deiner ist.',
        chunks: [
          chunk('is-this', 'Is this', 'ist das'),
          chunk('my-train', 'my train', 'mein Zug'),
        ],
        extraLessonItems: [
          chunk('right', 'right', 'richtig'),
          chunk('careful', 'careful', 'vorsichtig'),
          chunk('wait', 'wait', 'warten'),
          chunk('help', 'help', 'Hilfe'),
        ],
        targetChips: ['Is this', 'my train?'],
        distractors: ['wrong bus?', 'good café?'],
        typeRecall: recall('Is this my ', 'train', '?', ['train', 'bus', 'taxi', 'street']),
        sceneCaption: 'Wistful fragt vorsichtig, ob das der eigene Zug ist.',
        trophyWord: trophy('right', 'richtig', 'Is this right?', 'Right hilft bei einfachen Bestätigungsfragen.'),
        mediaCaption: 'Gedämpfter Bahnsteig, kurzer Moment vor dem Einstieg.',
        songSeed: { genre: 'soft indie folk', mood: 'careful train check' },
        visualNotes: 'Soft platform light, cautious glance, right cue.',
      }),
      sharp: createA1P7VariantInput({
        targetText: 'Is this train correct?',
        baseText: 'Ist dieser Zug richtig?',
        meaning: 'Eine direkte Kontrollfrage.',
        chunks: [
          chunk('is-this-train', 'Is this train', 'ist dieser Zug'),
          chunk('correct', 'correct', 'richtig'),
        ],
        extraLessonItems: [
          chunk('careful', 'careful', 'vorsichtig'),
          chunk('clear', 'clear', 'klar'),
          chunk('train', 'train', 'Zug'),
          chunk('station', 'station', 'Bahnhof'),
        ],
        targetChips: ['Is this train', 'correct?'],
        distractors: ['late?', 'open?'],
        typeRecall: recall('Is this train ', 'correct', '?', ['correct', 'late', 'open', 'nearby']),
        sceneCaption: 'Sharp prüft den Zug kurz und direkt.',
        trophyWord: trophy('correct', 'richtig', 'Is this correct?', 'Correct ist Sharps direkte Kontrollfrage vor dem Einsteigen.'),
        mediaCaption: 'Klarer Zug am Bahnsteig, direkte Rückfrage, ruhige Haltung.',
        songSeed: { genre: 'minimal synth pulse', mood: 'direct train check' },
        visualNotes: 'Clean train line, concise check, composed posture.',
      }),
    },
  },
  {
    slug: 'i-need-a-taxi',
    title: 'I need a taxi',
    situation: {
      en: 'You ask for a taxi after checking your travel option.',
      de: 'Du fragst nach einem Taxi, nachdem du deine Fahrt klärst.',
    },
    pedagogicalGoal: 'Ask for or request a taxi with practical A1 wording.',
    variants: {
      bright: createA1P7VariantInput({
        targetText: 'I need a taxi, please.',
        baseText: 'Ich brauche ein Taxi, bitte.',
        meaning: 'Eine freundliche Bitte um ein Taxi.',
        chunks: [
          chunk('i-need', 'I need', 'ich brauche'),
          chunk('a-taxi', 'a taxi', 'ein Taxi'),
          chunk('please', 'please', 'bitte'),
        ],
        extraLessonItems: [
          chunk('taxi', 'taxi', 'Taxi'),
          chunk('help', 'help', 'Hilfe'),
          chunk('there', 'there', 'dorthin'),
          chunk('station', 'station', 'Bahnhof'),
        ],
        targetChips: ['I need', 'a taxi,', 'please.'],
        distractors: ['a ticket', 'tea'],
        typeRecall: recall('I need a ', 'taxi', ', please.', ['taxi', 'ticket', 'bus', 'receipt']),
        sceneCaption: 'Bright bittet freundlich um ein Taxi.',
        trophyWord: trophy('taxi', 'Taxi', 'I need a taxi.', 'Taxi ist der klare Reiseanker der Szene.'),
        mediaCaption: 'Taxistand am Bahnhof, freundliche Bitte um ein Taxi.',
        songSeed: { genre: 'warm acoustic pop', mood: 'friendly taxi request' },
        visualNotes: 'Taxi stand, open hand, practical request.',
      }),
      wistful: createA1P7VariantInput({
        targetText: 'Could you call a taxi?',
        baseText: 'Könnten Sie ein Taxi rufen?',
        meaning: 'Eine vorsichtige Bitte, ein Taxi zu rufen.',
        chunks: [
          chunk('could-you-call', 'Could you call', 'könnten Sie rufen'),
          chunk('a-taxi', 'a taxi', 'ein Taxi'),
        ],
        extraLessonItems: [
          chunk('careful', 'careful', 'vorsichtig'),
          chunk('help', 'help', 'Hilfe'),
          chunk('phone', 'phone', 'Telefon'),
          chunk('wait', 'wait', 'warten'),
        ],
        targetChips: ['Could you call', 'a taxi?'],
        distractors: ['a doctor?', 'the bill?'],
        typeRecall: recall('Could you call a ', 'taxi', '?', ['taxi', 'bus', 'train', 'shop']),
        sceneCaption: 'Wistful bittet vorsichtig darum, ein Taxi zu rufen.',
        trophyWord: trophy('call', 'rufen', 'Could you call a taxi?', 'Call ist die konkrete Aktion in der vorsichtigen Bitte.'),
        mediaCaption: 'Ruhiger Eingang, Telefon in der Nähe, vorsichtige Bitte.',
        songSeed: { genre: 'soft indie folk', mood: 'careful taxi request' },
        visualNotes: 'Soft doorway, phone cue, cautious request.',
      }),
      sharp: createA1P7VariantInput({
        targetText: 'Please call a taxi.',
        baseText: 'Bitte rufen Sie ein Taxi.',
        meaning: 'Eine direkte, höfliche Bitte.',
        chunks: [
          chunk('please-call', 'Please call', 'bitte rufen Sie'),
          chunk('a-taxi', 'a taxi', 'ein Taxi'),
        ],
        extraLessonItems: [
          chunk('please', 'please', 'bitte'),
          chunk('taxi', 'taxi', 'Taxi'),
          chunk('ready', 'ready', 'bereit'),
          chunk('clear', 'clear', 'klar'),
        ],
        targetChips: ['Please call', 'a taxi.'],
        distractors: ['a bus', 'the menu'],
        typeRecall: recall('Please call a ', 'taxi', '.', ['taxi', 'train', 'doctor', 'shop']),
        sceneCaption: 'Sharp bittet klar und höflich um ein Taxi.',
        trophyWord: trophy('please', 'bitte', 'Please call a taxi.', 'Please hält die direkte Bitte menschlich.'),
        mediaCaption: 'Klarer Taxistand, sachliche Bitte, keine Eile im Ton.',
        songSeed: { genre: 'minimal synth pulse', mood: 'direct taxi request' },
        visualNotes: 'Taxi icon, concise request, composed frame.',
      }),
    },
  },
  {
    slug: 'can-we-go-there',
    title: 'Can we go there?',
    situation: {
      en: 'You confirm that you can go to the place.',
      de: 'Du bestätigst, dass ihr zu dem Ort fahren könnt.',
    },
    pedagogicalGoal: 'Confirm a simple destination without route-planning detail.',
    variants: {
      bright: createA1P7VariantInput({
        targetText: 'Can we go there?',
        baseText: 'Können wir dorthin fahren?',
        meaning: 'Eine kurze Frage zum Ziel.',
        chunks: [
          chunk('can-we-go', 'Can we go', 'können wir fahren'),
          chunk('there', 'there', 'dorthin'),
        ],
        extraLessonItems: [
          chunk('there', 'there', 'dorthin'),
          chunk('station', 'station', 'Bahnhof'),
          chunk('taxi', 'taxi', 'Taxi'),
          chunk('ready', 'ready', 'bereit'),
        ],
        targetChips: ['Can we go', 'there?'],
        distractors: ['now open?', 'by card?'],
        typeRecall: recall('Can we go ', 'there', '?', ['there', 'nearby', 'slowly', 'ready']),
        sceneCaption: 'Bright fragt offen, ob ihr dorthin fahren könnt.',
        trophyWord: trophy('there', 'dorthin', 'Can we go there?', 'There hält das Ziel einfach.'),
        mediaCaption: 'Innenraum eines Taxis, freundliche Frage zum Ziel.',
        songSeed: { genre: 'light acoustic pop', mood: 'friendly destination check' },
        visualNotes: 'Taxi interior, destination gesture, warm tone.',
      }),
      wistful: createA1P7VariantInput({
        targetText: 'Could we go there slowly?',
        baseText: 'Könnten wir langsam dorthin fahren?',
        meaning: 'Eine sanfte Bitte zum Ziel mit ruhigem Tempo.',
        chunks: [
          chunk('could-we-go', 'Could we go', 'könnten wir fahren'),
          chunk('there', 'there', 'dorthin'),
          chunk('slowly', 'slowly', 'langsam'),
        ],
        extraLessonItems: [
          chunk('please', 'please', 'bitte'),
          chunk('there', 'there', 'dorthin'),
          chunk('slowly', 'slowly', 'langsam'),
          chunk('careful', 'careful', 'vorsichtig'),
        ],
        targetChips: ['Could we go', 'there', 'slowly?'],
        distractors: ['tomorrow', 'by train'],
        typeRecall: recall('Could we go there ', 'slowly', '?', ['slowly', 'there', 'home', 'nearby']),
        sceneCaption: 'Wistful bittet ruhig darum, langsam dorthin zu fahren.',
        trophyWord: trophy('wish', 'Wunsch', 'A small wish.', 'Wish trägt Wistfuls leise, vorsichtige Bitte.'),
        mediaCaption: 'Gedämpfter Fahrgastraum, vorsichtige Frage zum Ziel.',
        songSeed: { genre: 'soft indie folk', mood: 'gentle destination ask' },
        visualNotes: 'Soft car light, small map cue, gentle request.',
      }),
      sharp: createA1P7VariantInput({
        targetText: 'Can you take me there?',
        baseText: 'Können Sie mich dorthin bringen?',
        meaning: 'Eine direkte Frage an den Fahrer.',
        chunks: [
          chunk('can-you-take', 'Can you take', 'können Sie bringen'),
          chunk('me-there', 'me there', 'mich dorthin'),
        ],
        extraLessonItems: [
          chunk('take', 'take', 'bringen'),
          chunk('there', 'there', 'dorthin'),
          chunk('clear', 'clear', 'klar'),
          chunk('ready', 'ready', 'bereit'),
        ],
        targetChips: ['Can you take', 'me there?'],
        distractors: ['call me?', 'show tea?'],
        typeRecall: recall('Can you ', 'take me there', '?', ['take me there', 'call me', 'show me', 'wait here']),
        sceneCaption: 'Sharp fragt direkt, ob der Fahrer dich dorthin bringt.',
        trophyWord: trophy('take', 'bringen', 'Can you take me there?', 'Take ist hier der praktische Fahr-Anker.'),
        mediaCaption: 'Klarer Blick zum Fahrer, direkte Zielfrage.',
        songSeed: { genre: 'minimal synth pulse', mood: 'direct destination ask' },
        visualNotes: 'Driver view, concise destination cue, steady posture.',
      }),
    },
  },
  {
    slug: 'please-stop-here',
    title: 'Please stop here',
    situation: {
      en: 'In a vehicle, you ask the driver to stop here.',
      de: 'Im Fahrzeug bittest du den Fahrer, hier zu halten.',
    },
    pedagogicalGoal: 'Ask to stop at the current place with polite, simple language.',
    variants: {
      bright: createA1P7VariantInput({
        targetText: 'Please stop here.',
        baseText: 'Bitte halten Sie hier.',
        meaning: 'Eine einfache, höfliche Bitte zum Anhalten.',
        chunks: [
          chunk('please-stop', 'Please stop', 'bitte halten Sie'),
          chunk('here', 'here', 'hier'),
        ],
        extraLessonItems: [
          chunk('stop', 'stop', 'halten'),
          chunk('here', 'here', 'hier'),
          chunk('taxi', 'taxi', 'Taxi'),
          chunk('thanks', 'thanks', 'danke'),
        ],
        targetChips: ['Please stop', 'here.'],
        distractors: ['there', 'later'],
        typeRecall: recall('Please ', 'stop', ' here.', ['stop', 'wait', 'go', 'leave']),
        sceneCaption: 'Bright bittet freundlich, hier zu halten.',
        trophyWord: trophy('stop', 'halten', 'Please stop here.', 'Stop ist der klare Bewegungsanker.'),
        mediaCaption: 'Taxi hält am Straßenrand, höfliche Bitte zum Anhalten.',
        songSeed: { genre: 'warm acoustic pop', mood: 'polite stop request' },
        visualNotes: 'Curbside stop, friendly hand cue, stop here.',
      }),
      wistful: createA1P7VariantInput({
        targetText: 'Could we stop here?',
        baseText: 'Könnten wir hier halten?',
        meaning: 'Eine vorsichtige Frage zum Anhalten.',
        chunks: [
          chunk('could-we-stop', 'Could we stop', 'könnten wir halten'),
          chunk('here', 'here', 'hier'),
        ],
        extraLessonItems: [
          chunk('here', 'here', 'hier'),
          chunk('wait', 'wait', 'warten'),
          chunk('careful', 'careful', 'vorsichtig'),
          chunk('clear', 'clear', 'klar'),
        ],
        targetChips: ['Could we stop', 'here?'],
        distractors: ['go there?', 'pay now?'],
        typeRecall: recall('Could we ', 'stop', ' here?', ['stop', 'wait', 'leave', 'arrive']),
        sceneCaption: 'Wistful fragt behutsam, ob ihr hier halten könnt.',
        trophyWord: trophy('curb', 'Bordstein', 'Stop at the curb.', 'Curb macht Wistfuls Halte-Bitte konkret und greifbar.'),
        mediaCaption: 'Gedämpfter Fahrgastraum, vorsichtige Bitte zum Halt.',
        songSeed: { genre: 'soft indie folk', mood: 'careful stop request' },
        visualNotes: 'Soft window light, quiet stop cue, here marker.',
      }),
      sharp: createA1P7VariantInput({
        targetText: 'Stop at this place, please.',
        baseText: 'Halten Sie bitte an diesem Ort.',
        meaning: 'Eine direkte Bitte mit höflichem Abschluss.',
        chunks: [
          chunk('stop-at', 'Stop at', 'halten Sie an'),
          chunk('this-place', 'this place', 'diesem Ort'),
          chunk('please', 'please', 'bitte'),
        ],
        extraLessonItems: [
          chunk('wait', 'wait', 'warten'),
          chunk('stop', 'stop', 'halten'),
          chunk('here', 'here', 'hier'),
          chunk('careful', 'careful', 'vorsichtig'),
        ],
        targetChips: ['Stop at', 'this place,', 'please.'],
        distractors: ['Go to', 'the station'],
        typeRecall: recall('', 'Stop', ' at this place, please.', ['Stop', 'Wait', 'Go', 'Leave']),
        sceneCaption: 'Sharp sagt die Bitte direkt und höflich.',
        trophyWord: trophy('park', 'parken', 'Park here, please.', 'Park macht Sharps Halte-Bitte greifbar im Stadtraum.'),
        mediaCaption: 'Klarer Straßenrand, kurze Bitte, kontrollierter Ton.',
        songSeed: { genre: 'minimal synth pulse', mood: 'direct stop request' },
        visualNotes: 'Curb line, concise stop phrase, composed frame.',
      }),
    },
  },
  {
    slug: 'i-am-going-to-the-station',
    title: 'I am going to the station',
    situation: {
      en: 'You say that you are going to the station.',
      de: 'Du sagst, dass du zum Bahnhof fährst.',
    },
    pedagogicalGoal: 'State a simple travel destination with a common A1 chunk.',
    variants: {
      bright: createA1P7VariantInput({
        targetText: 'I am going to the station.',
        baseText: 'Ich fahre zum Bahnhof.',
        meaning: 'Eine einfache Aussage über dein Ziel.',
        chunks: [
          chunk('i-am-going', 'I am going', 'ich fahre'),
          chunk('to-the-station', 'to the station', 'zum Bahnhof'),
        ],
        extraLessonItems: [
          chunk('station', 'station', 'Bahnhof'),
          chunk('there', 'there', 'dorthin'),
          chunk('train', 'train', 'Zug'),
          chunk('ready', 'ready', 'bereit'),
        ],
        targetChips: ['I am going', 'to the station.'],
        distractors: ['from the café', 'by card'],
        typeRecall: recall('I am going to the ', 'station', '.', ['station', 'taxi', 'bus', 'shop']),
        sceneCaption: 'Bright sagt freundlich, dass der Bahnhof das Ziel ist.',
        trophyWord: trophy('station', 'Bahnhof', 'I am going to the station.', 'Station ist der praktische Zielanker.'),
        mediaCaption: 'Bahnhofsschild, eine Person nennt ruhig das Ziel.',
        songSeed: { genre: 'light acoustic pop', mood: 'friendly station destination' },
        visualNotes: 'Station sign, simple route cue, warm posture.',
      }),
      wistful: createA1P7VariantInput({
        targetText: 'Could we go slowly to the station?',
        baseText: 'Könnten wir langsam zum Bahnhof fahren?',
        meaning: 'Eine vorsichtige Bitte, ruhig zum Bahnhof zu fahren.',
        chunks: [
          chunk('could-we-go-slowly', 'Could we go slowly', 'könnten wir langsam fahren'),
          chunk('to-the-station', 'to the station', 'zum Bahnhof'),
        ],
        extraLessonItems: [
          chunk('slowly', 'slowly', 'langsam'),
          chunk('station', 'station', 'Bahnhof'),
          chunk('wait', 'wait', 'warten'),
          chunk('help', 'help', 'Hilfe'),
        ],
        targetChips: ['Could we go slowly', 'to the station?'],
        distractors: ['to the menu', 'for water'],
        typeRecall: recall('Could we go slowly to the ', 'station', '?', ['station', 'shop', 'taxi', 'table']),
        sceneCaption: 'Wistful bittet leise um eine ruhige Fahrt zum Bahnhof.',
        trophyWord: trophy('easy', 'leicht', 'Easy, please.', 'Easy hält die vorsichtige Fahrt-Bitte weich und konkret.'),
        mediaCaption: 'Gedämpftes Bahnhofsschild, ruhige Zielangabe.',
        songSeed: { genre: 'soft indie folk', mood: 'careful station destination' },
        visualNotes: 'Soft sign light, careful voice, station cue.',
      }),
      sharp: createA1P7VariantInput({
        targetText: 'Take me to the station, please.',
        baseText: 'Bringen Sie mich bitte zum Bahnhof.',
        meaning: 'Eine direkte, höfliche Zielangabe.',
        chunks: [
          chunk('take-me', 'Take me', 'bringen Sie mich'),
          chunk('to-the-station', 'to the station', 'zum Bahnhof'),
          chunk('please', 'please', 'bitte'),
        ],
        extraLessonItems: [
          chunk('there', 'there', 'dorthin'),
          chunk('station', 'station', 'Bahnhof'),
          chunk('clear', 'clear', 'klar'),
          chunk('ready', 'ready', 'bereit'),
        ],
        targetChips: ['Take me', 'to the station,', 'please.'],
        distractors: ['Show me', 'the ticket'],
        typeRecall: recall('Take me to the ', 'station', ', please.', ['station', 'taxi', 'bus', 'pharmacy']),
        sceneCaption: 'Sharp nennt das Ziel direkt und höflich.',
        trophyWord: trophy('driver', 'Fahrer', 'Driver, the station.', 'Driver macht Sharps direkte Anweisung an den Fahrer konkret.'),
        mediaCaption: 'Klarer Fahrgastraum, direkte Zielangabe zum Bahnhof.',
        songSeed: { genre: 'minimal synth pulse', mood: 'direct station destination' },
        visualNotes: 'Driver view, station cue, concise destination.',
      }),
    },
  },
  {
    slug: 'how-long-does-it-take',
    title: 'How long does it take?',
    situation: {
      en: 'You ask how long the ride takes.',
      de: 'Du fragst, wie lange die Fahrt dauert.',
    },
    pedagogicalGoal: 'Ask a basic duration question without route-planning detail.',
    variants: {
      bright: createA1P7VariantInput({
        targetText: 'How long does it take?',
        baseText: 'Wie lange dauert es?',
        meaning: 'Eine kurze Frage nach der Dauer.',
        chunks: [
          chunk('how-long', 'How long', 'wie lange'),
          chunk('does-it-take', 'does it take', 'dauert es'),
        ],
        extraLessonItems: [
          chunk('take', 'take', 'dauern'),
          chunk('time', 'time', 'Zeit'),
          chunk('minutes', 'minutes', 'Minuten'),
          chunk('wait', 'wait', 'warten'),
        ],
        targetChips: ['How long', 'does it take?'],
        distractors: ['does it cost?', 'can it stop?'],
        typeRecall: recall('How long does it ', 'take', '?', ['take', 'leave', 'stop', 'wait']),
        sceneCaption: 'Bright fragt freundlich, wie lange es dauert.',
        trophyWord: trophy('last', 'dauern', 'How long does it last?', 'Last ist Brights einfacher Anker für die Dauerfrage.'),
        mediaCaption: 'Fahrgastraum mit Uhr, freundliche Frage nach der Dauer.',
        songSeed: { genre: 'warm acoustic pop', mood: 'friendly duration ask' },
        visualNotes: 'Clock cue, route window, warm duration question.',
      }),
      wistful: createA1P7VariantInput({
        targetText: 'Is it a long way?',
        baseText: 'Ist es ein langer Weg?',
        meaning: 'Eine vorsichtige Frage, ob es weit ist.',
        chunks: [
          chunk('is-it', 'Is it', 'ist es'),
          chunk('a-long-way', 'a long way', 'ein langer Weg'),
        ],
        extraLessonItems: [
          chunk('clear', 'clear', 'klar'),
          chunk('slowly', 'slowly', 'langsam'),
          chunk('time', 'time', 'Zeit'),
          chunk('wait', 'wait', 'warten'),
        ],
        targetChips: ['Is it', 'a long way?'],
        distractors: ['a right train?', 'a small shop?'],
        typeRecall: recall('Is it a ', 'long way', '?', ['long way', 'short stop', 'right train', 'small shop']),
        sceneCaption: 'Wistful fragt vorsichtig, ob der Weg lang ist.',
        trophyWord: trophy('long', 'lang', 'Is it long?', 'Long passt zur vorsichtigen Frage nach der Dauer.'),
        mediaCaption: 'Gedämpfter Blick aus dem Fenster, vorsichtige Frage zur Strecke.',
        songSeed: { genre: 'soft indie folk', mood: 'careful duration ask' },
        visualNotes: 'Soft window, quiet route cue, long-way question.',
      }),
      sharp: createA1P7VariantInput({
        targetText: 'How many minutes does it take?',
        baseText: 'Wie viele Minuten dauert es?',
        meaning: 'Eine direkte Frage nach Minuten.',
        chunks: [
          chunk('how-many-minutes', 'How many minutes', 'wie viele Minuten'),
          chunk('does-it-take', 'does it take', 'dauert es'),
        ],
        extraLessonItems: [
          chunk('time', 'time', 'Zeit'),
          chunk('minutes', 'minutes', 'Minuten'),
          chunk('clear', 'clear', 'klar'),
          chunk('ready', 'ready', 'bereit'),
        ],
        targetChips: ['How many minutes', 'does it take?'],
        distractors: ['does it leave?', 'is it fresh?'],
        typeRecall: recall('How many ', 'minutes', ' does it take?', ['minutes', 'tickets', 'buses', 'tables']),
        sceneCaption: 'Sharp fragt direkt nach der Dauer in Minuten.',
        trophyWord: trophy('how', 'wie', 'How long?', 'How ist Sharps direkte Frage nach der Dauer.'),
        mediaCaption: 'Klares Uhrdetail, direkte Dauerfrage, ruhiger Ton.',
        songSeed: { genre: 'minimal synth pulse', mood: 'direct duration ask' },
        visualNotes: 'Clock detail, clean route frame, concise ask.',
      }),
    },
  },
  {
    slug: 'i-have-arrived',
    title: 'I have arrived',
    situation: {
      en: 'You say that you have arrived and close politely.',
      de: 'Du sagst, dass du angekommen bist, und schließt höflich ab.',
    },
    pedagogicalGoal: 'Close a simple travel interaction after arriving.',
    variants: {
      bright: createA1P7VariantInput({
        targetText: 'I have arrived, thank you.',
        baseText: 'Ich bin angekommen, danke.',
        meaning: 'Ein freundlicher Abschluss nach der Fahrt.',
        chunks: [
          chunk('i-have-arrived', 'I have arrived', 'ich bin angekommen'),
          chunk('thank-you', 'thank you', 'danke'),
        ],
        extraLessonItems: [
          chunk('arrived', 'arrived', 'angekommen'),
          chunk('thanks', 'thanks', 'danke'),
          chunk('better', 'better', 'besser'),
          chunk('ready', 'ready', 'bereit'),
        ],
        targetChips: ['I have arrived,', 'thank you.'],
        distractors: ['I need', 'a ticket'],
        typeRecall: recall('I have ', 'arrived', ', thank you.', ['arrived', 'waited', 'stopped', 'left']),
        sceneCaption: 'Bright bedankt sich und sagt, dass er angekommen ist.',
        trophyWord: trophy('arrived', 'angekommen', 'I have arrived.', 'Arrived schließt die Reise einfach ab.'),
        mediaCaption: 'Ankunft am Ziel, freundlicher Dank an den Fahrer.',
        songSeed: { genre: 'warm acoustic pop', mood: 'friendly arrival close' },
        visualNotes: 'Arrival curb, thank-you gesture, relaxed finish.',
      }),
      wistful: createA1P7VariantInput({
        targetText: 'I am here now.',
        baseText: 'Ich bin jetzt hier.',
        meaning: 'Ein ruhiger, einfacher Ankunftssatz.',
        chunks: [
          chunk('i-am-here', 'I am here', 'ich bin hier'),
          chunk('now', 'now', 'jetzt'),
        ],
        extraLessonItems: [
          chunk('better', 'better', 'besser'),
          chunk('here', 'here', 'hier'),
          chunk('safe', 'safe', 'sicher'),
          chunk('thanks', 'thanks', 'danke'),
        ],
        targetChips: ['I am here', 'now.'],
        distractors: ['there later', 'by train'],
        typeRecall: recall('I am ', 'here now', '.', ['here now', 'there now', 'late now', 'ready now']),
        sceneCaption: 'Wistful sagt leise, dass er jetzt da ist.',
        trophyWord: trophy('home', 'zuhause', 'I feel at home.', 'Home schließt die Ankunft warm und vertraut ab.'),
        mediaCaption: 'Gedämpfte Ankunftsszene, kurzer Moment am Ziel.',
        songSeed: { genre: 'soft indie folk', mood: 'quiet arrival close' },
        visualNotes: 'Soft curb light, small nod, here-now cue.',
      }),
      sharp: createA1P7VariantInput({
        targetText: 'I have arrived.',
        baseText: 'Ich bin angekommen.',
        meaning: 'Ein knapper Ankunftssatz.',
        chunks: [
          chunk('i-have', 'I have', 'ich bin'),
          chunk('arrived', 'arrived', 'angekommen'),
        ],
        extraLessonItems: [
          chunk('safe', 'safe', 'sicher'),
          chunk('clear', 'clear', 'klar'),
          chunk('ready', 'ready', 'bereit'),
          chunk('there', 'there', 'dorthin'),
        ],
        targetChips: ['I have', 'arrived.'],
        distractors: ['left', 'waited'],
        typeRecall: recall('I have ', 'arrived', '.', ['arrived', 'stopped', 'waited', 'left']),
        sceneCaption: 'Sharp meldet die Ankunft kurz und klar.',
        trophyWord: trophy('made', 'geschafft', 'I made it.', 'Made schließt die Reise knapp und positiv ab.'),
        mediaCaption: 'Klare Ankunft am Bordstein, kurzer Satz, ruhige Haltung.',
        songSeed: { genre: 'minimal synth pulse', mood: 'direct arrival close' },
        visualNotes: 'Clean curb frame, concise arrival line, composed close.',
      }),
    },
  },
]

const a1Practical7Lessons: GuidedLessonDefinition[] = a1Practical7Inputs.map((lessonInput, index) => {
  const lessonNumber = index + 1
  const id = `english-a1-practical-7-${String(lessonNumber).padStart(3, '0')}-${lessonInput.slug}`
  const nextInput = a1Practical7Inputs[index + 1]

  return {
    id,
    pathId: GUIDED_TODAY_PATH_SEVEN_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_SEVEN_METADATA.title,
    level: GUIDED_TODAY_PATH_SEVEN_METADATA.level,
    lessonNumber,
    baseLanguage: GUIDED_TODAY_PATH_SEVEN_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_SEVEN_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_SEVEN_METADATA,
    lessonMetadata: {
      id,
      sequence: lessonNumber,
      title: lessonInput.title,
    },
    title: lessonInput.title,
    situation: lessonInput.situation,
    pedagogicalGoal: lessonInput.pedagogicalGoal,
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: nextInput?.title ?? 'Path complete',
      situation: nextInput?.situation.de ?? 'Du hast English A1 P7 abgeschlossen.',
    },
    vibeVariants: {
      bright: createA1P2Variant(lessonInput.variants.bright),
      wistful: createA1P2Variant(lessonInput.variants.wistful),
      sharp: createA1P2Variant(lessonInput.variants.sharp),
    },
  }
})

type A1P8LessonInput = A1P2LessonInput

const a1Practical8Inputs: A1P8LessonInput[] = [
  {
    slug: 'i-have-a-reservation',
    title: 'I have a reservation',
    situation: {
      en: 'At the hotel desk, you say you have a reservation.',
      de: 'An der Hotelrezeption sagst du, dass du eine Reservierung hast.',
    },
    pedagogicalGoal: 'Start a hotel check-in with a short reservation phrase.',
    variants: {
      bright: createA1P8VariantInput({
        targetText: 'I have a reservation, please.',
        baseText: 'Ich habe eine Reservierung, bitte.',
        meaning: 'Ein freundlicher Start beim Einchecken.',
        chunks: [
          chunk('i-have', 'I have', 'ich habe'),
          chunk('a-reservation', 'a reservation', 'eine Reservierung'),
          chunk('please', 'please', 'bitte'),
        ],
        extraLessonItems: [
          chunk('reservation', 'reservation', 'Reservierung'),
          chunk('hotel', 'hotel', 'Hotel'),
          chunk('ready', 'ready', 'bereit'),
          chunk('here', 'here', 'hier'),
        ],
        targetChips: ['I have', 'a reservation,', 'please.'],
        distractors: ['a ticket', 'a towel'],
        typeRecall: recall('I have a ', 'reservation', ', please.', ['reservation', 'ticket', 'room', 'taxi']),
        sceneCaption: 'Bright sagt freundlich, dass eine Reservierung da ist.',
        trophyWord: trophy('reservation', 'Reservierung', 'I have a reservation.', 'Reservation ist der praktische Start beim Hotel.'),
        mediaCaption: 'Helle Hotelrezeption, freundlicher Check-in mit Reservierung.',
        songSeed: { genre: 'warm acoustic pop', mood: 'friendly hotel check-in' },
        visualNotes: 'Hotel desk, open posture, reservation cue.',
      }),
      wistful: createA1P8VariantInput({
        targetText: 'Could you check my reservation?',
        baseText: 'Könnten Sie meine Reservierung prüfen?',
        meaning: 'Ein vorsichtiger Check-in-Satz, wenn du die Reservierung prüfen lassen möchtest.',
        chunks: [
          chunk('could-you-check', 'Could you check', 'könnten Sie prüfen'),
          chunk('my-reservation', 'my reservation', 'meine Reservierung'),
        ],
        extraLessonItems: [
          chunk('careful', 'careful', 'vorsichtig'),
          chunk('reservation', 'reservation', 'Reservierung'),
          chunk('help', 'help', 'Hilfe'),
          chunk('night', 'night', 'Nacht'),
        ],
        targetChips: ['Could you check', 'my reservation?'],
        distractors: ['a taxi', 'breakfast'],
        typeRecall: recall('Could you check my ', 'reservation', '?', ['reservation', 'ticket', 'key', 'towel']),
        sceneCaption: 'Wistful bittet vorsichtig darum, die Reservierung zu prüfen.',
        trophyWord: trophy('check', 'prüfen', 'Could you check?', 'Check macht die ruhige Rezeptionsbitte konkret.'),
        mediaCaption: 'Ruhige Hotelrezeption, vorsichtige Frage nach der Reservierung.',
        songSeed: { genre: 'soft indie folk', mood: 'careful hotel check-in' },
        visualNotes: 'Soft lobby light, small pause, reservation cue.',
      }),
      sharp: createA1P8VariantInput({
        targetText: 'Here is my reservation.',
        baseText: 'Hier ist meine Reservierung.',
        meaning: 'Ein klarer Satz an der Rezeption.',
        chunks: [
          chunk('here-is', 'Here is', 'hier ist'),
          chunk('my-reservation', 'my reservation', 'meine Reservierung'),
        ],
        extraLessonItems: [
          chunk('ready', 'ready', 'bereit'),
          chunk('hotel', 'hotel', 'Hotel'),
          chunk('clear', 'clear', 'klar'),
          chunk('reservation', 'reservation', 'Reservierung'),
        ],
        targetChips: ['Here is', 'my reservation.'],
        distractors: ['a taxi', 'there'],
        typeRecall: recall('Here is my ', 'reservation', '.', ['reservation', 'ticket', 'room', 'bus']),
        sceneCaption: 'Sharp bleibt klar und sachlich beim Check-in.',
        trophyWord: trophy('guest', 'Gast', 'I am the guest.', 'Guest macht die Identität an der Rezeption sofort klar.'),
        mediaCaption: 'Klare Hotelrezeption, kurzer Satz zur Reservierung.',
        songSeed: { genre: 'minimal synth pulse', mood: 'direct hotel check-in' },
        visualNotes: 'Clean desk line, direct phrase, reservation focus.',
      }),
    },
  },
  {
    slug: 'i-need-a-room',
    title: 'I need a room',
    situation: {
      en: 'You ask for a room at a hotel or guesthouse.',
      de: 'Du fragst in einem Hotel oder Gästehaus nach einem Zimmer.',
    },
    pedagogicalGoal: 'Ask for a room with short, polite accommodation language.',
    variants: {
      bright: createA1P8VariantInput({
        targetText: 'I need a room, please.',
        baseText: 'Ich brauche ein Zimmer, bitte.',
        meaning: 'Eine freundliche Bitte um ein Zimmer.',
        chunks: [
          chunk('i-need', 'I need', 'ich brauche'),
          chunk('a-room', 'a room', 'ein Zimmer'),
          chunk('please', 'please', 'bitte'),
        ],
        extraLessonItems: [
          chunk('room', 'room', 'Zimmer'),
          chunk('hotel', 'hotel', 'Hotel'),
          chunk('please', 'please', 'bitte'),
          chunk('night', 'night', 'Nacht'),
        ],
        targetChips: ['I need', 'a room,', 'please.'],
        distractors: ['a train', 'a ticket'],
        typeRecall: recall('I need a ', 'room', ', please.', ['room', 'taxi', 'ticket', 'towel']),
        sceneCaption: 'Bright bittet freundlich um ein Zimmer.',
        trophyWord: trophy('room', 'Zimmer', 'I need a room.', 'Room ist der zentrale Hotelanker.'),
        mediaCaption: 'Hotelrezeption mit Zimmerschlüssel, freundliche Bitte.',
        songSeed: { genre: 'light acoustic pop', mood: 'friendly room ask' },
        visualNotes: 'Desk bell, room cue, warm request.',
      }),
      wistful: createA1P8VariantInput({
        targetText: 'Could I have a quiet room?',
        baseText: 'Könnte ich ein ruhiges Zimmer haben?',
        meaning: 'Eine vorsichtige Bitte um ein ruhiges Zimmer.',
        chunks: [
          chunk('could-i-have', 'Could I have', 'könnte ich haben'),
          chunk('a-quiet-room', 'a quiet room', 'ein ruhiges Zimmer'),
        ],
        extraLessonItems: [
          chunk('night', 'night', 'Nacht'),
          chunk('quiet', 'quiet', 'ruhig'),
          chunk('room', 'room', 'Zimmer'),
          chunk('please', 'please', 'bitte'),
        ],
        targetChips: ['Could I have', 'a quiet room?'],
        distractors: ['a busy station?', 'one ticket?'],
        typeRecall: recall('Could I have a quiet ', 'room', '?', ['room', 'bus', 'key', 'towel']),
        sceneCaption: 'Wistful fragt sanft nach einem ruhigen Zimmer.',
        trophyWord: trophy('small', 'klein', 'A small room, please.', 'Small macht die Bitte ums Zimmer vorsichtig und konkret.'),
        mediaCaption: 'Gedämpfter Hotelflur, ruhige Bitte um ein Zimmer.',
        songSeed: { genre: 'soft indie folk', mood: 'careful room ask' },
        visualNotes: 'Muted hallway, tired posture, quiet-room cue.',
      }),
      sharp: createA1P8VariantInput({
        targetText: 'I need a room for tonight.',
        baseText: 'Ich brauche ein Zimmer für heute Nacht.',
        meaning: 'Eine direkte, klare Zimmerbitte.',
        chunks: [
          chunk('i-need', 'I need', 'ich brauche'),
          chunk('a-room', 'a room', 'ein Zimmer'),
          chunk('for-tonight', 'for tonight', 'für heute Nacht'),
        ],
        extraLessonItems: [
          chunk('hotel', 'hotel', 'Hotel'),
          chunk('room', 'room', 'Zimmer'),
          chunk('tonight', 'tonight', 'heute Nacht'),
          chunk('ready', 'ready', 'bereit'),
        ],
        targetChips: ['I need', 'a room', 'for tonight.'],
        distractors: ['for the train', 'by taxi'],
        typeRecall: recall('I need a ', 'room', ' for tonight.', ['room', 'taxi', 'ticket', 'towel']),
        sceneCaption: 'Sharp nennt den Bedarf direkt und höflich.',
        trophyWord: trophy('hotel', 'Hotel', 'I need a hotel room.', 'Hotel hält die Szene klar verortet.'),
        mediaCaption: 'Klarer Empfangstresen, direkte Frage nach einem Zimmer.',
        songSeed: { genre: 'minimal synth pulse', mood: 'direct room ask' },
        visualNotes: 'Clean lobby, direct room request, steady tone.',
      }),
    },
  },
  {
    slug: 'where-is-my-room',
    title: 'Where is my room?',
    situation: {
      en: 'After check-in, you ask where your room is.',
      de: 'Nach dem Einchecken fragst du, wo dein Zimmer ist.',
    },
    pedagogicalGoal: 'Ask where the room is with simple location language.',
    variants: {
      bright: createA1P8VariantInput({
        targetText: 'Where is my room?',
        baseText: 'Wo ist mein Zimmer?',
        meaning: 'Eine einfache Frage nach dem Zimmer.',
        chunks: [
          chunk('where-is', 'Where is', 'wo ist'),
          chunk('my-room', 'my room', 'mein Zimmer'),
        ],
        extraLessonItems: [
          chunk('hotel', 'hotel', 'Hotel'),
          chunk('where', 'where', 'wo'),
          chunk('room', 'room', 'Zimmer'),
          chunk('here', 'here', 'hier'),
        ],
        targetChips: ['Where is', 'my room?'],
        distractors: ['the bus?', 'my ticket?'],
        typeRecall: recall('Where is my ', 'room', '?', ['room', 'bus', 'taxi', 'breakfast']),
        sceneCaption: 'Bright fragt freundlich, wo das Zimmer ist.',
        trophyWord: trophy('floor', 'Etage', 'Which floor?', 'Floor ist Brights konkrete Hotelfrage nach der Etage.'),
        mediaCaption: 'Hotelflur mit Wegweiser, freundliche Frage nach dem Zimmer.',
        songSeed: { genre: 'warm acoustic pop', mood: 'friendly room search' },
        visualNotes: 'Hall sign, open gesture, room location cue.',
      }),
      wistful: createA1P8VariantInput({
        targetText: 'Could you show me my room?',
        baseText: 'Könnten Sie mir mein Zimmer zeigen?',
        meaning: 'Eine sanfte Bitte, das Zimmer zu zeigen.',
        chunks: [
          chunk('could-you-show-me', 'Could you show me', 'könnten Sie mir zeigen'),
          chunk('my-room', 'my room', 'mein Zimmer'),
        ],
        extraLessonItems: [
          chunk('where', 'where', 'wo'),
          chunk('room', 'room', 'Zimmer'),
          chunk('help', 'help', 'Hilfe'),
          chunk('here', 'here', 'hier'),
        ],
        targetChips: ['Could you show me', 'my room?'],
        distractors: ['the train?', 'my towel?'],
        typeRecall: recall('Could you show me my ', 'room', '?', ['room', 'ticket', 'taxi', 'key']),
        sceneCaption: 'Wistful bittet vorsichtig um den Weg zum Zimmer.',
        trophyWord: trophy('find', 'finden', 'Could you help me find it?', 'Find macht Wistfuls Suche nach dem Zimmer konkret.'),
        mediaCaption: 'Ruhiger Hotelflur, vorsichtige Bitte um Orientierung.',
        songSeed: { genre: 'soft indie folk', mood: 'careful room search' },
        visualNotes: 'Soft hallway, small room sign, careful question.',
      }),
      sharp: createA1P8VariantInput({
        targetText: 'Please show me the room.',
        baseText: 'Bitte zeigen Sie mir das Zimmer.',
        meaning: 'Eine direkte, höfliche Bitte um den Weg.',
        chunks: [
          chunk('please-show-me', 'Please show me', 'bitte zeigen Sie mir'),
          chunk('the-room', 'the room', 'das Zimmer'),
        ],
        extraLessonItems: [
          chunk('right', 'right', 'richtig'),
          chunk('room', 'room', 'Zimmer'),
          chunk('clear', 'clear', 'klar'),
          chunk('where', 'where', 'wo'),
        ],
        targetChips: ['Please show me', 'the room.'],
        distractors: ['the taxi', 'the menu'],
        typeRecall: recall('Please show me the ', 'room', '.', ['room', 'taxi', 'train', 'menu']),
        sceneCaption: 'Sharp fragt klar nach dem Zimmer.',
        trophyWord: trophy('point', 'zeigen', 'Could you point?', 'Point macht Sharps Bitte um Orientierung präzise.'),
        mediaCaption: 'Klarer Flur, sachliche Bitte, Zimmernummer im Fokus.',
        songSeed: { genre: 'minimal synth pulse', mood: 'direct room search' },
        visualNotes: 'Room number, clean hallway, direct ask.',
      }),
    },
  },
  {
    slug: 'i-need-the-key',
    title: 'I need the key',
    situation: {
      en: 'At the desk, you ask for the room key.',
      de: 'An der Rezeption fragst du nach dem Zimmerschlüssel.',
    },
    pedagogicalGoal: 'Ask for the key with a short hotel phrase.',
    variants: {
      bright: createA1P8VariantInput({
        targetText: 'I need the key, please.',
        baseText: 'Ich brauche den Schlüssel, bitte.',
        meaning: 'Eine freundliche Bitte um den Schlüssel.',
        chunks: [
          chunk('i-need', 'I need', 'ich brauche'),
          chunk('the-key', 'the key', 'den Schlüssel'),
          chunk('please', 'please', 'bitte'),
        ],
        extraLessonItems: [
          chunk('key', 'key', 'Schlüssel'),
          chunk('room', 'room', 'Zimmer'),
          chunk('please', 'please', 'bitte'),
          chunk('ready', 'ready', 'bereit'),
        ],
        targetChips: ['I need', 'the key,', 'please.'],
        distractors: ['the taxi', 'the bill'],
        typeRecall: recall('I need the ', 'key', ', please.', ['key', 'taxi', 'ticket', 'towel']),
        sceneCaption: 'Bright bittet freundlich um den Schlüssel.',
        trophyWord: trophy('key', 'Schlüssel', 'I need the key.', 'Key ist der praktische Zimmeranker.'),
        mediaCaption: 'Zimmerschlüssel an der Rezeption, freundliche Bitte.',
        songSeed: { genre: 'light acoustic pop', mood: 'friendly key ask' },
        visualNotes: 'Key card, desk, warm request.',
      }),
      wistful: createA1P8VariantInput({
        targetText: 'Could I have the key?',
        baseText: 'Könnte ich den Schlüssel haben?',
        meaning: 'Eine vorsichtige Bitte um den Schlüssel.',
        chunks: [
          chunk('could-i-have', 'Could I have', 'könnte ich haben'),
          chunk('the-key', 'the key', 'den Schlüssel'),
        ],
        extraLessonItems: [
          chunk('help', 'help', 'Hilfe'),
          chunk('key', 'key', 'Schlüssel'),
          chunk('wait', 'wait', 'warten'),
          chunk('please', 'please', 'bitte'),
        ],
        targetChips: ['Could I have', 'the key?'],
        distractors: ['a ticket?', 'the taxi?'],
        typeRecall: recall('Could I have the ', 'key', '?', ['key', 'taxi', 'ticket', 'room']),
        sceneCaption: 'Wistful fragt sanft nach dem Schlüssel.',
        trophyWord: trophy('kindly', 'freundlich', 'Kindly, the key?', 'Kindly hält die Bitte um den Schlüssel weich und höflich.'),
        mediaCaption: 'Gedämpfte Rezeption, kleine Bitte um den Schlüssel.',
        songSeed: { genre: 'soft indie folk', mood: 'careful key ask' },
        visualNotes: 'Soft counter light, key-card cue, quiet ask.',
      }),
      sharp: createA1P8VariantInput({
        targetText: 'The key, please.',
        baseText: 'Den Schlüssel, bitte.',
        meaning: 'Eine sehr kurze, höfliche Bitte.',
        chunks: [
          chunk('the-key', 'The key', 'den Schlüssel'),
          chunk('please', 'please', 'bitte'),
        ],
        extraLessonItems: [
          chunk('clear', 'clear', 'klar'),
          chunk('key', 'key', 'Schlüssel'),
          chunk('room', 'room', 'Zimmer'),
          chunk('ready', 'ready', 'bereit'),
        ],
        targetChips: ['The key,', 'please.'],
        distractors: ['The ticket', 'now'],
        typeRecall: recall('The ', 'key', ', please.', ['key', 'ticket', 'taxi', 'towel']),
        sceneCaption: 'Sharp bleibt kurz, aber höflich.',
        trophyWord: trophy('fast', 'schnell', 'A fast key, please.', 'Fast passt zur knappen, höflichen Schlüsselbitte.'),
        mediaCaption: 'Klarer Tresen, Schlüsselkarte, kurzer höflicher Satz.',
        songSeed: { genre: 'minimal synth pulse', mood: 'direct key ask' },
        visualNotes: 'Key card close-up, concise phrase, composed tone.',
      }),
    },
  },
  {
    slug: 'is-there-wi-fi',
    title: 'Is there Wi-Fi?',
    situation: {
      en: 'In the hotel, you ask about Wi-Fi.',
      de: 'Im Hotel fragst du nach WLAN.',
    },
    pedagogicalGoal: 'Ask about Wi-Fi with a simple availability question.',
    variants: {
      bright: createA1P8VariantInput({
        targetText: 'Is there Wi-Fi here?',
        baseText: 'Haben Sie hier WLAN?',
        meaning: 'Eine einfache Frage nach WLAN im Hotel.',
        chunks: [
          chunk('is-there', 'Is there', 'gibt es'),
          chunk('wi-fi', 'Wi-Fi', 'WLAN'),
          chunk('here', 'here', 'hier'),
        ],
        extraLessonItems: [
          chunk('wi-fi', 'Wi-Fi', 'WLAN'),
          chunk('hotel', 'hotel', 'Hotel'),
          chunk('here', 'here', 'hier'),
          chunk('clear', 'clear', 'klar'),
        ],
        targetChips: ['Is there', 'Wi-Fi', 'here?'],
        distractors: ['a taxi', 'breakfast'],
        typeRecall: recall('Is there ', 'Wi-Fi', ' here?', ['Wi-Fi', 'a taxi', 'a bus', 'a towel']),
        sceneCaption: 'Bright fragt freundlich nach WLAN.',
        trophyWord: trophy('Wi-Fi', 'WLAN', 'Is there Wi-Fi?', 'Wi-Fi ist ein häufiger Hotelanker.'),
        mediaCaption: 'Hotelzimmer mit kleinem WLAN-Schild, freundliche Frage.',
        songSeed: { genre: 'warm acoustic pop', mood: 'friendly wifi ask' },
        visualNotes: 'Wi-Fi sign, room desk, open question.',
      }),
      wistful: createA1P8VariantInput({
        targetText: 'Do you have Wi-Fi?',
        baseText: 'Haben Sie WLAN?',
        meaning: 'Eine kurze, vorsichtige Frage nach WLAN.',
        chunks: [
          chunk('do-you-have', 'Do you have', 'haben Sie'),
          chunk('wi-fi', 'Wi-Fi', 'WLAN'),
        ],
        extraLessonItems: [
          chunk('clear', 'clear', 'klar'),
          chunk('wi-fi', 'Wi-Fi', 'WLAN'),
          chunk('help', 'help', 'Hilfe'),
          chunk('room', 'room', 'Zimmer'),
        ],
        targetChips: ['Do you have', 'Wi-Fi?'],
        distractors: ['a train?', 'my key?'],
        typeRecall: recall('Do you have ', 'Wi-Fi', '?', ['Wi-Fi', 'a taxi', 'breakfast', 'a train']),
        sceneCaption: 'Wistful fragt leise nach WLAN.',
        trophyWord: trophy('code', 'Code', 'The Wi-Fi code, please.', 'Code hält die kurze Wi-Fi-Frage konkret und nützlich.'),
        mediaCaption: 'Ruhiger Empfang, kleines WLAN-Symbol, vorsichtige Frage.',
        songSeed: { genre: 'soft indie folk', mood: 'careful wifi ask' },
        visualNotes: 'Muted desk light, Wi-Fi icon, careful ask.',
      }),
      sharp: createA1P8VariantInput({
        targetText: 'Can I use the Wi-Fi?',
        baseText: 'Kann ich das WLAN nutzen?',
        meaning: 'Eine direkte Frage zur Nutzung von WLAN.',
        chunks: [
          chunk('can-i-use', 'Can I use', 'kann ich nutzen'),
          chunk('the-wi-fi', 'the Wi-Fi', 'das WLAN'),
        ],
        extraLessonItems: [
          chunk('direct', 'direct', 'direkt'),
          chunk('wi-fi', 'Wi-Fi', 'WLAN'),
          chunk('clear', 'clear', 'klar'),
          chunk('room', 'room', 'Zimmer'),
        ],
        targetChips: ['Can I use', 'the Wi-Fi?'],
        distractors: ['the towel?', 'the taxi?'],
        typeRecall: recall('Can I use the ', 'Wi-Fi', '?', ['Wi-Fi', 'train', 'key', 'ticket']),
        sceneCaption: 'Sharp fragt klar, ob er das WLAN nutzen kann.',
        trophyWord: trophy('use', 'nutzen', 'Can I use it?', 'Use macht die direkte Wi-Fi-Frage knapp und klar.'),
        mediaCaption: 'Klares WLAN-Schild, direkte Frage an der Rezeption.',
        songSeed: { genre: 'minimal synth pulse', mood: 'direct wifi ask' },
        visualNotes: 'Wi-Fi card, clean desk, direct request.',
      }),
    },
  },
  {
    slug: 'where-is-the-bathroom',
    title: 'Where is the bathroom?',
    situation: {
      en: 'In the accommodation, you ask where the bathroom is.',
      de: 'In der Unterkunft fragst du, wo das Bad ist.',
    },
    pedagogicalGoal: 'Ask for the bathroom location with simple, practical language.',
    variants: {
      bright: createA1P8VariantInput({
        targetText: 'Where is the bathroom?',
        baseText: 'Wo ist das Bad?',
        meaning: 'Eine klare Frage nach dem Bad.',
        chunks: [
          chunk('where-is', 'Where is', 'wo ist'),
          chunk('the-bathroom', 'the bathroom', 'das Bad'),
        ],
        extraLessonItems: [
          chunk('bathroom', 'bathroom', 'Bad'),
          chunk('where', 'where', 'wo'),
          chunk('here', 'here', 'hier'),
          chunk('room', 'room', 'Zimmer'),
        ],
        targetChips: ['Where is', 'the bathroom?'],
        distractors: ['the bus?', 'the ticket?'],
        typeRecall: recall('Where is the ', 'bathroom', '?', ['bathroom', 'station', 'taxi', 'breakfast']),
        sceneCaption: 'Bright fragt freundlich nach dem Bad.',
        trophyWord: trophy('bathroom', 'Bad', 'Where is the bathroom?', 'Bathroom ist ein wichtiger Unterkunftsanker.'),
        mediaCaption: 'Hotelflur mit Badsymbol, freundliche Ortsfrage.',
        songSeed: { genre: 'light acoustic pop', mood: 'friendly bathroom ask' },
        visualNotes: 'Bathroom sign, open gesture, practical ask.',
      }),
      wistful: createA1P8VariantInput({
        targetText: 'Could you show me the bathroom?',
        baseText: 'Könnten Sie mir das Bad zeigen?',
        meaning: 'Eine vorsichtige Bitte, das Bad zu zeigen.',
        chunks: [
          chunk('could-you-show-me', 'Could you show me', 'könnten Sie mir zeigen'),
          chunk('the-bathroom', 'the bathroom', 'das Bad'),
        ],
        extraLessonItems: [
          chunk('here', 'here', 'hier'),
          chunk('bathroom', 'bathroom', 'Bad'),
          chunk('help', 'help', 'Hilfe'),
          chunk('careful', 'careful', 'vorsichtig'),
        ],
        targetChips: ['Could you show me', 'the bathroom?'],
        distractors: ['my ticket?', 'the taxi?'],
        typeRecall: recall('Could you show me the ', 'bathroom', '?', ['bathroom', 'station', 'key', 'train']),
        sceneCaption: 'Wistful bittet ruhig um den Weg zum Bad.',
        trophyWord: trophy('show', 'zeigen', 'Could you show me?', 'Show ist die ruhige A1-Bitte, mir den Weg zu zeigen.'),
        mediaCaption: 'Gedämpfter Flur, ruhige Frage nach dem Bad.',
        songSeed: { genre: 'soft indie folk', mood: 'careful bathroom ask' },
        visualNotes: 'Soft hallway, bathroom icon, small question.',
      }),
      sharp: createA1P8VariantInput({
        targetText: 'Show me the way to the bathroom, please.',
        baseText: 'Zeigen Sie mir bitte den Weg zum Bad.',
        meaning: 'Eine direkte, höfliche Bitte um den Weg.',
        chunks: [
          chunk('show-me-the-way', 'Show me the way', 'zeigen Sie mir den Weg'),
          chunk('to', 'to', 'zu'),
          chunk('the-bathroom', 'the bathroom', 'dem Bad'),
          chunk('please', 'please', 'bitte'),
        ],
        extraLessonItems: [
          chunk('straight', 'straight', 'geradeaus'),
          chunk('bathroom', 'bathroom', 'Bad'),
          chunk('where', 'where', 'wo'),
          chunk('clear', 'clear', 'klar'),
        ],
        targetChips: ['Show me the way', 'to the bathroom,', 'please.'],
        distractors: ['the taxi', 'the ticket'],
        typeRecall: recall('Show me the way to the ', 'bathroom', ', please.', ['bathroom', 'train', 'room', 'menu']),
        sceneCaption: 'Sharp bittet klar um den Weg zum Bad.',
        trophyWord: trophy('straight', 'geradeaus', 'Go straight to the bathroom.', 'Straight passt zur knappen Wegorientierung.'),
        mediaCaption: 'Klares Badsymbol, direkte Bitte, ruhiger Ton.',
        songSeed: { genre: 'minimal synth pulse', mood: 'direct bathroom ask' },
        visualNotes: 'Bathroom sign, clean frame, concise request.',
      }),
    },
  },
  {
    slug: 'i-need-a-towel',
    title: 'I need a towel',
    situation: {
      en: 'In the room, you ask for a towel.',
      de: 'Im Zimmer fragst du nach einem Handtuch.',
    },
    pedagogicalGoal: 'Ask for a towel with simple accommodation language.',
    variants: {
      bright: createA1P8VariantInput({
        targetText: 'I need a towel, please.',
        baseText: 'Ich brauche ein Handtuch, bitte.',
        meaning: 'Eine freundliche Bitte um ein Handtuch.',
        chunks: [
          chunk('i-need', 'I need', 'ich brauche'),
          chunk('a-towel', 'a towel', 'ein Handtuch'),
          chunk('please', 'please', 'bitte'),
        ],
        extraLessonItems: [
          chunk('towel', 'towel', 'Handtuch'),
          chunk('bathroom', 'bathroom', 'Bad'),
          chunk('water', 'water', 'Wasser'),
          chunk('please', 'please', 'bitte'),
        ],
        targetChips: ['I need', 'a towel,', 'please.'],
        distractors: ['a ticket', 'a taxi'],
        typeRecall: recall('I need a ', 'towel', ', please.', ['towel', 'ticket', 'taxi', 'key']),
        sceneCaption: 'Bright bittet freundlich um ein Handtuch.',
        trophyWord: trophy('towel', 'Handtuch', 'I need a towel.', 'Towel ist ein konkreter Zimmeranker.'),
        mediaCaption: 'Hotelzimmer mit Handtüchern, freundliche Bitte.',
        songSeed: { genre: 'warm acoustic pop', mood: 'friendly towel ask' },
        visualNotes: 'Folded towel, room light, polite request.',
      }),
      wistful: createA1P8VariantInput({
        targetText: 'Could I have a towel?',
        baseText: 'Könnte ich ein Handtuch haben?',
        meaning: 'Eine sanfte Bitte um ein Handtuch.',
        chunks: [
          chunk('could-i-have', 'Could I have', 'könnte ich haben'),
          chunk('a-towel', 'a towel', 'ein Handtuch'),
        ],
        extraLessonItems: [
          chunk('wait', 'wait', 'warten'),
          chunk('towel', 'towel', 'Handtuch'),
          chunk('water', 'water', 'Wasser'),
          chunk('room', 'room', 'Zimmer'),
        ],
        targetChips: ['Could I have', 'a towel?'],
        distractors: ['a bus?', 'the key?'],
        typeRecall: recall('Could I have a ', 'towel', '?', ['towel', 'ticket', 'taxi', 'room']),
        sceneCaption: 'Wistful fragt vorsichtig nach einem Handtuch.',
        trophyWord: trophy('have', 'haben', 'Could I have a towel?', 'Have hält die ruhige Bitte im Zimmer alltagsnah.'),
        mediaCaption: 'Gedämpftes Zimmer, leise Bitte um ein Handtuch.',
        songSeed: { genre: 'soft indie folk', mood: 'careful towel ask' },
        visualNotes: 'Soft towel stack, tired glance, gentle ask.',
      }),
      sharp: createA1P8VariantInput({
        targetText: 'A towel, please.',
        baseText: 'Ein Handtuch, bitte.',
        meaning: 'Eine kurze, höfliche Bitte.',
        chunks: [
          chunk('a-towel', 'A towel', 'ein Handtuch'),
          chunk('please', 'please', 'bitte'),
        ],
        extraLessonItems: [
          chunk('clean', 'clean', 'sauber'),
          chunk('towel', 'towel', 'Handtuch'),
          chunk('bathroom', 'bathroom', 'Bad'),
          chunk('ready', 'ready', 'bereit'),
        ],
        targetChips: ['A towel,', 'please.'],
        distractors: ['A ticket', 'now'],
        typeRecall: recall('A ', 'towel', ', please.', ['towel', 'ticket', 'taxi', 'key']),
        sceneCaption: 'Sharp bleibt knapp und höflich.',
        trophyWord: trophy('clean', 'sauber', 'A clean towel, please.', 'Clean passt zum praktischen Hotelbedarf.'),
        mediaCaption: 'Klares Zimmerdetail mit Handtuch, kurzer Satz.',
        songSeed: { genre: 'minimal synth pulse', mood: 'direct towel ask' },
        visualNotes: 'Towel detail, clean line, concise request.',
      }),
    },
  },
  {
    slug: 'i-want-to-sleep',
    title: 'I want to sleep',
    situation: {
      en: 'After arriving, you say you want to sleep.',
      de: 'Nach der Ankunft sagst du, dass du schlafen möchtest.',
    },
    pedagogicalGoal: 'Say you want to sleep with a short, concrete phrase.',
    variants: {
      bright: createA1P8VariantInput({
        targetText: 'I want to sleep now.',
        baseText: 'Ich möchte jetzt schlafen.',
        meaning: 'Ein einfacher Satz nach der Ankunft.',
        chunks: [
          chunk('i-want', 'I want', 'ich möchte'),
          chunk('to-sleep', 'to sleep', 'schlafen'),
          chunk('now', 'now', 'jetzt'),
        ],
        extraLessonItems: [
          chunk('sleep', 'sleep', 'schlafen'),
          chunk('night', 'night', 'Nacht'),
          chunk('room', 'room', 'Zimmer'),
          chunk('ready', 'ready', 'bereit'),
        ],
        targetChips: ['I want', 'to sleep', 'now.'],
        distractors: ['to travel', 'at breakfast'],
        typeRecall: recall('I want to ', 'sleep', ' now.', ['sleep', 'leave', 'wait', 'arrive']),
        sceneCaption: 'Bright sagt freundlich, dass er jetzt schlafen möchte.',
        trophyWord: trophy('sleep', 'schlafen', 'I want to sleep.', 'Sleep ist der konkrete Anker nach dem Einchecken.'),
        mediaCaption: 'Ruhiges Hotelzimmer, klare Aussage vor dem Schlafen.',
        songSeed: { genre: 'light acoustic pop', mood: 'friendly sleep close' },
        visualNotes: 'Bedside light, simple sleep cue, relaxed tone.',
      }),
      wistful: createA1P8VariantInput({
        targetText: 'I am tired and want to sleep.',
        baseText: 'Ich bin müde und möchte schlafen.',
        meaning: 'Ein sanfter Satz, wenn du müde bist.',
        chunks: [
          chunk('i-am-tired', 'I am tired', 'ich bin müde'),
          chunk('and-want', 'and want', 'und möchte'),
          chunk('to-sleep', 'to sleep', 'schlafen'),
        ],
        extraLessonItems: [
          chunk('ready', 'ready', 'bereit'),
          chunk('tired', 'tired', 'müde'),
          chunk('sleep', 'sleep', 'schlafen'),
          chunk('night', 'night', 'Nacht'),
        ],
        targetChips: ['I am tired', 'and want', 'to sleep.'],
        distractors: ['and need a taxi', 'to breakfast'],
        typeRecall: recall('I am tired and want to ', 'sleep', '.', ['sleep', 'leave', 'wait', 'eat']),
        sceneCaption: 'Wistful sagt müde, aber klar, dass er schlafen möchte.',
        trophyWord: trophy('tired', 'müde', 'I am tired.', 'Tired benennt das Gefühl am Ende des Tages konkret.'),
        mediaCaption: 'Gedämpftes Zimmerlicht, müde aber klare Aussage.',
        songSeed: { genre: 'soft indie folk', mood: 'tired sleep close' },
        visualNotes: 'Soft bed light, tired posture, sleep cue.',
      }),
      sharp: createA1P8VariantInput({
        targetText: 'I need sleep now.',
        baseText: 'Ich brauche jetzt Schlaf.',
        meaning: 'Ein direkter, menschlicher Satz nach einem langen Tag.',
        chunks: [
          chunk('i-need', 'I need', 'ich brauche'),
          chunk('sleep', 'sleep', 'Schlaf'),
          chunk('now', 'now', 'jetzt'),
        ],
        extraLessonItems: [
          chunk('night', 'night', 'Nacht'),
          chunk('sleep', 'sleep', 'Schlaf'),
          chunk('room', 'room', 'Zimmer'),
          chunk('clear', 'clear', 'klar'),
        ],
        targetChips: ['I need', 'sleep', 'now.'],
        distractors: ['a taxi', 'later'],
        typeRecall: recall('I need ', 'sleep', ' now.', ['sleep', 'water', 'ticket', 'breakfast']),
        sceneCaption: 'Sharp sagt direkt, dass Schlaf jetzt wichtig ist.',
        trophyWord: trophy('need', 'brauchen', 'I need sleep.', 'Need ist Sharps direkter Anker für das Nachtbedürfnis.'),
        mediaCaption: 'Klares Zimmerlicht, Bett im Fokus, kurzer Satz.',
        songSeed: { genre: 'minimal synth pulse', mood: 'direct sleep close' },
        visualNotes: 'Bed edge, clean frame, direct sleep need.',
      }),
    },
  },
  {
    slug: 'what-time-is-breakfast',
    title: 'What time is breakfast?',
    situation: {
      en: 'You ask about breakfast time.',
      de: 'Du fragst nach der Frühstückszeit.',
    },
    pedagogicalGoal: 'Ask about breakfast time without extra hotel planning detail.',
    variants: {
      bright: createA1P8VariantInput({
        targetText: 'What time is breakfast?',
        baseText: 'Um wie viel Uhr ist Frühstück?',
        meaning: 'Eine klare Frage nach der Frühstückszeit.',
        chunks: [
          chunk('what-time', 'What time', 'um wie viel Uhr'),
          chunk('is-breakfast', 'is breakfast', 'ist Frühstück'),
        ],
        extraLessonItems: [
          chunk('breakfast', 'breakfast', 'Frühstück'),
          chunk('morning', 'morning', 'Morgen'),
          chunk('time', 'time', 'Uhrzeit'),
          chunk('hotel', 'hotel', 'Hotel'),
        ],
        targetChips: ['What time', 'is breakfast?'],
        distractors: ['is the taxi?', 'is my key?'],
        typeRecall: recall('What time is ', 'breakfast', '?', ['breakfast', 'the bus', 'the key', 'the taxi']),
        sceneCaption: 'Bright fragt freundlich nach der Frühstückszeit.',
        trophyWord: trophy('breakfast', 'Frühstück', 'What time is breakfast?', 'Breakfast ist der Morgenanker im Hotel.'),
        mediaCaption: 'Frühstücksschild im Hotel, freundliche Zeitfrage.',
        songSeed: { genre: 'warm acoustic pop', mood: 'friendly breakfast ask' },
        visualNotes: 'Breakfast sign, clock cue, open question.',
      }),
      wistful: createA1P8VariantInput({
        targetText: 'When is breakfast in the morning?',
        baseText: 'Wann ist Frühstück am Morgen?',
        meaning: 'Eine vorsichtige Frage nach dem Morgen.',
        chunks: [
          chunk('when-is', 'When is', 'wann ist'),
          chunk('breakfast', 'breakfast', 'Frühstück'),
          chunk('in-the-morning', 'in the morning', 'am Morgen'),
        ],
        extraLessonItems: [
          chunk('morning', 'morning', 'Morgen'),
          chunk('breakfast', 'breakfast', 'Frühstück'),
          chunk('time', 'time', 'Zeit'),
          chunk('ready', 'ready', 'bereit'),
        ],
        targetChips: ['When is', 'breakfast', 'in the morning?'],
        distractors: ['the train', 'at night?'],
        typeRecall: recall('When is ', 'breakfast', ' in the morning?', ['breakfast', 'the taxi', 'the room', 'the station']),
        sceneCaption: 'Wistful fragt ruhig nach dem Frühstück am Morgen.',
        trophyWord: trophy('morning', 'Morgen', 'Breakfast is in the morning.', 'Morning passt zur einfachen Frühstücksfrage.'),
        mediaCaption: 'Gedämpftes Lobbyschild, ruhige Frage zum Morgen.',
        songSeed: { genre: 'soft indie folk', mood: 'careful breakfast ask' },
        visualNotes: 'Soft breakfast sign, morning cue, careful question.',
      }),
      sharp: createA1P8VariantInput({
        targetText: 'Please tell me the breakfast time.',
        baseText: 'Bitte sagen Sie mir die Frühstückszeit.',
        meaning: 'Eine direkte, höfliche Bitte um die Zeit.',
        chunks: [
          chunk('please-tell-me', 'Please tell me', 'bitte sagen Sie mir'),
          chunk('the-breakfast-time', 'the breakfast time', 'die Frühstückszeit'),
        ],
        extraLessonItems: [
          chunk('time', 'time', 'Zeit'),
          chunk('breakfast', 'breakfast', 'Frühstück'),
          chunk('clear', 'clear', 'klar'),
          chunk('morning', 'morning', 'Morgen'),
        ],
        targetChips: ['Please tell me', 'the breakfast time.'],
        distractors: ['the train time', 'my towel'],
        typeRecall: recall('Please tell me the breakfast ', 'time', '.', ['time', 'key', 'ticket', 'room']),
        sceneCaption: 'Sharp fragt direkt nach der Frühstückszeit.',
        trophyWord: trophy('serve', 'servieren', 'When do you serve breakfast?', 'Serve ist Sharps konkrete Frage zur Frühstückszeit.'),
        mediaCaption: 'Klares Schild mit Frühstückszeit, sachliche Frage.',
        songSeed: { genre: 'minimal synth pulse', mood: 'direct breakfast ask' },
        visualNotes: 'Clock and breakfast sign, concise ask, clean frame.',
      }),
    },
  },
  {
    slug: 'i-am-checking-out',
    title: 'I am checking out',
    situation: {
      en: 'At the desk, you say you are checking out.',
      de: 'An der Rezeption sagst du, dass du auscheckst.',
    },
    pedagogicalGoal: 'Close a hotel stay with a simple checkout phrase.',
    variants: {
      bright: createA1P8VariantInput({
        targetText: 'I am checking out now.',
        baseText: 'Ich checke jetzt aus.',
        meaning: 'Ein freundlicher Abschluss an der Rezeption.',
        chunks: [
          chunk('i-am', 'I am', 'ich'),
          chunk('checking-out', 'checking out', 'checke aus'),
          chunk('now', 'now', 'jetzt'),
        ],
        extraLessonItems: [
          chunk('checking-out', 'checking out', 'auschecken'),
          chunk('hotel', 'hotel', 'Hotel'),
          chunk('key', 'key', 'Schlüssel'),
          chunk('thanks', 'thanks', 'danke'),
        ],
        targetChips: ['I am', 'checking out', 'now.'],
        distractors: ['checking in', 'by taxi'],
        typeRecall: recall('I am ', 'checking out', ' now.', ['checking out', 'checking in', 'waiting here', 'going there']),
        sceneCaption: 'Bright beendet den Aufenthalt freundlich.',
        trophyWord: trophy('checking out', 'auschecken', 'I am checking out.', 'Checking out schließt den Hotelbesuch praktisch ab.'),
        mediaCaption: 'Hotelrezeption beim Auschecken, freundlicher Abschluss.',
        songSeed: { genre: 'light acoustic pop', mood: 'friendly checkout close' },
        visualNotes: 'Checkout desk, key return, warm close.',
      }),
      wistful: createA1P8VariantInput({
        targetText: 'I am leaving the hotel now.',
        baseText: 'Ich verlasse jetzt das Hotel.',
        meaning: 'Ein ruhiger Satz zum Abschied vom Hotel.',
        chunks: [
          chunk('i-am-leaving', 'I am leaving', 'ich verlasse'),
          chunk('the-hotel', 'the hotel', 'das Hotel'),
          chunk('now', 'now', 'jetzt'),
        ],
        extraLessonItems: [
          chunk('arrived', 'arrived', 'angekommen'),
          chunk('hotel', 'hotel', 'Hotel'),
          chunk('morning', 'morning', 'Morgen'),
          chunk('thanks', 'thanks', 'danke'),
        ],
        targetChips: ['I am leaving', 'the hotel', 'now.'],
        distractors: ['the taxi', 'breakfast'],
        typeRecall: recall('I am leaving the ', 'hotel', ' now.', ['hotel', 'station', 'bus', 'room']),
        sceneCaption: 'Wistful verabschiedet sich leise vom Hotel.',
        trophyWord: trophy('leaving', 'gehe', 'I am leaving now.', 'Leaving macht den Checkout-Abschied konkret und leise.'),
        mediaCaption: 'Gedämpfte Lobby, kurzer Abschied nach dem Aufenthalt.',
        songSeed: { genre: 'soft indie folk', mood: 'quiet checkout close' },
        visualNotes: 'Soft lobby exit, small goodbye, leaving cue.',
      }),
      sharp: createA1P8VariantInput({
        targetText: 'I would like to check out.',
        baseText: 'Ich möchte auschecken.',
        meaning: 'Eine klare, höfliche Checkout-Bitte.',
        chunks: [
          chunk('i-would-like', 'I would like', 'ich möchte'),
          chunk('to-check-out', 'to check out', 'auschecken'),
        ],
        extraLessonItems: [
          chunk('done', 'done', 'fertig'),
          chunk('checkout', 'checkout', 'Auschecken'),
          chunk('hotel', 'hotel', 'Hotel'),
          chunk('clear', 'clear', 'klar'),
        ],
        targetChips: ['I would like', 'to check out.'],
        distractors: ['to sleep', 'for breakfast'],
        typeRecall: recall('I would like to ', 'check out', '.', ['check out', 'sleep now', 'go there', 'call help']),
        sceneCaption: 'Sharp schließt den Aufenthalt klar und höflich ab.',
        trophyWord: trophy('paid', 'bezahlt', 'I have paid.', 'Paid macht den Checkout-Abschluss greifbar.'),
        mediaCaption: 'Klarer Empfangstresen, Schlüsselrückgabe, direkter Abschluss.',
        songSeed: { genre: 'minimal synth pulse', mood: 'direct checkout close' },
        visualNotes: 'Checkout line, key return, composed close.',
      }),
    },
  },
]

const a1Practical8Lessons: GuidedLessonDefinition[] = a1Practical8Inputs.map((lessonInput, index) => {
  const lessonNumber = index + 1
  const id = `english-a1-practical-8-${String(lessonNumber).padStart(3, '0')}-${lessonInput.slug}`
  const nextInput = a1Practical8Inputs[index + 1]

  return {
    id,
    pathId: GUIDED_TODAY_PATH_EIGHT_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_EIGHT_METADATA.title,
    level: GUIDED_TODAY_PATH_EIGHT_METADATA.level,
    lessonNumber,
    baseLanguage: GUIDED_TODAY_PATH_EIGHT_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_EIGHT_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_EIGHT_METADATA,
    lessonMetadata: {
      id,
      sequence: lessonNumber,
      title: lessonInput.title,
    },
    title: lessonInput.title,
    situation: lessonInput.situation,
    pedagogicalGoal: lessonInput.pedagogicalGoal,
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: nextInput?.title ?? 'Path complete',
      situation: nextInput?.situation.de ?? 'Du hast English A1 P8 abgeschlossen.',
    },
    vibeVariants: {
      bright: createA1P2Variant(lessonInput.variants.bright),
      wistful: createA1P2Variant(lessonInput.variants.wistful),
      sharp: createA1P2Variant(lessonInput.variants.sharp),
    },
  }
})

type A1P9LessonInput = A1P2LessonInput

const a1Practical9Inputs: A1P9LessonInput[] = [
  {
    slug: 'nice-to-meet-you',
    title: 'Nice to meet you',
    situation: {
      en: 'You meet someone new and greet them politely.',
      de: 'Du triffst jemanden neu und begrüßt die Person höflich.',
    },
    pedagogicalGoal: 'Open a simple social interaction with a short friendly greeting.',
    variants: {
      bright: createA1P9VariantInput({
        targetText: "Hi, I'm really glad to meet you.",
        baseText: 'Hallo, ich freue mich sehr, Sie kennenzulernen.',
        meaning: 'Ein warmer Satz, wenn du jemanden neu triffst.',
        chunks: [
          chunk('hi', 'Hi', 'hallo'),
          chunk('im-really-glad', "I'm really glad", 'ich freue mich sehr'),
          chunk('to-meet-you', 'to meet you', 'Sie kennenzulernen'),
        ],
        extraLessonItems: [
          chunk('meet', 'meet', 'treffen'),
          chunk('friendly', 'friendly', 'freundlich'),
          chunk('hello', 'hello', 'hallo'),
          chunk('today', 'today', 'heute'),
        ],
        targetChips: ['Hi,', "I'm really glad", 'to meet you.'],
        distractors: ['see tomorrow', 'wait outside'],
        typeRecall: recall('Hi, I\'m really glad to ', 'meet', ' you.', ['meet', 'wait', 'change', 'arrive']),
        sceneCaption: 'Bright begrüßt die neue Person offen und freundlich.',
        trophyWord: trophy('meet', 'treffen', "I'm really glad to meet you.", 'Meet ist der klare Anker für eine erste Begegnung.'),
        mediaCaption: 'Zwei Personen begrüßen sich freundlich an einem öffentlichen Ort.',
        songSeed: { genre: 'warm acoustic pop', mood: 'friendly first meeting' },
        visualNotes: 'Open posture, simple greeting, social start.',
      }),
      wistful: createA1P9VariantInput({
        targetText: 'It is nice to meet you.',
        baseText: 'Es ist schön, Sie kennenzulernen.',
        meaning: 'Ein ruhiger, höflicher Satz für ein erstes Treffen.',
        chunks: [
          chunk('it-is-nice', 'It is nice', 'es ist schön'),
          chunk('to-meet-you', 'to meet you', 'Sie kennenzulernen'),
        ],
        extraLessonItems: [
          chunk('careful', 'careful', 'vorsichtig'),
          chunk('meet', 'meet', 'treffen'),
          chunk('quiet', 'quiet', 'ruhig'),
          chunk('hello', 'hello', 'hallo'),
        ],
        targetChips: ['It is nice', 'to meet you.'],
        distractors: ['to change it', 'to wait here'],
        typeRecall: recall('It is nice to ', 'meet', ' you.', ['meet', 'wait', 'leave', 'change']),
        sceneCaption: 'Wistful sagt den Gruß ruhig und vorsichtig.',
        trophyWord: trophy('nice', 'schön', 'It is nice to meet you.', 'Nice ist Wistfuls ruhiger erster Gruß ohne Druck.'),
        mediaCaption: 'Ruhige Begrüßung, kurze Pause vor dem Gespräch.',
        songSeed: { genre: 'soft indie folk', mood: 'gentle first meeting' },
        visualNotes: 'Soft light, small greeting, careful tone.',
      }),
      sharp: createA1P9VariantInput({
        targetText: 'Good to meet you.',
        baseText: 'Gut, Sie kennenzulernen.',
        meaning: 'Ein kurzer, klarer Satz beim Kennenlernen.',
        chunks: [
          chunk('good-to', 'Good to', 'gut zu'),
          chunk('meet-you', 'meet you', 'Sie kennenlernen'),
        ],
        extraLessonItems: [
          chunk('ready', 'ready', 'bereit'),
          chunk('meet', 'meet', 'treffen'),
          chunk('clear', 'clear', 'klar'),
          chunk('hello', 'hello', 'hallo'),
        ],
        targetChips: ['Good to', 'meet you.'],
        distractors: ['Good to wait', 'here now'],
        typeRecall: recall('Good to ', 'meet', ' you.', ['meet', 'wait', 'change', 'leave']),
        sceneCaption: 'Sharp bleibt kurz und höflich beim ersten Treffen.',
        trophyWord: trophy('greet', 'begrüßen', 'Greet a new friend.', 'Greet ist Sharps kurzer Anker für den ersten sozialen Schritt.'),
        mediaCaption: 'Klare Begrüßung, kurze soziale Koordination beginnt.',
        songSeed: { genre: 'minimal synth pulse', mood: 'direct first meeting' },
        visualNotes: 'Clean framing, direct greeting, composed tone.',
      }),
    },
  },
  {
    slug: 'are-you-free-today',
    title: 'Are you free today?',
    situation: {
      en: 'You ask if someone has time today.',
      de: 'Du fragst, ob jemand heute Zeit hat.',
    },
    pedagogicalGoal: 'Ask about availability with a short, practical question.',
    variants: {
      bright: createA1P9VariantInput({
        targetText: 'Are you free today?',
        baseText: 'Haben Sie heute Zeit?',
        meaning: 'Eine freundliche Frage, ob jemand heute Zeit hat.',
        chunks: [
          chunk('are-you-free', 'Are you free', 'haben Sie Zeit'),
          chunk('today', 'today', 'heute'),
        ],
        extraLessonItems: [
          chunk('free', 'free', 'frei'),
          chunk('today', 'today', 'heute'),
          chunk('time', 'time', 'Zeit'),
          chunk('meet', 'meet', 'treffen'),
        ],
        targetChips: ['Are you free', 'today?'],
        distractors: ['tomorrow?', 'outside?'],
        typeRecall: recall('Are you ', 'free', ' today?', ['free', 'late', 'outside', 'ready']),
        sceneCaption: 'Bright fragt freundlich nach Zeit heute.',
        trophyWord: trophy('free', 'frei', 'Are you free today?', 'Free ist ein einfacher Anker für soziale Planung.'),
        mediaCaption: 'Freundliche Frage nach Zeit in einem Café oder Flur.',
        songSeed: { genre: 'light acoustic pop', mood: 'friendly availability check' },
        visualNotes: 'Calendar-free cue, open question, warm tone.',
      }),
      wistful: createA1P9VariantInput({
        targetText: 'Do you have time today?',
        baseText: 'Haben Sie heute Zeit?',
        meaning: 'Eine sanfte Frage nach Zeit heute.',
        chunks: [
          chunk('do-you-have', 'Do you have', 'haben Sie'),
          chunk('time-today', 'time today', 'heute Zeit'),
        ],
        extraLessonItems: [
          chunk('today', 'today', 'heute'),
          chunk('time', 'time', 'Zeit'),
          chunk('careful', 'careful', 'vorsichtig'),
          chunk('free', 'free', 'frei'),
        ],
        targetChips: ['Do you have', 'time today?'],
        distractors: ['a key?', 'outside?'],
        typeRecall: recall('Do you have ', 'time', ' today?', ['time', 'room', 'ticket', 'water']),
        sceneCaption: 'Wistful fragt vorsichtig, ob heute Zeit ist.',
        trophyWord: trophy('maybe', 'vielleicht', 'Maybe today?', 'Maybe hält Wistfuls vorsichtige Verfügbarkeitsfrage offen.'),
        mediaCaption: 'Leise Frage nach Zeit, ohne Druck.',
        songSeed: { genre: 'soft indie folk', mood: 'careful availability check' },
        visualNotes: 'Small pause, calendar today cue, gentle ask.',
      }),
      sharp: createA1P9VariantInput({
        targetText: 'Are you available today?',
        baseText: 'Sind Sie heute verfügbar?',
        meaning: 'Eine klare Frage nach Zeit heute.',
        chunks: [
          chunk('are-you-available', 'Are you available', 'sind Sie verfügbar'),
          chunk('today', 'today', 'heute'),
        ],
        extraLessonItems: [
          chunk('available', 'available', 'verfügbar'),
          chunk('clear', 'clear', 'klar'),
          chunk('today', 'today', 'heute'),
          chunk('time', 'time', 'Zeit'),
        ],
        targetChips: ['Are you available', 'today?'],
        distractors: ['late?', 'outside?'],
        typeRecall: recall('Are you ', 'available', ' today?', ['available', 'waiting', 'arrived', 'checking out']),
        sceneCaption: 'Sharp fragt klar, ob heute Zeit ist.',
        trophyWord: trophy('available', 'verfügbar', 'Are you available?', 'Available passt zur direkten Verfügbarkeitsfrage.'),
        mediaCaption: 'Sachliche Frage nach heutiger Verfügbarkeit.',
        songSeed: { genre: 'minimal synth pulse', mood: 'direct availability check' },
        visualNotes: 'Clean calendar cue, direct phrasing, composed tone.',
      }),
    },
  },
  {
    slug: 'can-we-meet-later',
    title: 'Can we meet later?',
    situation: {
      en: 'You suggest meeting later.',
      de: 'Du schlägst vor, sich später zu treffen.',
    },
    pedagogicalGoal: 'Suggest a later meeting with one short question.',
    variants: {
      bright: createA1P9VariantInput({
        targetText: 'Can we meet later?',
        baseText: 'Können wir uns später treffen?',
        meaning: 'Eine einfache, freundliche Frage für später.',
        chunks: [
          chunk('can-we-meet', 'Can we meet', 'können wir uns treffen'),
          chunk('later', 'later', 'später'),
        ],
        extraLessonItems: [
          chunk('later', 'later', 'später'),
          chunk('meet', 'meet', 'treffen'),
          chunk('please', 'please', 'bitte'),
          chunk('time', 'time', 'Zeit'),
        ],
        targetChips: ['Can we meet', 'later?'],
        distractors: ['outside?', 'the key?'],
        typeRecall: recall('Can we meet ', 'later', '?', ['later', 'outside', 'tomorrow', 'there']),
        sceneCaption: 'Bright schlägt freundlich ein späteres Treffen vor.',
        trophyWord: trophy('later', 'später', 'Can we meet later?', 'Later ist ein praktischer Planungsanker.'),
        mediaCaption: 'Freundliche kurze Frage zu einem späteren Treffen.',
        songSeed: { genre: 'warm acoustic pop', mood: 'friendly later plan' },
        visualNotes: 'Simple plan cue, open social tone.',
      }),
      wistful: createA1P9VariantInput({
        targetText: 'Could we meet a little later?',
        baseText: 'Könnten wir uns etwas später treffen?',
        meaning: 'Eine vorsichtige Bitte um ein späteres Treffen.',
        chunks: [
          chunk('could-we-meet', 'Could we meet', 'könnten wir uns treffen'),
          chunk('a-little-later', 'a little later', 'etwas später'),
        ],
        extraLessonItems: [
          chunk('soon', 'soon', 'bald'),
          chunk('later', 'later', 'später'),
          chunk('careful', 'careful', 'vorsichtig'),
          chunk('meet', 'meet', 'treffen'),
        ],
        targetChips: ['Could we meet', 'a little later?'],
        distractors: ['at the station?', 'the room?'],
        typeRecall: recall('Could we meet a little ', 'later', '?', ['later', 'free', 'late', 'right']),
        sceneCaption: 'Wistful fragt sanft nach etwas später.',
        trophyWord: trophy('soon', 'bald', 'We can meet soon.', 'Soon hält den Vorschlag weich und praktisch.'),
        mediaCaption: 'Ruhige soziale Frage nach einem späteren Zeitpunkt.',
        songSeed: { genre: 'soft indie folk', mood: 'gentle later plan' },
        visualNotes: 'Soft clock cue, careful request, human pause.',
      }),
      sharp: createA1P9VariantInput({
        targetText: "Let's meet later.",
        baseText: 'Treffen wir uns später.',
        meaning: 'Ein klarer, höflicher Vorschlag.',
        chunks: [
          chunk('lets-meet', "Let's meet", 'treffen wir uns'),
          chunk('later', 'later', 'später'),
        ],
        extraLessonItems: [
          chunk('there', 'there', 'dort'),
          chunk('later', 'later', 'später'),
          chunk('meet', 'meet', 'treffen'),
          chunk('ready', 'ready', 'bereit'),
        ],
        targetChips: ["Let's meet", 'later.'],
        distractors: ["Let's wait", 'outside.'],
        typeRecall: recall("Let's meet ", 'later', '.', ['later', 'outside', 'today', 'free']),
        sceneCaption: 'Sharp macht einen klaren Vorschlag für später.',
        trophyWord: trophy('see', 'sehen', "Let's see each other later.", 'See ist Sharps direkter Anker für späteres Wiedersehen.'),
        mediaCaption: 'Klarer kurzer Vorschlag für ein späteres Treffen.',
        songSeed: { genre: 'minimal synth pulse', mood: 'direct later plan' },
        visualNotes: 'Clean time cue, composed social plan.',
      }),
    },
  },
  {
    slug: 'what-time-works-for-you',
    title: 'What time works for you?',
    situation: {
      en: 'You ask which time is good for the other person.',
      de: 'Du fragst, welche Uhrzeit für die andere Person passt.',
    },
    pedagogicalGoal: 'Ask for a workable time with a short planning question.',
    variants: {
      bright: createA1P9VariantInput({
        targetText: 'What time works for you?',
        baseText: 'Welche Uhrzeit passt für Sie?',
        meaning: 'Eine freundliche Frage nach einer passenden Zeit.',
        chunks: [
          chunk('what-time', 'What time', 'welche Uhrzeit'),
          chunk('works-for-you', 'works for you', 'passt für Sie'),
        ],
        extraLessonItems: [
          chunk('time', 'time', 'Zeit'),
          chunk('works', 'works', 'passt'),
          chunk('free', 'free', 'frei'),
          chunk('today', 'today', 'heute'),
        ],
        targetChips: ['What time', 'works for you?'],
        distractors: ['which room', 'outside now'],
        typeRecall: recall('What ', 'time', ' works for you?', ['time', 'room', 'train', 'key']),
        sceneCaption: 'Bright fragt freundlich nach einer guten Uhrzeit.',
        trophyWord: trophy('time', 'Zeit', 'What time works for you?', 'Time ist der zentrale Anker für einfache Pläne.'),
        mediaCaption: 'Freundliche Zeitfrage mit kleinem Kalenderhinweis.',
        songSeed: { genre: 'light acoustic pop', mood: 'friendly time question' },
        visualNotes: 'Clock cue, friendly planning, simple question.',
      }),
      wistful: createA1P9VariantInput({
        targetText: 'Is there a good time for you?',
        baseText: 'Gibt es eine gute Zeit für Sie?',
        meaning: 'Eine sanfte Frage nach einer passenden Zeit.',
        chunks: [
          chunk('is-there', 'Is there', 'gibt es'),
          chunk('a-good-time', 'a good time', 'eine gute Zeit'),
          chunk('for-you', 'for you', 'für Sie'),
        ],
        extraLessonItems: [
          chunk('works', 'works', 'passt'),
          chunk('time', 'time', 'Zeit'),
          chunk('careful', 'careful', 'vorsichtig'),
          chunk('free', 'free', 'frei'),
        ],
        targetChips: ['Is there', 'a good time', 'for you?'],
        distractors: ['is the station?', 'is my room?'],
        typeRecall: recall('Is there a good ', 'time', ' for you?', ['time', 'late', 'outside', 'ready']),
        sceneCaption: 'Wistful fragt ruhig nach einer guten Zeit.',
        trophyWord: trophy('works', 'passt', 'That works for me.', 'Works hilft bei einfacher sozialer Abstimmung.'),
        mediaCaption: 'Ruhige Frage nach einer guten Uhrzeit.',
        songSeed: { genre: 'soft indie folk', mood: 'gentle time question' },
        visualNotes: 'Soft clock cue, careful planning tone.',
      }),
      sharp: createA1P9VariantInput({
        targetText: 'Which time works best?',
        baseText: 'Welche Uhrzeit passt am besten?',
        meaning: 'Eine direkte Frage nach der besten Zeit.',
        chunks: [
          chunk('which-time', 'Which time', 'welche Uhrzeit'),
          chunk('works-best', 'works best', 'passt am besten'),
        ],
        extraLessonItems: [
          chunk('set', 'set', 'fest'),
          chunk('time', 'time', 'Zeit'),
          chunk('clear', 'clear', 'klar'),
          chunk('works', 'works', 'passt'),
        ],
        targetChips: ['Which time', 'works best?'],
        distractors: ['Which room', 'outside now'],
        typeRecall: recall('Which ', 'time', ' works best?', ['time', 'room', 'ticket', 'key']),
        sceneCaption: 'Sharp fragt klar nach der passenden Uhrzeit.',
        trophyWord: trophy('set', 'fest', 'Set a time.', 'Set passt zur kurzen, klaren Planung.'),
        mediaCaption: 'Sachliche Zeitabstimmung, kurze klare Frage.',
        songSeed: { genre: 'minimal synth pulse', mood: 'direct time question' },
        visualNotes: 'Clock line, direct plan, efficient tone.',
      }),
    },
  },
  {
    slug: 'lets-meet-here',
    title: "Let's meet here",
    situation: {
      en: 'You suggest this place for the meeting.',
      de: 'Du schlägst diesen Ort für das Treffen vor.',
    },
    pedagogicalGoal: 'Suggest a meeting place with short, concrete location language.',
    variants: {
      bright: createA1P9VariantInput({
        targetText: "Let's meet here.",
        baseText: 'Treffen wir uns hier.',
        meaning: 'Ein freundlicher Vorschlag für diesen Ort.',
        chunks: [
          chunk('lets-meet', "Let's meet", 'treffen wir uns'),
          chunk('here', 'here', 'hier'),
        ],
        extraLessonItems: [
          chunk('here', 'here', 'hier'),
          chunk('meet', 'meet', 'treffen'),
          chunk('place', 'place', 'Ort'),
          chunk('ready', 'ready', 'bereit'),
        ],
        targetChips: ["Let's meet", 'here.'],
        distractors: ["Let's wait", 'tomorrow.'],
        typeRecall: recall("Let's ", 'meet', ' here.', ['meet', 'wait', 'change', 'arrive']),
        sceneCaption: 'Bright schlägt diesen Ort freundlich vor.',
        trophyWord: trophy('café', 'Café', "Let's meet at the café.", 'Café macht den Treffpunkt sofort konkret.'),
        mediaCaption: 'Freundlicher Treffpunkt an einem klaren Ort.',
        songSeed: { genre: 'warm acoustic pop', mood: 'friendly place plan' },
        visualNotes: 'Simple place cue, open gesture, social plan.',
      }),
      wistful: createA1P9VariantInput({
        targetText: 'Could we meet here?',
        baseText: 'Könnten wir uns hier treffen?',
        meaning: 'Eine vorsichtige Frage nach diesem Treffpunkt.',
        chunks: [
          chunk('could-we-meet', 'Could we meet', 'könnten wir uns treffen'),
          chunk('here', 'here', 'hier'),
        ],
        extraLessonItems: [
          chunk('place', 'place', 'Ort'),
          chunk('here', 'here', 'hier'),
          chunk('careful', 'careful', 'vorsichtig'),
          chunk('meet', 'meet', 'treffen'),
        ],
        targetChips: ['Could we meet', 'here?'],
        distractors: ['the key?', 'late?'],
        typeRecall: recall('Could we ', 'meet', ' here?', ['meet', 'wait', 'change', 'arrive']),
        sceneCaption: 'Wistful fragt sanft, ob dieser Ort passt.',
        trophyWord: trophy('meeting', 'Treffen', 'A small meeting.', 'Meeting hält den Treffpunkt leise und konkret.'),
        mediaCaption: 'Ruhige Frage an einem möglichen Treffpunkt.',
        songSeed: { genre: 'soft indie folk', mood: 'careful place plan' },
        visualNotes: 'Soft location cue, small question, careful tone.',
      }),
      sharp: createA1P9VariantInput({
        targetText: 'We can meet here.',
        baseText: 'Wir können uns hier treffen.',
        meaning: 'Ein klarer Vorschlag für diesen Ort.',
        chunks: [
          chunk('we-can-meet', 'We can meet', 'wir können uns treffen'),
          chunk('here', 'here', 'hier'),
        ],
        extraLessonItems: [
          chunk('right', 'right', 'richtig'),
          chunk('here', 'here', 'hier'),
          chunk('meet', 'meet', 'treffen'),
          chunk('clear', 'clear', 'klar'),
        ],
        targetChips: ['We can meet', 'here.'],
        distractors: ['We can wait', 'tomorrow.'],
        typeRecall: recall('We can ', 'meet', ' here.', ['meet', 'wait', 'change', 'arrive']),
        sceneCaption: 'Sharp nennt den Treffpunkt klar und höflich.',
        trophyWord: trophy('fixed', 'fest', 'The place is fixed.', 'Fixed macht den Treffpunkt entschieden und klar.'),
        mediaCaption: 'Klarer Treffpunkt, kurze praktische Aussage.',
        songSeed: { genre: 'minimal synth pulse', mood: 'direct place plan' },
        visualNotes: 'Clean location marker, composed plan.',
      }),
    },
  },
  {
    slug: 'i-am-waiting-outside',
    title: 'I am waiting outside',
    situation: {
      en: 'You tell someone you are waiting outside.',
      de: 'Du sagst jemandem, dass du draußen wartest.',
    },
    pedagogicalGoal: 'Say where you are waiting with a short status update.',
    variants: {
      bright: createA1P9VariantInput({
        targetText: 'I am waiting outside.',
        baseText: 'Ich warte draußen.',
        meaning: 'Ein klarer Statussatz, wenn du draußen wartest.',
        chunks: [
          chunk('i-am-waiting', 'I am waiting', 'ich warte'),
          chunk('outside', 'outside', 'draußen'),
        ],
        extraLessonItems: [
          chunk('waiting', 'waiting', 'warten'),
          chunk('outside', 'outside', 'draußen'),
          chunk('here', 'here', 'hier'),
          chunk('meet', 'meet', 'treffen'),
        ],
        targetChips: ['I am waiting', 'outside.'],
        distractors: ['inside.', 'tomorrow.'],
        typeRecall: recall('I am waiting ', 'outside', '.', ['outside', 'later', 'late', 'free']),
        sceneCaption: 'Bright sagt freundlich, dass er draußen wartet.',
        trophyWord: trophy('waiting', 'warten', 'I am waiting outside.', 'Waiting ist der klare Anker für den Status.'),
        mediaCaption: 'Person wartet freundlich draußen vor einem Gebäude.',
        songSeed: { genre: 'light acoustic pop', mood: 'friendly waiting update' },
        visualNotes: 'Outside doorway, waiting cue, warm update.',
      }),
      wistful: createA1P9VariantInput({
        targetText: 'I am outside and waiting.',
        baseText: 'Ich bin draußen und warte.',
        meaning: 'Ein ruhiger Satz, wenn du draußen wartest.',
        chunks: [
          chunk('i-am-outside', 'I am outside', 'ich bin draußen'),
          chunk('and-waiting', 'and waiting', 'und warte'),
        ],
        extraLessonItems: [
          chunk('outside', 'outside', 'draußen'),
          chunk('waiting', 'waiting', 'warten'),
          chunk('careful', 'careful', 'vorsichtig'),
          chunk('here', 'here', 'hier'),
        ],
        targetChips: ['I am outside', 'and waiting.'],
        distractors: ['at breakfast', 'with the key'],
        typeRecall: recall('I am ', 'outside', ' and waiting.', ['outside', 'inside', 'late', 'free']),
        sceneCaption: 'Wistful meldet ruhig, dass er draußen wartet.',
        trophyWord: trophy('outside', 'draußen', 'I am outside.', 'Outside macht den Treffpunkt klar.'),
        mediaCaption: 'Ruhiges Warten draußen, kurze Nachricht.',
        songSeed: { genre: 'soft indie folk', mood: 'gentle waiting update' },
        visualNotes: 'Soft exterior light, waiting posture, careful tone.',
      }),
      sharp: createA1P9VariantInput({
        targetText: 'I am outside now.',
        baseText: 'Ich bin jetzt draußen.',
        meaning: 'Ein kurzer, klarer Statussatz.',
        chunks: [
          chunk('i-am', 'I am', 'ich bin'),
          chunk('outside-now', 'outside now', 'jetzt draußen'),
        ],
        extraLessonItems: [
          chunk('wait', 'wait', 'warten'),
          chunk('outside', 'outside', 'draußen'),
          chunk('now', 'now', 'jetzt'),
          chunk('clear', 'clear', 'klar'),
        ],
        targetChips: ['I am', 'outside now.'],
        distractors: ['late today.', 'free here.'],
        typeRecall: recall('I am ', 'outside', ' now.', ['outside', 'later', 'late', 'free']),
        sceneCaption: 'Sharp gibt den Standort kurz und klar durch.',
        trophyWord: trophy('ahead', 'vorab', 'I am ahead of time.', 'Ahead macht Sharps pünktliche Ortsmeldung greifbar.'),
        mediaCaption: 'Klarer Standort draußen, kurze Nachricht.',
        songSeed: { genre: 'minimal synth pulse', mood: 'direct waiting update' },
        visualNotes: 'Clean exterior frame, concise update.',
      }),
    },
  },
  {
    slug: 'i-am-running-late',
    title: 'I am running late',
    situation: {
      en: 'You tell someone you will not arrive on time.',
      de: 'Du sagst jemandem, dass du nicht pünktlich ankommst.',
    },
    pedagogicalGoal: 'Give a simple late-arrival update without complicated tense work.',
    variants: {
      bright: createA1P9VariantInput({
        targetText: 'I am running late.',
        baseText: 'Ich bin spät dran.',
        meaning: 'Ein gebräuchlicher kurzer Satz, wenn du zu spät bist.',
        chunks: [
          chunk('i-am-running', 'I am running', 'ich bin'),
          chunk('late', 'late', 'spät dran'),
        ],
        extraLessonItems: [
          chunk('late', 'late', 'spät'),
          chunk('waiting', 'waiting', 'warten'),
          chunk('sorry', 'sorry', 'entschuldigung'),
          chunk('time', 'time', 'Zeit'),
        ],
        targetChips: ['I am running', 'late.'],
        distractors: ['outside.', 'tomorrow.'],
        typeRecall: recall('I am running ', 'late', '.', ['late', 'free', 'outside', 'ready']),
        sceneCaption: 'Bright sagt freundlich, dass er spät dran ist.',
        trophyWord: trophy('late', 'spät', 'I am running late.', 'Late ist der praktische Anker für eine Verspätung.'),
        mediaCaption: 'Freundliche kurze Nachricht, dass man spät dran ist.',
        songSeed: { genre: 'warm acoustic pop', mood: 'friendly late update' },
        visualNotes: 'Clock cue, gentle apology, practical update.',
      }),
      wistful: createA1P9VariantInput({
        targetText: 'Sorry, I am a little late.',
        baseText: 'Entschuldigung, ich bin etwas spät dran.',
        meaning: 'Ein sanfter Satz, wenn du dich für Verspätung meldest.',
        chunks: [
          chunk('sorry', 'Sorry', 'entschuldigung'),
          chunk('i-am-a-little-late', 'I am a little late', 'ich bin etwas spät dran'),
        ],
        extraLessonItems: [
          chunk('help', 'help', 'Hilfe'),
          chunk('late', 'late', 'spät'),
          chunk('sorry', 'sorry', 'entschuldigung'),
          chunk('wait', 'wait', 'warten'),
        ],
        targetChips: ['Sorry,', 'I am a little late.'],
        distractors: ['I am outside.', 'the room.'],
        typeRecall: recall('Sorry, I am a little ', 'late', '.', ['late', 'free', 'outside', 'ready']),
        sceneCaption: 'Wistful meldet die Verspätung vorsichtig.',
        trophyWord: trophy('sorry', 'es tut mir leid', 'Sorry, I am late.', 'Sorry öffnet Wistfuls leise Entschuldigung.'),
        mediaCaption: 'Ruhige Nachricht über eine kleine Verspätung.',
        songSeed: { genre: 'soft indie folk', mood: 'careful late update' },
        visualNotes: 'Soft clock cue, small apology, careful tone.',
      }),
      sharp: createA1P9VariantInput({
        targetText: 'I am late now.',
        baseText: 'Ich bin jetzt spät dran.',
        meaning: 'Ein direkter, klarer Statussatz.',
        chunks: [
          chunk('i-am', 'I am', 'ich bin'),
          chunk('late-now', 'late now', 'jetzt spät dran'),
        ],
        extraLessonItems: [
          chunk('quick', 'quick', 'schnell'),
          chunk('late', 'late', 'spät'),
          chunk('clear', 'clear', 'klar'),
          chunk('wait', 'wait', 'warten'),
        ],
        targetChips: ['I am', 'late now.'],
        distractors: ['free today.', 'outside here.'],
        typeRecall: recall('I am ', 'late', ' now.', ['late', 'free', 'outside', 'ready']),
        sceneCaption: 'Sharp meldet die Verspätung kurz und klar.',
        trophyWord: trophy('update', 'Update', 'A short update.', 'Update macht Sharps Statusmeldung präzise und aktuell.'),
        mediaCaption: 'Direkte kurze Nachricht über Verspätung.',
        songSeed: { genre: 'minimal synth pulse', mood: 'direct late update' },
        visualNotes: 'Clean clock cue, concise update.',
      }),
    },
  },
  {
    slug: 'can-we-change-the-plan',
    title: 'Can we change the plan?',
    situation: {
      en: 'You ask to change a simple plan.',
      de: 'Du fragst, ob ihr einen einfachen Plan ändern könnt.',
    },
    pedagogicalGoal: 'Ask for a plan change with short, polite language.',
    variants: {
      bright: createA1P9VariantInput({
        targetText: 'Can we change the plan?',
        baseText: 'Können wir den Plan ändern?',
        meaning: 'Eine freundliche Frage nach einer Planänderung.',
        chunks: [
          chunk('can-we-change', 'Can we change', 'können wir ändern'),
          chunk('the-plan', 'the plan', 'den Plan'),
        ],
        extraLessonItems: [
          chunk('change', 'change', 'ändern'),
          chunk('plan', 'plan', 'Plan'),
          chunk('ready', 'ready', 'bereit'),
          chunk('time', 'time', 'Zeit'),
        ],
        targetChips: ['Can we change', 'the plan?'],
        distractors: ['the key?', 'outside?'],
        typeRecall: recall('Can we ', 'change', ' the plan?', ['change', 'wait', 'meet', 'arrive']),
        sceneCaption: 'Bright fragt freundlich nach einer Änderung.',
        trophyWord: trophy('change', 'ändern', 'Can we change the plan?', 'Change ist der Kernanker für einfache neue Pläne.'),
        mediaCaption: 'Freundliche Frage, ob ein Plan geändert werden kann.',
        songSeed: { genre: 'light acoustic pop', mood: 'friendly plan change' },
        visualNotes: 'Simple plan note, open question, warm tone.',
      }),
      wistful: createA1P9VariantInput({
        targetText: 'Is a new plan okay?',
        baseText: 'Ist ein neuer Plan okay?',
        meaning: 'Eine sanfte Frage nach einem neuen Plan.',
        chunks: [
          chunk('is-a-new-plan', 'Is a new plan', 'ist ein neuer Plan'),
          chunk('okay', 'okay', 'okay'),
        ],
        extraLessonItems: [
          chunk('plan', 'plan', 'Plan'),
          chunk('change', 'change', 'ändern'),
          chunk('careful', 'careful', 'vorsichtig'),
          chunk('time', 'time', 'Zeit'),
        ],
        targetChips: ['Is a new plan', 'okay?'],
        distractors: ['my room', 'outside now'],
        typeRecall: recall('Is a new ', 'plan', ' okay?', ['plan', 'room', 'ticket', 'key']),
        sceneCaption: 'Wistful fragt vorsichtig nach einem neuen Plan.',
        trophyWord: trophy('plan', 'Plan', 'Is a new plan okay?', 'Plan hält die Änderung einfach und konkret.'),
        mediaCaption: 'Ruhige Frage zu einem neuen einfachen Plan.',
        songSeed: { genre: 'soft indie folk', mood: 'gentle plan change' },
        visualNotes: 'Soft note cue, careful request, human tone.',
      }),
      sharp: createA1P9VariantInput({
        targetText: 'We need to change the plan.',
        baseText: 'Wir müssen den Plan ändern.',
        meaning: 'Ein klarer Satz für eine Planänderung.',
        chunks: [
          chunk('we-need-to-change', 'We need to change', 'wir müssen ändern'),
          chunk('the-plan', 'the plan', 'den Plan'),
        ],
        extraLessonItems: [
          chunk('plan', 'plan', 'Plan'),
          chunk('change', 'change', 'ändern'),
          chunk('clear', 'clear', 'klar'),
          chunk('ready', 'ready', 'bereit'),
        ],
        targetChips: ['We need to change', 'the plan.'],
        distractors: ['the key.', 'outside.'],
        typeRecall: recall('We need to ', 'change', ' the plan.', ['change', 'wait', 'meet', 'arrive']),
        sceneCaption: 'Sharp nennt die Änderung klar und höflich.',
        trophyWord: trophy('new', 'neu', 'A new plan.', 'New macht den klaren Vorschlag für eine Änderung sichtbar.'),
        mediaCaption: 'Klare kurze Aussage zu einer Planänderung.',
        songSeed: { genre: 'minimal synth pulse', mood: 'direct plan change' },
        visualNotes: 'Clean note cue, direct plan update.',
      }),
    },
  },
  {
    slug: 'see-you-tomorrow',
    title: 'See you tomorrow',
    situation: {
      en: 'You confirm you will see the person tomorrow.',
      de: 'Du bestätigst, dass ihr euch morgen seht.',
    },
    pedagogicalGoal: 'Close a simple plan with a tomorrow phrase.',
    variants: {
      bright: createA1P9VariantInput({
        targetText: 'See you tomorrow.',
        baseText: 'Bis morgen.',
        meaning: 'Ein freundlicher kurzer Abschluss für morgen.',
        chunks: [
          chunk('see-you', 'See you', 'bis'),
          chunk('tomorrow', 'tomorrow', 'morgen'),
        ],
        extraLessonItems: [
          chunk('tomorrow', 'tomorrow', 'morgen'),
          chunk('see-you', 'see you', 'bis dann'),
          chunk('ready', 'ready', 'bereit'),
          chunk('meet', 'meet', 'treffen'),
        ],
        targetChips: ['See you', 'tomorrow.'],
        distractors: ['today.', 'outside.'],
        typeRecall: recall('See you ', 'tomorrow', '.', ['tomorrow', 'outside', 'later', 'today']),
        sceneCaption: 'Bright schließt freundlich mit morgen ab.',
        trophyWord: trophy('day', 'Tag', 'See you another day.', 'Day macht den nächsten Schritt offen und einfach.'),
        mediaCaption: 'Freundlicher Abschied mit Plan für morgen.',
        songSeed: { genre: 'warm acoustic pop', mood: 'friendly tomorrow close' },
        visualNotes: 'Small goodbye wave, tomorrow cue, warm close.',
      }),
      wistful: createA1P9VariantInput({
        targetText: 'Tomorrow works for me.',
        baseText: 'Morgen passt für mich.',
        meaning: 'Ein ruhiger Satz, wenn morgen für dich passt.',
        chunks: [
          chunk('tomorrow', 'Tomorrow', 'morgen'),
          chunk('works-for-me', 'works for me', 'passt für mich'),
        ],
        extraLessonItems: [
          chunk('morning', 'morning', 'Morgen'),
          chunk('tomorrow', 'tomorrow', 'morgen'),
          chunk('careful', 'careful', 'vorsichtig'),
          chunk('meet', 'meet', 'treffen'),
        ],
        targetChips: ['Tomorrow', 'works for me.'],
        distractors: ['outside now.', 'late today.'],
        typeRecall: recall('Tomorrow ', 'works', ' for me.', ['works', 'waits', 'changes', 'arrives']),
        sceneCaption: 'Wistful bestätigt morgen ruhig und sanft.',
        trophyWord: trophy('okay', 'okay', 'Tomorrow is okay.', 'Okay ist Wistfuls leise Zustimmung zum nächsten Tag.'),
        mediaCaption: 'Ruhiger Abschied mit offenem Plan für morgen.',
        songSeed: { genre: 'soft indie folk', mood: 'gentle tomorrow close' },
        visualNotes: 'Soft goodbye, next-day cue, careful tone.',
      }),
      sharp: createA1P9VariantInput({
        targetText: 'Tomorrow is confirmed.',
        baseText: 'Morgen ist bestätigt.',
        meaning: 'Ein klarer Satz, wenn morgen feststeht.',
        chunks: [
          chunk('tomorrow-is', 'Tomorrow is', 'morgen ist'),
          chunk('confirmed', 'confirmed', 'bestätigt'),
        ],
        extraLessonItems: [
          chunk('confirmed', 'confirmed', 'bestätigt'),
          chunk('tomorrow', 'tomorrow', 'morgen'),
          chunk('clear', 'clear', 'klar'),
          chunk('time', 'time', 'Zeit'),
        ],
        targetChips: ['Tomorrow is', 'confirmed.'],
        distractors: ['outside now.', 'late today.'],
        typeRecall: recall('Tomorrow is ', 'confirmed', '.', ['confirmed', 'outside', 'later', 'free']),
        sceneCaption: 'Sharp bestätigt den Plan für morgen kurz.',
        trophyWord: trophy('confirmed', 'bestätigt', 'Tomorrow is confirmed.', 'Confirmed passt zum klaren Abschluss.'),
        mediaCaption: 'Klarer Abschied mit bestätigtem Morgenplan.',
        songSeed: { genre: 'minimal synth pulse', mood: 'direct tomorrow close' },
        visualNotes: 'Clean goodbye, confirmed plan, composed close.',
      }),
    },
  },
  {
    slug: 'have-a-good-evening',
    title: 'Have a good evening',
    situation: {
      en: 'You close the interaction politely in the evening.',
      de: 'Du beendest das Gespräch am Abend höflich.',
    },
    pedagogicalGoal: 'Say goodbye politely with a short evening phrase.',
    variants: {
      bright: createA1P9VariantInput({
        targetText: 'Have a good evening.',
        baseText: 'Einen schönen Abend.',
        meaning: 'Ein freundlicher Abschied am Abend.',
        chunks: [
          chunk('have-a-good', 'Have a good', 'haben Sie einen schönen'),
          chunk('evening', 'evening', 'Abend'),
        ],
        extraLessonItems: [
          chunk('evening', 'evening', 'Abend'),
          chunk('good', 'good', 'gut'),
          chunk('goodbye', 'goodbye', 'auf Wiedersehen'),
          chunk('tomorrow', 'tomorrow', 'morgen'),
        ],
        targetChips: ['Have a good', 'evening.'],
        distractors: ['morning.', 'outside.'],
        typeRecall: recall('Have a good ', 'evening', '.', ['evening', 'morning', 'room', 'ticket']),
        sceneCaption: 'Bright verabschiedet sich freundlich am Abend.',
        trophyWord: trophy('evening', 'Abend', 'Have a good evening.', 'Evening ist der klare Anker für den höflichen Abschied.'),
        mediaCaption: 'Freundlicher Abschied am Abend nach einem kurzen Plan.',
        songSeed: { genre: 'light acoustic pop', mood: 'friendly evening goodbye' },
        visualNotes: 'Warm evening light, polite close, social ease.',
      }),
      wistful: createA1P9VariantInput({
        targetText: 'I hope you have a good evening.',
        baseText: 'Ich hoffe, Sie haben einen schönen Abend.',
        meaning: 'Ein sanfter, höflicher Abschied am Abend.',
        chunks: [
          chunk('i-hope-you-have', 'I hope you have', 'ich hoffe, Sie haben'),
          chunk('a-good-evening', 'a good evening', 'einen schönen Abend'),
        ],
        extraLessonItems: [
          chunk('good', 'good', 'gut'),
          chunk('evening', 'evening', 'Abend'),
          chunk('careful', 'careful', 'vorsichtig'),
          chunk('goodbye', 'goodbye', 'auf Wiedersehen'),
        ],
        targetChips: ['I hope you have', 'a good evening.'],
        distractors: ['a room key.', 'a late taxi.'],
        typeRecall: recall('I hope you have a good ', 'evening', '.', ['evening', 'morning', 'room', 'ticket']),
        sceneCaption: 'Wistful schließt leise und höflich am Abend.',
        trophyWord: trophy('enjoy', 'genießen', 'Enjoy your evening.', 'Enjoy schließt den Abend warm und persönlich.'),
        mediaCaption: 'Ruhiger höflicher Abschied bei Abendlicht.',
        songSeed: { genre: 'soft indie folk', mood: 'gentle evening goodbye' },
        visualNotes: 'Soft evening light, small goodbye, careful tone.',
      }),
      sharp: createA1P9VariantInput({
        targetText: 'Good evening, goodbye.',
        baseText: 'Schönen Abend, auf Wiedersehen.',
        meaning: 'Ein kurzer, klarer Abschied am Abend.',
        chunks: [
          chunk('good-evening', 'Good evening', 'schönen Abend'),
          chunk('goodbye', 'goodbye', 'auf Wiedersehen'),
        ],
        extraLessonItems: [
          chunk('done', 'done', 'fertig'),
          chunk('evening', 'evening', 'Abend'),
          chunk('goodbye', 'goodbye', 'auf Wiedersehen'),
          chunk('clear', 'clear', 'klar'),
        ],
        targetChips: ['Good evening,', 'goodbye.'],
        distractors: ['Good morning,', 'outside.'],
        typeRecall: recall('Good ', 'evening', ', goodbye.', ['evening', 'morning', 'room', 'ticket']),
        sceneCaption: 'Sharp beendet das Gespräch kurz und höflich.',
        trophyWord: trophy('bye', 'tschüss', 'Bye for now.', 'Bye ist Sharps direkter, höflicher Abschied am Abend.'),
        mediaCaption: 'Klarer höflicher Abschied am Abend.',
        songSeed: { genre: 'minimal synth pulse', mood: 'direct evening goodbye' },
        visualNotes: 'Clean goodbye frame, evening cue, composed close.',
      }),
    },
  },
]

const a1Practical9Lessons: GuidedLessonDefinition[] = a1Practical9Inputs.map((lessonInput, index) => {
  const lessonNumber = index + 1
  const id = `english-a1-practical-9-${String(lessonNumber).padStart(3, '0')}-${lessonInput.slug}`
  const nextInput = a1Practical9Inputs[index + 1]

  return {
    id,
    pathId: GUIDED_TODAY_PATH_NINE_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_NINE_METADATA.title,
    level: GUIDED_TODAY_PATH_NINE_METADATA.level,
    lessonNumber,
    baseLanguage: GUIDED_TODAY_PATH_NINE_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_NINE_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_NINE_METADATA,
    lessonMetadata: {
      id,
      sequence: lessonNumber,
      title: lessonInput.title,
    },
    title: lessonInput.title,
    situation: lessonInput.situation,
    pedagogicalGoal: lessonInput.pedagogicalGoal,
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: nextInput?.title ?? 'Path complete',
      situation: nextInput?.situation.de ?? 'Du hast English A1 P9 abgeschlossen.',
    },
    vibeVariants: {
      bright: createA1P2Variant(lessonInput.variants.bright),
      wistful: createA1P2Variant(lessonInput.variants.wistful),
      sharp: createA1P2Variant(lessonInput.variants.sharp),
    },
  }
})

type A1P10LessonInput = A1P2LessonInput

const a1Practical10Inputs: A1P10LessonInput[] = [
  {
    slug: 'today-was-good',
    title: 'Today was good',
    situation: {
      en: 'You close the day with a simple positive sentence.',
      de: 'Du schließt den Tag mit einem einfachen positiven Satz ab.',
    },
    pedagogicalGoal: 'Say that the day was good with short A1 wrap-up language.',
    variants: {
      bright: createA1P10VariantInput({
        targetText: 'Today was good.',
        baseText: 'Heute war gut.',
        meaning: 'Ein kurzer, freundlicher Satz zum Tagesende.',
        chunks: [
          chunk('today', 'Today', 'heute'),
          chunk('was-good', 'was good', 'war gut'),
        ],
        extraLessonItems: [
          chunk('today', 'today', 'heute'),
          chunk('good', 'good', 'gut'),
          chunk('day', 'day', 'Tag'),
          chunk('ready', 'ready', 'bereit'),
        ],
        targetChips: ['Today', 'was good.'],
        distractors: ['was late.', 'is outside.'],
        typeRecall: recall('Today was ', 'good', '.', ['good', 'late', 'outside', 'ready']),
        sceneCaption: 'Bright schließt den Tag freundlich ab.',
        trophyWord: trophy('today', 'heute', 'Today was good.', 'Today macht den Tagesabschluss sofort konkret.'),
        mediaCaption: 'Freundlicher Tagesabschluss nach einer kleinen Begegnung.',
        songSeed: { genre: 'warm acoustic pop', mood: 'friendly day close' },
        visualNotes: 'Warm end-of-day light, small smile, simple close.',
      }),
      wistful: createA1P10VariantInput({
        targetText: 'It was a good day.',
        baseText: 'Es war ein guter Tag.',
        meaning: 'Ein sanfter Satz für einen ruhigen Rückblick.',
        chunks: [
          chunk('it-was', 'It was', 'es war'),
          chunk('a-good-day', 'a good day', 'ein guter Tag'),
        ],
        extraLessonItems: [
          chunk('good', 'good', 'gut'),
          chunk('day', 'day', 'Tag'),
          chunk('quiet', 'quiet', 'ruhig'),
          chunk('evening', 'evening', 'Abend'),
        ],
        targetChips: ['It was', 'a good day.'],
        distractors: ['a late train.', 'outside now.'],
        typeRecall: recall('It was a ', 'good', ' day.', ['good', 'late', 'clear', 'ready']),
        sceneCaption: 'Wistful sagt ruhig, dass der Tag gut war.',
        trophyWord: trophy('good', 'gut', 'It was a good day.', 'Good hält den Rückblick einfach und freundlich.'),
        mediaCaption: 'Ruhiger Abend, kurzer Blick zurück auf den Tag.',
        songSeed: { genre: 'soft indie folk', mood: 'gentle day close' },
        visualNotes: 'Soft evening light, quiet day-end reflection.',
      }),
      sharp: createA1P10VariantInput({
        targetText: 'The day went well.',
        baseText: 'Der Tag lief gut.',
        meaning: 'Ein klarer Satz, dass der Tag gut gelaufen ist.',
        chunks: [
          chunk('the-day', 'The day', 'der Tag'),
          chunk('went-well', 'went well', 'lief gut'),
        ],
        extraLessonItems: [
          chunk('ready', 'ready', 'bereit'),
          chunk('day', 'day', 'Tag'),
          chunk('good', 'good', 'gut'),
          chunk('clear', 'clear', 'klar'),
        ],
        targetChips: ['The day', 'went well.'],
        distractors: ['went late.', 'waited outside.'],
        typeRecall: recall('The day went ', 'well', '.', ['well', 'late', 'outside', 'slowly']),
        sceneCaption: 'Sharp fasst den Tag knapp und positiv zusammen.',
        trophyWord: trophy('well', 'gut', 'The day went well.', 'Well ist Sharps knapper, positiver Tagesabschluss.'),
        mediaCaption: 'Klarer kurzer Tagesabschluss ohne großes Drama.',
        songSeed: { genre: 'minimal synth pulse', mood: 'direct day close' },
        visualNotes: 'Clean evening frame, composed wrap-up.',
      }),
    },
  },
  {
    slug: 'i-liked-this-place',
    title: 'I liked this place',
    situation: {
      en: 'You say something simple and positive about a place.',
      de: 'Du sagst etwas Einfaches und Positives über einen Ort.',
    },
    pedagogicalGoal: 'Make a short positive comment about a place before leaving.',
    variants: {
      bright: createA1P10VariantInput({
        targetText: 'I liked this place.',
        baseText: 'Mir hat dieser Ort gefallen.',
        meaning: 'Ein freundlicher Satz über einen Ort, der dir gefallen hat.',
        chunks: [
          chunk('i-liked', 'I liked', 'mir hat gefallen'),
          chunk('this-place', 'this place', 'dieser Ort'),
        ],
        extraLessonItems: [
          chunk('place', 'place', 'Ort'),
          chunk('liked', 'liked', 'mochte'),
          chunk('here', 'here', 'hier'),
          chunk('good', 'good', 'gut'),
        ],
        targetChips: ['I liked', 'this place.'],
        distractors: ['this station.', 'the key.'],
        typeRecall: recall('I liked this ', 'place', '.', ['place', 'room', 'station', 'ticket']),
        sceneCaption: 'Bright sagt freundlich, dass ihm der Ort gefallen hat.',
        trophyWord: trophy('place', 'Ort', 'I liked this place.', 'Place ist ein klarer Anker für Small Talk über Orte.'),
        mediaCaption: 'Freundlicher Blick auf einen Ort vor dem Gehen.',
        songSeed: { genre: 'light acoustic pop', mood: 'friendly place note' },
        visualNotes: 'Warm location cue, small positive comment.',
      }),
      wistful: createA1P10VariantInput({
        targetText: 'This place was nice.',
        baseText: 'Dieser Ort war schön.',
        meaning: 'Ein ruhiger Satz über einen angenehmen Ort.',
        chunks: [
          chunk('this-place', 'This place', 'dieser Ort'),
          chunk('was-nice', 'was nice', 'war schön'),
        ],
        extraLessonItems: [
          chunk('here', 'here', 'hier'),
          chunk('place', 'place', 'Ort'),
          chunk('nice', 'nice', 'schön'),
          chunk('quiet', 'quiet', 'ruhig'),
        ],
        targetChips: ['This place', 'was nice.'],
        distractors: ['This room', 'was late.'],
        typeRecall: recall('This place was ', 'nice', '.', ['nice', 'late', 'outside', 'ready']),
        sceneCaption: 'Wistful merkt leise an, dass der Ort schön war.',
        trophyWord: trophy('liked', 'mochte', 'I liked this place.', 'Liked drückt Wistfuls leise Bestätigung über den Ort aus.'),
        mediaCaption: 'Ruhiger Abschied von einem angenehmen Ort.',
        songSeed: { genre: 'soft indie folk', mood: 'gentle place note' },
        visualNotes: 'Soft location light, careful positive line.',
      }),
      sharp: createA1P10VariantInput({
        targetText: 'This was a good place.',
        baseText: 'Das war ein guter Ort.',
        meaning: 'Ein klarer positiver Satz über den Ort.',
        chunks: [
          chunk('this-was', 'This was', 'das war'),
          chunk('a-good-place', 'a good place', 'ein guter Ort'),
        ],
        extraLessonItems: [
          chunk('there', 'there', 'dort'),
          chunk('place', 'place', 'Ort'),
          chunk('good', 'good', 'gut'),
          chunk('clear', 'clear', 'klar'),
        ],
        targetChips: ['This was', 'a good place.'],
        distractors: ['a late train.', 'a room key.'],
        typeRecall: recall('This was a good ', 'place', '.', ['place', 'room', 'ticket', 'station']),
        sceneCaption: 'Sharp sagt den positiven Eindruck kurz und klar.',
        trophyWord: trophy('great', 'großartig', 'It was great.', 'Great schließt Sharps Eindruck vom Ort knapp und positiv ab.'),
        mediaCaption: 'Knapper positiver Kommentar über den Ort.',
        songSeed: { genre: 'minimal synth pulse', mood: 'direct place note' },
        visualNotes: 'Clean location frame, concise positive cue.',
      }),
    },
  },
  {
    slug: 'thank-you-for-your-help',
    title: 'Thank you for your help',
    situation: {
      en: 'You thank someone for helping you.',
      de: 'Du bedankst dich bei jemandem für Hilfe.',
    },
    pedagogicalGoal: 'Thank someone clearly after a practical interaction.',
    variants: {
      bright: createA1P10VariantInput({
        targetText: 'Thank you for your help.',
        baseText: 'Danke für Ihre Hilfe.',
        meaning: 'Ein warmer, klarer Dank nach einer Hilfe.',
        chunks: [
          chunk('thank-you', 'Thank you', 'danke'),
          chunk('for-your-help', 'for your help', 'für Ihre Hilfe'),
        ],
        extraLessonItems: [
          chunk('thank-you', 'thank you', 'danke'),
          chunk('help', 'help', 'Hilfe'),
          chunk('clear', 'clear', 'klar'),
          chunk('good', 'good', 'gut'),
        ],
        targetChips: ['Thank you', 'for your help.'],
        distractors: ['for the station.', 'for tomorrow.'],
        typeRecall: recall('Thank you for your ', 'help', '.', ['help', 'room', 'ticket', 'time']),
        sceneCaption: 'Bright bedankt sich freundlich und offen.',
        trophyWord: trophy('thank you', 'danke', 'Thank you for your help.', 'Thank you ist der wichtigste Anker für einen höflichen Abschluss.'),
        mediaCaption: 'Freundlicher Dank nach einer kleinen Hilfe.',
        songSeed: { genre: 'warm acoustic pop', mood: 'friendly thanks' },
        visualNotes: 'Small thank-you gesture, warm social close.',
      }),
      wistful: createA1P10VariantInput({
        targetText: 'Thank you for helping me.',
        baseText: 'Danke, dass Sie mir geholfen haben.',
        meaning: 'Ein sanfter Dank, wenn dir jemand geholfen hat.',
        chunks: [
          chunk('thank-you', 'Thank you', 'danke'),
          chunk('for-helping-me', 'for helping me', 'dass Sie mir geholfen haben'),
        ],
        extraLessonItems: [
          chunk('help', 'help', 'Hilfe'),
          chunk('thank-you', 'thank you', 'danke'),
          chunk('careful', 'careful', 'vorsichtig'),
          chunk('here', 'here', 'hier'),
        ],
        targetChips: ['Thank you', 'for helping me.'],
        distractors: ['for waiting outside.', 'for the key.'],
        typeRecall: recall('Thank you for ', 'helping', ' me.', ['helping', 'waiting', 'leaving', 'arriving']),
        sceneCaption: 'Wistful bedankt sich vorsichtig für die Hilfe.',
        trophyWord: trophy('sweet', 'lieb', 'You were very sweet.', 'Sweet ist Wistfuls warmer, kleiner Dankesakzent.'),
        mediaCaption: 'Ruhiger Dank nach Unterstützung.',
        songSeed: { genre: 'soft indie folk', mood: 'gentle thanks' },
        visualNotes: 'Soft thank-you moment, careful tone.',
      }),
      sharp: createA1P10VariantInput({
        targetText: 'Thanks for the help.',
        baseText: 'Danke für die Hilfe.',
        meaning: 'Ein kurzer, klarer Dank.',
        chunks: [
          chunk('thanks', 'Thanks', 'danke'),
          chunk('for-the-help', 'for the help', 'für die Hilfe'),
        ],
        extraLessonItems: [
          chunk('clear', 'clear', 'klar'),
          chunk('help', 'help', 'Hilfe'),
          chunk('thanks', 'thanks', 'danke'),
          chunk('done', 'done', 'fertig'),
        ],
        targetChips: ['Thanks', 'for the help.'],
        distractors: ['for the taxi.', 'for tomorrow.'],
        typeRecall: recall('Thanks for the ', 'help', '.', ['help', 'room', 'station', 'time']),
        sceneCaption: 'Sharp bedankt sich kurz und höflich.',
        trophyWord: trophy('thanks', 'danke', 'Thanks for the help.', 'Thanks ist der kurze, klare Sharp-Dank.'),
        mediaCaption: 'Klarer kurzer Dank nach einer Hilfe.',
        songSeed: { genre: 'minimal synth pulse', mood: 'direct thanks' },
        visualNotes: 'Clean thank-you beat, direct close.',
      }),
    },
  },
  {
    slug: 'i-learned-a-lot',
    title: 'I learned a lot',
    situation: {
      en: 'You say you learned something from the day.',
      de: 'Du sagst, dass du an diesem Tag etwas gelernt hast.',
    },
    pedagogicalGoal: 'Use one short sentence to say that you learned a lot.',
    variants: {
      bright: createA1P10VariantInput({
        targetText: 'I learned a lot today.',
        baseText: 'Ich habe heute viel gelernt.',
        meaning: 'Ein freundlicher Satz über das, was du gelernt hast.',
        chunks: [
          chunk('i-learned', 'I learned', 'ich habe gelernt'),
          chunk('a-lot-today', 'a lot today', 'heute viel'),
        ],
        extraLessonItems: [
          chunk('learned', 'learned', 'gelernt'),
          chunk('today', 'today', 'heute'),
          chunk('good', 'good', 'gut'),
          chunk('ready', 'ready', 'bereit'),
        ],
        targetChips: ['I learned', 'a lot today.'],
        distractors: ['late outside.', 'the room key.'],
        typeRecall: recall('I ', 'learned', ' a lot today.', ['learned', 'waited', 'changed', 'arrived']),
        sceneCaption: 'Bright sagt freundlich, dass er viel gelernt hat.',
        trophyWord: trophy('learned', 'gelernt', 'I learned a lot today.', 'Learned macht den Tagesabschluss lernbezogen und klar.'),
        mediaCaption: 'Freundlicher Rückblick auf eine kleine Lernsituation.',
        songSeed: { genre: 'light acoustic pop', mood: 'friendly learned note' },
        visualNotes: 'Notebook cue, warm day-end wrap-up.',
      }),
      wistful: createA1P10VariantInput({
        targetText: 'I learned a little more.',
        baseText: 'Ich habe ein bisschen mehr gelernt.',
        meaning: 'Ein ruhiger Satz über kleinen Fortschritt.',
        chunks: [
          chunk('i-learned', 'I learned', 'ich habe gelernt'),
          chunk('a-little-more', 'a little more', 'ein bisschen mehr'),
        ],
        extraLessonItems: [
          chunk('slowly', 'slowly', 'langsam'),
          chunk('learned', 'learned', 'gelernt'),
          chunk('more', 'more', 'mehr'),
          chunk('careful', 'careful', 'vorsichtig'),
        ],
        targetChips: ['I learned', 'a little more.'],
        distractors: ['a late train.', 'outside now.'],
        typeRecall: recall('I learned a little ', 'more', '.', ['more', 'late', 'outside', 'ready']),
        sceneCaption: 'Wistful nennt den kleinen Fortschritt ruhig.',
        trophyWord: trophy('more', 'mehr', 'A little more.', 'More markiert die leise Steigerung am Tagesende.'),
        mediaCaption: 'Ruhiger Lernmoment nach einem langen Tag.',
        songSeed: { genre: 'soft indie folk', mood: 'gentle learned note' },
        visualNotes: 'Soft notebook cue, careful progress line.',
      }),
      sharp: createA1P10VariantInput({
        targetText: 'That helped me learn.',
        baseText: 'Das hat mir beim Lernen geholfen.',
        meaning: 'Ein klarer Satz über hilfreiches Lernen.',
        chunks: [
          chunk('that-helped-me', 'That helped me', 'das hat mir geholfen'),
          chunk('learn', 'learn', 'lernen'),
        ],
        extraLessonItems: [
          chunk('better', 'better', 'besser'),
          chunk('learned', 'learned', 'gelernt'),
          chunk('clear', 'clear', 'klar'),
          chunk('today', 'today', 'heute'),
        ],
        targetChips: ['That helped me', 'learn.'],
        distractors: ['late today.', 'outside.'],
        typeRecall: recall('That helped me ', 'learn', '.', ['learn', 'wait', 'change', 'arrive']),
        sceneCaption: 'Sharp fasst den Lernfortschritt kurz zusammen.',
        trophyWord: trophy('lesson', 'Lektion', 'A good lesson.', 'Lesson markiert Sharps Lernabschluss konkret und positiv.'),
        mediaCaption: 'Klarer kurzer Satz über Lernen und Abschluss.',
        songSeed: { genre: 'minimal synth pulse', mood: 'direct learned note' },
        visualNotes: 'Clean note cue, concise learned line.',
      }),
    },
  },
  {
    slug: 'i-am-tired-now',
    title: 'I am tired now',
    situation: {
      en: 'You say that you are tired now.',
      de: 'Du sagst, dass du jetzt müde bist.',
    },
    pedagogicalGoal: 'State a simple tired feeling without dramatic language.',
    variants: {
      bright: createA1P10VariantInput({
        targetText: 'I am tired now.',
        baseText: 'Ich bin jetzt müde.',
        meaning: 'Ein einfacher Satz, wenn der Tag lang war.',
        chunks: [
          chunk('i-am', 'I am', 'ich bin'),
          chunk('tired-now', 'tired now', 'jetzt müde'),
        ],
        extraLessonItems: [
          chunk('tired', 'tired', 'müde'),
          chunk('now', 'now', 'jetzt'),
          chunk('rest', 'rest', 'Ruhe'),
          chunk('good', 'good', 'gut'),
        ],
        targetChips: ['I am', 'tired now.'],
        distractors: ['ready now.', 'outside now.'],
        typeRecall: recall('I am ', 'tired', ' now.', ['tired', 'ready', 'outside', 'late']),
        sceneCaption: 'Bright sagt freundlich, dass er jetzt müde ist.',
        trophyWord: trophy('nap', 'Nickerchen', 'A short nap.', 'Nap ist Brights konkreter Ruhewunsch am Tagesende.'),
        mediaCaption: 'Freundlicher müder Moment nach einem langen Tag.',
        songSeed: { genre: 'warm acoustic pop', mood: 'friendly tired close' },
        visualNotes: 'Warm evening, light tiredness, still friendly.',
      }),
      wistful: createA1P10VariantInput({
        targetText: 'Now I feel tired.',
        baseText: 'Jetzt fühle ich mich müde.',
        meaning: 'Ein sanfter Satz, wenn du müde bist.',
        chunks: [
          chunk('now', 'Now', 'jetzt'),
          chunk('i-feel-tired', 'I feel tired', 'fühle ich mich müde'),
        ],
        extraLessonItems: [
          chunk('evening', 'evening', 'Abend'),
          chunk('tired', 'tired', 'müde'),
          chunk('rest', 'rest', 'Ruhe'),
          chunk('slowly', 'slowly', 'langsam'),
        ],
        targetChips: ['Now', 'I feel tired.'],
        distractors: ['late today.', 'outside here.'],
        typeRecall: recall('Now I feel ', 'tired', '.', ['tired', 'ready', 'outside', 'late']),
        sceneCaption: 'Wistful sagt leise, dass er müde ist.',
        trophyWord: trophy('sleepy', 'müde', 'I feel sleepy.', 'Sleepy macht das Tagesende leise und körperlich.'),
        mediaCaption: 'Leiser Abendmoment mit einfacher Müdigkeit.',
        songSeed: { genre: 'soft indie folk', mood: 'gentle tired close' },
        visualNotes: 'Soft evening, tired but calm.',
      }),
      sharp: createA1P10VariantInput({
        targetText: 'I need rest now.',
        baseText: 'Ich brauche jetzt Ruhe.',
        meaning: 'Ein klarer Satz, wenn du eine Pause brauchst.',
        chunks: [
          chunk('i-need', 'I need', 'ich brauche'),
          chunk('rest-now', 'rest now', 'jetzt Ruhe'),
        ],
        extraLessonItems: [
          chunk('time', 'time', 'Zeit'),
          chunk('rest', 'rest', 'Ruhe'),
          chunk('now', 'now', 'jetzt'),
          chunk('done', 'done', 'fertig'),
        ],
        targetChips: ['I need', 'rest now.'],
        distractors: ['the key.', 'a taxi.'],
        typeRecall: recall('I need ', 'rest', ' now.', ['rest', 'help', 'water', 'time']),
        sceneCaption: 'Sharp sagt klar, dass jetzt Ruhe nötig ist.',
        trophyWord: trophy('pause', 'Pause', 'A pause now.', 'Pause schließt den Tag knapp und ruhig.'),
        mediaCaption: 'Klarer kurzer Satz vor einer Pause.',
        songSeed: { genre: 'minimal synth pulse', mood: 'direct tired close' },
        visualNotes: 'Clean rest cue, direct ending.',
      }),
    },
  },
  {
    slug: 'i-need-to-go',
    title: 'I need to go',
    situation: {
      en: 'You say that you need to leave.',
      de: 'Du sagst, dass du gehen musst.',
    },
    pedagogicalGoal: 'Close an interaction by saying you need to go.',
    variants: {
      bright: createA1P10VariantInput({
        targetText: 'I need to go now.',
        baseText: 'Ich muss jetzt gehen.',
        meaning: 'Ein freundlicher Satz, wenn du los musst.',
        chunks: [
          chunk('i-need-to', 'I need to', 'ich muss'),
          chunk('go-now', 'go now', 'jetzt gehen'),
        ],
        extraLessonItems: [
          chunk('go', 'go', 'gehen'),
          chunk('now', 'now', 'jetzt'),
          chunk('goodbye', 'goodbye', 'auf Wiedersehen'),
          chunk('ready', 'ready', 'bereit'),
        ],
        targetChips: ['I need to', 'go now.'],
        distractors: ['stay here.', 'wait outside.'],
        typeRecall: recall('I need to ', 'go', ' now.', ['go', 'wait', 'stay', 'sleep']),
        sceneCaption: 'Bright sagt freundlich, dass er jetzt gehen muss.',
        trophyWord: trophy('go', 'gehen', 'I need to go now.', 'Go ist der klare Anker fürs Losgehen.'),
        mediaCaption: 'Freundlicher Moment vor dem Aufbruch.',
        songSeed: { genre: 'light acoustic pop', mood: 'friendly leave now' },
        visualNotes: 'Warm doorway cue, polite movement out.',
      }),
      wistful: createA1P10VariantInput({
        targetText: 'I should go now.',
        baseText: 'Ich sollte jetzt gehen.',
        meaning: 'Ein sanfter Satz, wenn du gehen solltest.',
        chunks: [
          chunk('i-should', 'I should', 'ich sollte'),
          chunk('go-now', 'go now', 'jetzt gehen'),
        ],
        extraLessonItems: [
          chunk('ready', 'ready', 'bereit'),
          chunk('go', 'go', 'gehen'),
          chunk('now', 'now', 'jetzt'),
          chunk('slowly', 'slowly', 'langsam'),
        ],
        targetChips: ['I should', 'go now.'],
        distractors: ['wait here.', 'sleep outside.'],
        typeRecall: recall('I should ', 'go', ' now.', ['go', 'wait', 'stay', 'sleep']),
        sceneCaption: 'Wistful verabschiedet sich vorsichtig.',
        trophyWord: trophy('soon', 'bald', 'I should go soon.', 'Soon hält den Aufbruch weich und unaufdringlich.'),
        mediaCaption: 'Ruhiger Aufbruch nach einem Gespräch.',
        songSeed: { genre: 'soft indie folk', mood: 'gentle leave now' },
        visualNotes: 'Soft doorway, small goodbye, careful exit.',
      }),
      sharp: createA1P10VariantInput({
        targetText: 'I have to leave now.',
        baseText: 'Ich muss jetzt gehen.',
        meaning: 'Ein klarer, höflicher Satz für den Aufbruch.',
        chunks: [
          chunk('i-have-to', 'I have to', 'ich muss'),
          chunk('leave-now', 'leave now', 'jetzt gehen'),
        ],
        extraLessonItems: [
          chunk('leave', 'leave', 'gehen'),
          chunk('now', 'now', 'jetzt'),
          chunk('clear', 'clear', 'klar'),
          chunk('done', 'done', 'fertig'),
        ],
        targetChips: ['I have to', 'leave now.'],
        distractors: ['wait here.', 'change plans.'],
        typeRecall: recall('I have to ', 'leave', ' now.', ['leave', 'wait', 'stay', 'sleep']),
        sceneCaption: 'Sharp nennt den Aufbruch kurz und höflich.',
        trophyWord: trophy('finish', 'beenden', 'I have to finish.', 'Finish schließt den Tag knapp und direkt ab.'),
        mediaCaption: 'Klarer kurzer Aufbruch ohne kalten Ton.',
        songSeed: { genre: 'minimal synth pulse', mood: 'direct leave now' },
        visualNotes: 'Clean doorway, direct polite exit.',
      }),
    },
  },
  {
    slug: 'see-you-next-time',
    title: 'See you next time',
    situation: {
      en: 'You say that you will see the person next time.',
      de: 'Du sagst, dass ihr euch beim nächsten Mal seht.',
    },
    pedagogicalGoal: 'Use a short polite phrase for a future meeting.',
    variants: {
      bright: createA1P10VariantInput({
        targetText: 'See you next time.',
        baseText: 'Bis zum nächsten Mal.',
        meaning: 'Ein freundlicher Abschied mit Blick auf das nächste Mal.',
        chunks: [
          chunk('see-you', 'See you', 'bis'),
          chunk('next-time', 'next time', 'zum nächsten Mal'),
        ],
        extraLessonItems: [
          chunk('next-time', 'next time', 'nächstes Mal'),
          chunk('see-you', 'see you', 'bis dann'),
          chunk('tomorrow', 'tomorrow', 'morgen'),
          chunk('goodbye', 'goodbye', 'auf Wiedersehen'),
        ],
        targetChips: ['See you', 'next time.'],
        distractors: ['right now.', 'outside.'],
        typeRecall: recall('See you ', 'next time', '.', ['next time', 'tomorrow', 'outside', 'right now']),
        sceneCaption: 'Bright verabschiedet sich freundlich bis zum nächsten Mal.',
        trophyWord: trophy('next time', 'nächstes Mal', 'See you next time.', 'Next time ist ein praktischer Abschiedsanker.'),
        mediaCaption: 'Freundlicher Abschied mit nächstem Treffen im Blick.',
        songSeed: { genre: 'warm acoustic pop', mood: 'friendly next-time goodbye' },
        visualNotes: 'Small wave, warm next-time cue.',
      }),
      wistful: createA1P10VariantInput({
        targetText: 'Maybe see you again.',
        baseText: 'Vielleicht sehen wir uns wieder.',
        meaning: 'Ein sanfter Abschied, der offen bleibt.',
        chunks: [
          chunk('maybe-see-you', 'Maybe see you', 'vielleicht sehen wir uns'),
          chunk('again', 'again', 'wieder'),
        ],
        extraLessonItems: [
          chunk('again', 'again', 'wieder'),
          chunk('see-you', 'see you', 'bis dann'),
          chunk('careful', 'careful', 'vorsichtig'),
          chunk('tomorrow', 'tomorrow', 'morgen'),
        ],
        targetChips: ['Maybe see you', 'again.'],
        distractors: ['outside now.', 'the room.'],
        typeRecall: recall('Maybe see you ', 'again', '.', ['again', 'outside', 'late', 'now']),
        sceneCaption: 'Wistful lässt den Abschied sanft offen.',
        trophyWord: trophy('again', 'wieder', 'Maybe see you again.', 'Again hält den Abschied offen und menschlich.'),
        mediaCaption: 'Leiser Abschied mit einer offenen nächsten Begegnung.',
        songSeed: { genre: 'soft indie folk', mood: 'gentle next-time goodbye' },
        visualNotes: 'Soft goodbye wave, open future cue.',
      }),
      sharp: createA1P10VariantInput({
        targetText: 'Next time works.',
        baseText: 'Nächstes Mal passt.',
        meaning: 'Ein kurzer, klarer Satz für das nächste Mal.',
        chunks: [
          chunk('next-time', 'Next time', 'nächstes Mal'),
          chunk('works', 'works', 'passt'),
        ],
        extraLessonItems: [
          chunk('set', 'set', 'fest'),
          chunk('next-time', 'next time', 'nächstes Mal'),
          chunk('works', 'works', 'passt'),
          chunk('clear', 'clear', 'klar'),
        ],
        targetChips: ['Next time', 'works.'],
        distractors: ['Right now', 'waits.'],
        typeRecall: recall('Next time ', 'works', '.', ['works', 'waits', 'changes', 'arrives']),
        sceneCaption: 'Sharp bestätigt das nächste Mal knapp.',
        trophyWord: trophy('date', 'Termin', 'Save the date.', 'Date macht den nächsten Termin sofort konkret.'),
        mediaCaption: 'Klarer kurzer Abschluss mit nächstem Mal.',
        songSeed: { genre: 'minimal synth pulse', mood: 'direct next-time goodbye' },
        visualNotes: 'Clean future cue, concise close.',
      }),
    },
  },
  {
    slug: 'tomorrow-works-for-me',
    title: 'Tomorrow works for me',
    situation: {
      en: 'You confirm that tomorrow is okay for you.',
      de: 'Du bestätigst, dass morgen für dich passt.',
    },
    pedagogicalGoal: 'Confirm a simple tomorrow plan with one short sentence.',
    variants: {
      bright: createA1P10VariantInput({
        targetText: 'Tomorrow works for me.',
        baseText: 'Morgen passt für mich.',
        meaning: 'Ein freundlicher Satz, wenn morgen passt.',
        chunks: [
          chunk('tomorrow', 'Tomorrow', 'morgen'),
          chunk('works-for-me', 'works for me', 'passt für mich'),
        ],
        extraLessonItems: [
          chunk('tomorrow', 'tomorrow', 'morgen'),
          chunk('works', 'works', 'passt'),
          chunk('time', 'time', 'Zeit'),
          chunk('ready', 'ready', 'bereit'),
        ],
        targetChips: ['Tomorrow', 'works for me.'],
        distractors: ['is outside.', 'needs a key.'],
        typeRecall: recall('Tomorrow ', 'works', ' for me.', ['works', 'waits', 'changes', 'arrives']),
        sceneCaption: 'Bright bestätigt freundlich, dass morgen passt.',
        trophyWord: trophy('tomorrow', 'morgen', 'Tomorrow works for me.', 'Tomorrow macht den nächsten Schritt konkret.'),
        mediaCaption: 'Freundliche Bestätigung für den nächsten Tag.',
        songSeed: { genre: 'light acoustic pop', mood: 'friendly tomorrow plan' },
        visualNotes: 'Warm calendar cue, simple tomorrow line.',
      }),
      wistful: createA1P10VariantInput({
        targetText: 'Tomorrow is okay for me.',
        baseText: 'Morgen ist für mich okay.',
        meaning: 'Ein ruhiger Satz, wenn morgen in Ordnung ist.',
        chunks: [
          chunk('tomorrow-is', 'Tomorrow is', 'morgen ist'),
          chunk('okay-for-me', 'okay for me', 'für mich okay'),
        ],
        extraLessonItems: [
          chunk('morning', 'morning', 'Morgen'),
          chunk('tomorrow', 'tomorrow', 'morgen'),
          chunk('okay', 'okay', 'okay'),
          chunk('time', 'time', 'Zeit'),
        ],
        targetChips: ['Tomorrow is', 'okay for me.'],
        distractors: ['late outside.', 'the room key.'],
        typeRecall: recall('Tomorrow is ', 'okay', ' for me.', ['okay', 'late', 'outside', 'ready']),
        sceneCaption: 'Wistful bestätigt morgen leise und vorsichtig.',
        trophyWord: trophy('agreed', 'einverstanden', 'Agreed for tomorrow.', 'Agreed schließt den kleinen Plan leise und verbindlich.'),
        mediaCaption: 'Ruhige Bestätigung für morgen.',
        songSeed: { genre: 'soft indie folk', mood: 'gentle tomorrow plan' },
        visualNotes: 'Soft calendar light, careful confirmation.',
      }),
      sharp: createA1P10VariantInput({
        targetText: 'Tomorrow is confirmed.',
        baseText: 'Morgen ist bestätigt.',
        meaning: 'Ein klarer Satz, wenn morgen feststeht.',
        chunks: [
          chunk('tomorrow-is', 'Tomorrow is', 'morgen ist'),
          chunk('confirmed', 'confirmed', 'bestätigt'),
        ],
        extraLessonItems: [
          chunk('confirmed', 'confirmed', 'bestätigt'),
          chunk('tomorrow', 'tomorrow', 'morgen'),
          chunk('clear', 'clear', 'klar'),
          chunk('time', 'time', 'Zeit'),
        ],
        targetChips: ['Tomorrow is', 'confirmed.'],
        distractors: ['outside now.', 'late today.'],
        typeRecall: recall('Tomorrow is ', 'confirmed', '.', ['confirmed', 'outside', 'later', 'free']),
        sceneCaption: 'Sharp bestätigt morgen knapp und höflich.',
        trophyWord: trophy('confirmed', 'bestätigt', 'Tomorrow is confirmed.', 'Confirmed passt zur klaren Bestätigung.'),
        mediaCaption: 'Knappe Bestätigung für morgen.',
        songSeed: { genre: 'minimal synth pulse', mood: 'direct tomorrow plan' },
        visualNotes: 'Clean calendar cue, confirmed plan.',
      }),
    },
  },
  {
    slug: 'have-a-good-night',
    title: 'Have a good night',
    situation: {
      en: 'You say good night politely.',
      de: 'Du wünschst höflich eine gute Nacht.',
    },
    pedagogicalGoal: 'Close the evening with a short good-night phrase.',
    variants: {
      bright: createA1P10VariantInput({
        targetText: 'Have a good night.',
        baseText: 'Eine gute Nacht.',
        meaning: 'Ein freundlicher Abschied am späten Abend.',
        chunks: [
          chunk('have-a-good', 'Have a good', 'haben Sie eine gute'),
          chunk('night', 'night', 'Nacht'),
        ],
        extraLessonItems: [
          chunk('night', 'night', 'Nacht'),
          chunk('good', 'good', 'gut'),
          chunk('goodbye', 'goodbye', 'auf Wiedersehen'),
          chunk('tomorrow', 'tomorrow', 'morgen'),
        ],
        targetChips: ['Have a good', 'night.'],
        distractors: ['morning.', 'station.'],
        typeRecall: recall('Have a good ', 'night', '.', ['night', 'morning', 'room', 'ticket']),
        sceneCaption: 'Bright verabschiedet sich freundlich zur Nacht.',
        trophyWord: trophy('night', 'Nacht', 'Have a good night.', 'Night ist der klare Anker für den Abendabschluss.'),
        mediaCaption: 'Freundlicher Abschied bei Nacht.',
        songSeed: { genre: 'warm acoustic pop', mood: 'friendly good night' },
        visualNotes: 'Warm night light, polite close.',
      }),
      wistful: createA1P10VariantInput({
        targetText: 'I hope you have a good night.',
        baseText: 'Ich hoffe, Sie haben eine gute Nacht.',
        meaning: 'Ein sanfter Wunsch für die Nacht.',
        chunks: [
          chunk('i-hope-you-have', 'I hope you have', 'ich hoffe, Sie haben'),
          chunk('a-good-night', 'a good night', 'eine gute Nacht'),
        ],
        extraLessonItems: [
          chunk('rest', 'rest', 'Ruhe'),
          chunk('night', 'night', 'Nacht'),
          chunk('good', 'good', 'gut'),
          chunk('quiet', 'quiet', 'ruhig'),
        ],
        targetChips: ['I hope you have', 'a good night.'],
        distractors: ['a room key.', 'a late train.'],
        typeRecall: recall('I hope you have a good ', 'night', '.', ['night', 'morning', 'room', 'ticket']),
        sceneCaption: 'Wistful wünscht leise eine gute Nacht.',
        trophyWord: trophy('hope', 'hoffen', 'I hope you sleep well.', 'Hope hält den leisen Nachtwunsch warm und persönlich.'),
        mediaCaption: 'Ruhiger Abschied am späten Abend.',
        songSeed: { genre: 'soft indie folk', mood: 'gentle good night' },
        visualNotes: 'Soft night light, gentle goodbye.',
      }),
      sharp: createA1P10VariantInput({
        targetText: 'Good night, goodbye.',
        baseText: 'Gute Nacht, auf Wiedersehen.',
        meaning: 'Ein kurzer, klarer Abschied zur Nacht.',
        chunks: [
          chunk('good-night', 'Good night', 'gute Nacht'),
          chunk('goodbye', 'goodbye', 'auf Wiedersehen'),
        ],
        extraLessonItems: [
          chunk('done', 'done', 'fertig'),
          chunk('night', 'night', 'Nacht'),
          chunk('goodbye', 'goodbye', 'auf Wiedersehen'),
          chunk('clear', 'clear', 'klar'),
        ],
        targetChips: ['Good night,', 'goodbye.'],
        distractors: ['Good morning,', 'outside.'],
        typeRecall: recall('Good ', 'night', ', goodbye.', ['night', 'morning', 'room', 'ticket']),
        sceneCaption: 'Sharp schließt die Nacht kurz und höflich.',
        trophyWord: trophy('over', 'vorbei', 'The day is over.', 'Over schließt den Tag knapp und endgültig ab.'),
        mediaCaption: 'Klarer höflicher Abschied zur Nacht.',
        songSeed: { genre: 'minimal synth pulse', mood: 'direct good night' },
        visualNotes: 'Clean night cue, concise goodbye.',
      }),
    },
  },
  {
    slug: 'goodbye-for-now',
    title: 'Goodbye for now',
    situation: {
      en: 'You end the interaction politely for now.',
      de: 'Du beendest die Begegnung für jetzt höflich.',
    },
    pedagogicalGoal: 'Finish the path with one short polite goodbye.',
    variants: {
      bright: createA1P10VariantInput({
        targetText: 'Goodbye for now.',
        baseText: 'Für jetzt: auf Wiedersehen.',
        meaning: 'Ein freundlicher Abschied, der nicht schwer klingt.',
        chunks: [
          chunk('goodbye', 'Goodbye', 'auf Wiedersehen'),
          chunk('for-now', 'for now', 'für jetzt'),
        ],
        extraLessonItems: [
          chunk('goodbye', 'goodbye', 'auf Wiedersehen'),
          chunk('now', 'now', 'jetzt'),
          chunk('thank-you', 'thank you', 'danke'),
          chunk('next-time', 'next time', 'nächstes Mal'),
        ],
        targetChips: ['Goodbye', 'for now.'],
        distractors: ['tomorrow works.', 'outside now.'],
        typeRecall: recall('Goodbye for ', 'now', '.', ['now', 'tomorrow', 'outside', 'later']),
        sceneCaption: 'Bright verabschiedet sich freundlich für jetzt.',
        trophyWord: trophy('goodbye', 'auf Wiedersehen', 'Goodbye for now.', 'Goodbye ist der klare Abschlussanker.'),
        mediaCaption: 'Freundlicher letzter Abschied für den Moment.',
        songSeed: { genre: 'light acoustic pop', mood: 'friendly goodbye for now' },
        visualNotes: 'Warm final wave, simple goodbye.',
      }),
      wistful: createA1P10VariantInput({
        targetText: 'Goodbye, and thank you.',
        baseText: 'Auf Wiedersehen und danke.',
        meaning: 'Ein sanfter Abschied mit kurzem Dank.',
        chunks: [
          chunk('goodbye', 'Goodbye', 'auf Wiedersehen'),
          chunk('and-thank-you', 'and thank you', 'und danke'),
        ],
        extraLessonItems: [
          chunk('calm', 'calm', 'ruhig'),
          chunk('goodbye', 'goodbye', 'auf Wiedersehen'),
          chunk('thank-you', 'thank you', 'danke'),
          chunk('help', 'help', 'Hilfe'),
        ],
        targetChips: ['Goodbye,', 'and thank you.'],
        distractors: ['and the key.', 'outside now.'],
        typeRecall: recall('Goodbye, and ', 'thank you', '.', ['thank you', 'tomorrow', 'outside', 'good night']),
        sceneCaption: 'Wistful schließt leise mit Dank ab.',
        trophyWord: trophy('thank', 'danken', 'Thank you for everything.', 'Thank schließt den letzten Abschied warm und konkret ab.'),
        mediaCaption: 'Sanfter letzter Dank und Abschied.',
        songSeed: { genre: 'soft indie folk', mood: 'gentle goodbye for now' },
        visualNotes: 'Soft final goodbye, calm tone.',
      }),
      sharp: createA1P10VariantInput({
        targetText: 'Goodbye. See you later.',
        baseText: 'Auf Wiedersehen. Bis später.',
        meaning: 'Ein klarer höflicher Abschied ohne Drama.',
        chunks: [
          chunk('goodbye', 'Goodbye', 'auf Wiedersehen'),
          chunk('see-you-later', 'See you later', 'bis später'),
        ],
        extraLessonItems: [
          chunk('now', 'now', 'jetzt'),
          chunk('goodbye', 'goodbye', 'auf Wiedersehen'),
          chunk('later', 'later', 'später'),
          chunk('clear', 'clear', 'klar'),
        ],
        targetChips: ['Goodbye.', 'See you later.'],
        distractors: ['Good morning.', 'Wait outside.'],
        typeRecall: recall('Goodbye. See you ', 'later', '.', ['later', 'outside', 'tomorrow', 'now']),
        sceneCaption: 'Sharp beendet die Begegnung klar und höflich.',
        trophyWord: trophy('cheers', 'tschüss', 'Cheers, see you.', 'Cheers ist Sharps lockerer, höflicher Abschluss.'),
        mediaCaption: 'Klarer letzter Abschied ohne kalten Ton.',
        songSeed: { genre: 'minimal synth pulse', mood: 'direct goodbye for now' },
        visualNotes: 'Clean final wave, composed ending.',
      }),
    },
  },
]

const a1Practical10Lessons: GuidedLessonDefinition[] = a1Practical10Inputs.map((lessonInput, index) => {
  const lessonNumber = index + 1
  const id = `english-a1-practical-10-${String(lessonNumber).padStart(3, '0')}-${lessonInput.slug}`
  const nextInput = a1Practical10Inputs[index + 1]

  return {
    id,
    pathId: GUIDED_TODAY_PATH_TEN_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_TEN_METADATA.title,
    level: GUIDED_TODAY_PATH_TEN_METADATA.level,
    lessonNumber,
    baseLanguage: GUIDED_TODAY_PATH_TEN_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_TEN_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_TEN_METADATA,
    lessonMetadata: {
      id,
      sequence: lessonNumber,
      title: lessonInput.title,
    },
    title: lessonInput.title,
    situation: lessonInput.situation,
    pedagogicalGoal: lessonInput.pedagogicalGoal,
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: nextInput?.title ?? 'Path complete',
      situation: nextInput?.situation.de ?? 'Du hast English A1 P10 abgeschlossen.',
    },
    vibeVariants: {
      bright: createA1P2Variant(lessonInput.variants.bright),
      wistful: createA1P2Variant(lessonInput.variants.wistful),
      sharp: createA1P2Variant(lessonInput.variants.sharp),
    },
  }
})

function createA1P3VariantInput(input: A1P3VariantInput) {
  return input
}

function createA1P2VariantInput(input: A1P2VariantInput) {
  return input
}

function createA1P4VariantInput(input: A1P2VariantInput) {
  return input
}

function createA1P5VariantInput(input: A1P2VariantInput) {
  return input
}

function createA1P6VariantInput(input: A1P2VariantInput) {
  return input
}

function createA1P7VariantInput(input: A1P2VariantInput) {
  return input
}

function createA1P8VariantInput(input: A1P2VariantInput) {
  return input
}

function createA1P9VariantInput(input: A1P2VariantInput) {
  return input
}

function createA1P10VariantInput(input: A1P2VariantInput) {
  return input
}

function createA1P2Variant(input: A1P2VariantInput): GuidedLessonVibeVariant {
  const chunkItems = input.chunks.map((phraseChunk) => lessonItem(
    phraseChunk.id,
    phraseChunk.targetText,
    phraseChunk.baseText,
  ))
  const extraItems = (input.extraLessonItems ?? []).map((phraseChunk) => lessonItem(
    phraseChunk.id,
    phraseChunk.targetText,
    phraseChunk.baseText,
  ))
  const trophyId = `trophy-${input.trophyWord.word.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

  return {
    contentStatus: 'draft',
    corePhrase: {
      targetText: input.targetText,
      baseText: input.baseText,
    },
    meaning: input.meaning,
    chunks: input.chunks,
    lessonItems: [
      ...chunkItems,
      ...extraItems,
      lessonItem(trophyId, input.trophyWord.word, input.trophyWord.meaning),
    ],
    build: {
      targetText: input.targetText,
      chips: [...input.targetChips, ...input.distractors],
    },
    typeRecall: input.typeRecall,
    speakTarget: {
      baseCue: input.baseText,
      targetPhrase: input.targetText,
      language: 'en-US',
      passingThreshold: 0.8,
    },
    sceneCaption: input.sceneCaption,
    trophyWord: input.trophyWord,
    placeholderMedia: {
      type: 'video',
      caption: input.mediaCaption,
    },
    songSeed: input.songSeed,
    visualNotes: input.visualNotes,
  }
}

function chunk(id: string, targetText: string, baseText: string): PhraseChunk {
  return { id, targetText, baseText }
}

function lessonItem(id: string, targetText: string, baseText: string): LessonItem {
  return {
    id,
    targetText,
    baseText,
    acceptedAnswers: uniqueAnswers([
      targetText,
      targetText.toLowerCase(),
      targetText.replace(/['.?!,]/g, ''),
      targetText.toLowerCase().replace(/['.?!,]/g, ''),
    ]),
  }
}

function recall(
  before: string,
  answer: string,
  after: string,
  fallbackChoices: string[],
): GuidedLessonVibeVariant['typeRecall'] {
  return {
    before,
    answer,
    after,
    acceptedAnswers: uniqueAnswers([
      answer,
      answer.toLowerCase(),
      answer.replace(/['.?!,]/g, ''),
      answer.toLowerCase().replace(/['.?!,]/g, ''),
    ]),
    fallbackChoices,
  }
}

function trophy(
  word: string,
  meaning: string,
  example: string,
  whyThisWord: string,
): GuidedLessonTrophyWord {
  return { word, meaning, example, whyThisWord }
}

function uniqueAnswers(answers: string[]) {
  return Array.from(new Set(answers.filter((answer) => answer.trim().length > 0)))
}

const brightSpanishLesson001: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: 'Hola, ¿habla español?',
    baseText: 'Hallo, sprechen Sie Spanisch?',
  },
  meaning: 'Eine offene, freundliche Eröffnung, bevor du auf Spanisch weitersprichst.',
  chunks: [
    { id: 'hola', targetText: 'Hola,', baseText: 'Hallo,' },
    { id: 'habla', targetText: '¿habla', baseText: 'sprechen Sie' },
    { id: 'espanol', targetText: 'español?', baseText: 'Spanisch?' },
  ],
  lessonItems: [
    { id: 'hola', targetText: 'hola', baseText: 'hallo', acceptedAnswers: ['hola', 'Hola'] },
    { id: 'habla', targetText: 'habla', baseText: 'spricht / sprechen Sie', acceptedAnswers: ['habla', 'Habla'] },
    { id: 'espanol', targetText: 'español', baseText: 'Spanisch', acceptedAnswers: ['español', 'espanol', 'Español', 'Espanol'] },
    { id: 'usted', targetText: 'usted', baseText: 'Sie (höflich)', acceptedAnswers: ['usted', 'Usted'] },
  ],
  build: {
    targetText: 'Hola, ¿habla español?',
    chips: ['Hola,', '¿habla', 'español?', 'usted', 'gracias'],
  },
  typeRecall: {
    before: 'Hola, ¿',
    answer: 'habla',
    after: ' español?',
    acceptedAnswers: ['habla', 'Habla'],
    fallbackChoices: ['habla', 'hablas', 'español', 'usted'],
  },
  speakTarget: {
    baseCue: 'Hallo, sprechen Sie Spanisch?',
    targetPhrase: 'Hola, ¿habla español?',
    language: 'es-ES',
    passingThreshold: 0.8,
    requiredTokens: ['hola', 'habla', 'español'],
    optionalTokens: ['usted', 'por', 'favor'],
  },
  sceneCaption: 'Vor der Theke im Café fragst du höflich, ob hier Spanisch gesprochen wird.',
  trophyWord: {
    word: 'hola',
    meaning: 'hallo',
    example: 'Hola, buenos días.',
    whyThisWord: 'Hola ist der erste freundliche Schritt in jede spanische Szene und passt morgens wie nachmittags.',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Morgenlicht im Café, offene Theke, ruhiger erster Gruß auf Spanisch.',
  },
  songSeed: {
    genre: 'sunny acoustic flamenco-light',
    mood: 'warm first contact',
  },
  visualNotes: 'Warmes Honig-Licht, Café-Theke, sanfter Korall-Akzent auf Hola.',
}

const brightSpanishLesson002: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: 'Perdón, ¿puede repetirlo?',
    baseText: 'Entschuldigung, können Sie das wiederholen?',
  },
  meaning: 'Eine höfliche Bitte, etwas noch einmal zu hören, ohne den Faden zu verlieren.',
  chunks: [
    { id: 'perdon', targetText: 'Perdón,', baseText: 'Entschuldigung,' },
    { id: 'puede', targetText: '¿puede', baseText: 'können Sie' },
    { id: 'repetirlo', targetText: 'repetirlo?', baseText: 'es wiederholen?' },
  ],
  lessonItems: [
    { id: 'perdon', targetText: 'perdón', baseText: 'Entschuldigung', acceptedAnswers: ['perdón', 'perdon', 'Perdón', 'Perdon'] },
    { id: 'puede', targetText: 'puede', baseText: 'können Sie', acceptedAnswers: ['puede', 'Puede'] },
    { id: 'repetir', targetText: 'repetir', baseText: 'wiederholen', acceptedAnswers: ['repetir', 'Repetir'] },
    { id: 'mas-despacio', targetText: 'más despacio', baseText: 'langsamer', acceptedAnswers: ['más despacio', 'mas despacio'] },
  ],
  build: {
    targetText: 'Perdón, ¿puede repetirlo?',
    chips: ['Perdón,', '¿puede', 'repetirlo?', 'más despacio', 'gracias'],
  },
  typeRecall: {
    before: 'Perdón, ¿puede ',
    answer: 'repetirlo',
    after: '?',
    acceptedAnswers: ['repetirlo', 'Repetirlo'],
    fallbackChoices: ['repetirlo', 'repetir', 'decirlo', 'hablar'],
  },
  speakTarget: {
    baseCue: 'Entschuldigung, können Sie das wiederholen?',
    targetPhrase: 'Perdón, ¿puede repetirlo?',
    language: 'es-ES',
    passingThreshold: 0.8,
    requiredTokens: ['perdón', 'puede', 'repetirlo'],
    optionalTokens: ['más', 'despacio', 'por', 'favor'],
  },
  sceneCaption: 'Mitten im Gespräch hebst du kurz die Hand und bittest höflich um eine Wiederholung.',
  trophyWord: {
    word: 'perdón',
    meaning: 'Entschuldigung',
    example: 'Perdón, no entiendo.',
    whyThisWord: 'Perdón öffnet jede Korrektur freundlich und ist auf A1 die sichere Eröffnung für jede kleine Pause im Gespräch.',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Sanftes Café-Licht, kurze Pause am Tresen, ruhige Rückfrage.',
  },
  songSeed: {
    genre: 'soft acoustic',
    mood: 'gentle pause',
  },
  visualNotes: 'Pausen-Beat, sanfter Glow um Perdón, ruhiger Atemmoment.',
}

const brightSpanishLesson003: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: 'Por favor, ¿dónde está la estación?',
    baseText: 'Bitte, wo ist der Bahnhof?',
  },
  meaning: 'Eine kurze, freundliche Frage nach einem klaren Ziel in der Stadt.',
  chunks: [
    { id: 'por-favor', targetText: 'Por favor,', baseText: 'Bitte,' },
    { id: 'donde-esta', targetText: '¿dónde está', baseText: 'wo ist' },
    { id: 'la-estacion', targetText: 'la estación?', baseText: 'der Bahnhof?' },
  ],
  lessonItems: [
    { id: 'por-favor', targetText: 'por favor', baseText: 'bitte', acceptedAnswers: ['por favor', 'Por favor'] },
    { id: 'donde', targetText: 'dónde', baseText: 'wo', acceptedAnswers: ['dónde', 'donde', 'Dónde', 'Donde'] },
    { id: 'esta', targetText: 'está', baseText: 'ist (Ort)', acceptedAnswers: ['está', 'esta', 'Está', 'Esta'] },
    { id: 'estacion', targetText: 'estación', baseText: 'Bahnhof', acceptedAnswers: ['estación', 'estacion', 'Estación', 'Estacion'] },
  ],
  build: {
    targetText: 'Por favor, ¿dónde está la estación?',
    chips: ['Por favor,', '¿dónde está', 'la estación?', 'aquí', 'cerca'],
  },
  typeRecall: {
    before: 'Por favor, ¿',
    answer: 'dónde',
    after: ' está la estación?',
    acceptedAnswers: ['dónde', 'donde', 'Dónde', 'Donde'],
    fallbackChoices: ['dónde', 'cuándo', 'cómo', 'quién'],
  },
  speakTarget: {
    baseCue: 'Bitte, wo ist der Bahnhof?',
    targetPhrase: 'Por favor, ¿dónde está la estación?',
    language: 'es-ES',
    passingThreshold: 0.8,
    requiredTokens: ['por', 'favor', 'dónde', 'está', 'estación'],
    optionalTokens: ['la', 'el', 'señor', 'señora'],
  },
  sceneCaption: 'Auf dem Gehweg sprichst du jemanden kurz an und fragst nach dem Bahnhof.',
  trophyWord: {
    word: 'dónde',
    meaning: 'wo',
    example: '¿Dónde está el museo?',
    whyThisWord: 'Dónde ist das spanische Schlüsselwort für jede Ortsfrage und auf A1 sofort übertragbar auf Bahnhof, Café oder Apotheke.',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Helle Straße am Vormittag, ein Bahnhofsschild in der Ferne, offene Geste.',
  },
  songSeed: {
    genre: 'sunny acoustic',
    mood: 'open and asking',
  },
  visualNotes: 'Goldene Richtungsachse, Bahnhofssymbol am Horizont, warme Hinweisspur.',
}

const brightSpanishLesson004: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: 'Un café, por favor.',
    baseText: 'Einen Kaffee, bitte.',
  },
  meaning: 'Eine knappe, höfliche Bestellung am Tresen, mit klarem Höflichkeitswort.',
  chunks: [
    { id: 'un-cafe', targetText: 'Un café,', baseText: 'Einen Kaffee,' },
    { id: 'por-favor', targetText: 'por favor.', baseText: 'bitte.' },
  ],
  lessonItems: [
    { id: 'un', targetText: 'un', baseText: 'einen / ein', acceptedAnswers: ['un', 'Un'] },
    { id: 'cafe', targetText: 'café', baseText: 'Kaffee', acceptedAnswers: ['café', 'cafe', 'Café', 'Cafe'] },
    { id: 'por-favor', targetText: 'por favor', baseText: 'bitte', acceptedAnswers: ['por favor', 'Por favor'] },
    { id: 'con-leche', targetText: 'con leche', baseText: 'mit Milch', acceptedAnswers: ['con leche', 'Con leche'] },
  ],
  build: {
    targetText: 'Un café, por favor.',
    chips: ['Un café,', 'por favor.', 'con leche', 'gracias'],
  },
  typeRecall: {
    before: 'Un ',
    answer: 'café',
    after: ', por favor.',
    acceptedAnswers: ['café', 'cafe', 'Café', 'Cafe'],
    fallbackChoices: ['café', 'té', 'agua', 'zumo'],
  },
  speakTarget: {
    baseCue: 'Einen Kaffee, bitte.',
    targetPhrase: 'Un café, por favor.',
    language: 'es-ES',
    passingThreshold: 0.8,
    requiredTokens: ['un', 'café', 'por', 'favor'],
    optionalTokens: ['con', 'leche', 'gracias'],
  },
  sceneCaption: 'Am Tresen klingt die Bestellung kurz, ruhig und freundlich.',
  trophyWord: {
    word: 'café',
    meaning: 'Kaffee',
    example: 'Un café con leche, por favor.',
    whyThisWord: 'Café ist auf A1 der direkte Einstieg in jede Tresenbestellung und in allen spanischsprachigen Ländern sofort verständlich.',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Tasse auf der Theke, warmes Morgenlicht, ruhige Bestellung.',
  },
  songSeed: {
    genre: 'upbeat acoustic',
    mood: 'fresh and easy',
  },
  visualNotes: 'Tassen-Detail in goldenem Licht, kurzer Tresenmoment, sanfte Wärme.',
}

const brightSpanishLesson005: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: '¿Cuánto cuesta esto?',
    baseText: 'Wie viel kostet das?',
  },
  meaning: 'Eine direkte, höfliche Preisfrage zu einem Gegenstand vor dir.',
  chunks: [
    { id: 'cuanto', targetText: '¿Cuánto', baseText: 'Wie viel' },
    { id: 'cuesta', targetText: 'cuesta', baseText: 'kostet' },
    { id: 'esto', targetText: 'esto?', baseText: 'das?' },
  ],
  lessonItems: [
    { id: 'cuanto', targetText: 'cuánto', baseText: 'wie viel', acceptedAnswers: ['cuánto', 'cuanto', 'Cuánto', 'Cuanto'] },
    { id: 'cuesta', targetText: 'cuesta', baseText: 'kostet', acceptedAnswers: ['cuesta', 'Cuesta'] },
    { id: 'esto', targetText: 'esto', baseText: 'das hier', acceptedAnswers: ['esto', 'Esto'] },
    { id: 'caro', targetText: 'caro', baseText: 'teuer', acceptedAnswers: ['caro', 'Caro'] },
  ],
  build: {
    targetText: '¿Cuánto cuesta esto?',
    chips: ['¿Cuánto', 'cuesta', 'esto?', 'caro', 'barato'],
  },
  typeRecall: {
    before: '¿',
    answer: 'Cuánto',
    after: ' cuesta esto?',
    acceptedAnswers: ['cuánto', 'cuanto', 'Cuánto', 'Cuanto'],
    fallbackChoices: ['Cuánto', 'Cómo', 'Cuándo', 'Qué'],
  },
  speakTarget: {
    baseCue: 'Wie viel kostet das?',
    targetPhrase: '¿Cuánto cuesta esto?',
    language: 'es-ES',
    passingThreshold: 0.8,
    requiredTokens: ['cuánto', 'cuesta', 'esto'],
    optionalTokens: ['por', 'favor', 'señora', 'señor'],
  },
  sceneCaption: 'Im kleinen Laden hältst du den Gegenstand in der Hand und fragst nach dem Preis.',
  trophyWord: {
    word: 'cuánto',
    meaning: 'wie viel',
    example: '¿Cuánto es?',
    whyThisWord: 'Cuánto deckt auf A1 alle Mengen- und Preisfragen im Alltag ab und ersetzt zuverlässig komplexe Konstruktionen.',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Kleines Ladenlokal, Gegenstand auf dem Tresen, klare Preisfrage.',
  },
  songSeed: {
    genre: 'sunny indie pop',
    mood: 'curious and direct',
  },
  visualNotes: 'Preisschild im Fokus, warme Pastellfarben, ruhige Beleuchtung.',
}

const brightSpanishLesson006: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: '¿A qué hora sale el tren?',
    baseText: 'Um wie viel Uhr fährt der Zug?',
  },
  meaning: 'Eine klare Frage nach der Abfahrtszeit am Bahnhof.',
  chunks: [
    { id: 'a-que-hora', targetText: '¿A qué hora', baseText: 'Um wie viel Uhr' },
    { id: 'sale', targetText: 'sale', baseText: 'fährt' },
    { id: 'el-tren', targetText: 'el tren?', baseText: 'der Zug?' },
  ],
  lessonItems: [
    { id: 'a-que-hora', targetText: 'a qué hora', baseText: 'um wie viel Uhr', acceptedAnswers: ['a qué hora', 'a que hora'] },
    { id: 'sale', targetText: 'sale', baseText: 'fährt ab', acceptedAnswers: ['sale', 'Sale'] },
    { id: 'tren', targetText: 'tren', baseText: 'Zug', acceptedAnswers: ['tren', 'Tren'] },
    { id: 'anden', targetText: 'andén', baseText: 'Bahnsteig', acceptedAnswers: ['andén', 'anden', 'Andén', 'Anden'] },
  ],
  build: {
    targetText: '¿A qué hora sale el tren?',
    chips: ['¿A qué hora', 'sale', 'el tren?', 'andén', 'ahora'],
  },
  typeRecall: {
    before: '¿A qué hora sale el ',
    answer: 'tren',
    after: '?',
    acceptedAnswers: ['tren', 'Tren'],
    fallbackChoices: ['tren', 'autobús', 'andén', 'taxi'],
  },
  speakTarget: {
    baseCue: 'Um wie viel Uhr fährt der Zug?',
    targetPhrase: '¿A qué hora sale el tren?',
    language: 'es-ES',
    passingThreshold: 0.8,
    requiredTokens: ['qué', 'hora', 'sale', 'tren'],
    optionalTokens: ['a', 'el', 'por', 'favor'],
  },
  sceneCaption: 'Am Informationsschalter im Bahnhof fragst du nach der Abfahrtszeit.',
  trophyWord: {
    word: 'tren',
    meaning: 'Zug',
    example: 'El tren sale a las ocho.',
    whyThisWord: 'Tren ist auf A1 das zentrale Reisewort für Spanien und öffnet das ganze Bahnhofs-Vokabular.',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Helle Bahnhofshalle, Anzeigetafel im Hintergrund, ruhige Frage am Schalter.',
  },
  songSeed: {
    genre: 'upbeat acoustic',
    mood: 'ready and moving',
  },
  visualNotes: 'Uhr- und Tafel-Detail, warme Halle, klare Linienführung Richtung Bahnsteig.',
}

const brightSpanishLesson007: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: 'Necesito ayuda, por favor.',
    baseText: 'Ich brauche Hilfe, bitte.',
  },
  meaning: 'Eine knappe, höfliche Bitte um Hilfe, ohne das Problem schon zu benennen.',
  chunks: [
    { id: 'necesito', targetText: 'Necesito', baseText: 'Ich brauche' },
    { id: 'ayuda', targetText: 'ayuda,', baseText: 'Hilfe,' },
    { id: 'por-favor', targetText: 'por favor.', baseText: 'bitte.' },
  ],
  lessonItems: [
    { id: 'necesito', targetText: 'necesito', baseText: 'ich brauche', acceptedAnswers: ['necesito', 'Necesito'] },
    { id: 'ayuda', targetText: 'ayuda', baseText: 'Hilfe', acceptedAnswers: ['ayuda', 'Ayuda'] },
    { id: 'por-favor', targetText: 'por favor', baseText: 'bitte', acceptedAnswers: ['por favor', 'Por favor'] },
    { id: 'aqui', targetText: 'aquí', baseText: 'hier', acceptedAnswers: ['aquí', 'aqui', 'Aquí', 'Aqui'] },
  ],
  build: {
    targetText: 'Necesito ayuda, por favor.',
    chips: ['Necesito', 'ayuda,', 'por favor.', 'aquí', 'gracias'],
  },
  typeRecall: {
    before: 'Necesito ',
    answer: 'ayuda',
    after: ', por favor.',
    acceptedAnswers: ['ayuda', 'Ayuda'],
    fallbackChoices: ['ayuda', 'agua', 'información', 'tiempo'],
  },
  speakTarget: {
    baseCue: 'Ich brauche Hilfe, bitte.',
    targetPhrase: 'Necesito ayuda, por favor.',
    language: 'es-ES',
    passingThreshold: 0.8,
    requiredTokens: ['necesito', 'ayuda', 'por', 'favor'],
    optionalTokens: ['señora', 'señor', 'aquí'],
  },
  sceneCaption: 'In der Apotheke gehst du ruhig zur Theke und nennst kurz, dass du Hilfe brauchst.',
  trophyWord: {
    word: 'ayuda',
    meaning: 'Hilfe',
    example: '¿Me puede ayudar? Necesito ayuda.',
    whyThisWord: 'Ayuda ist auf A1 das direkte Hilfe-Wort und funktioniert in Apotheke, Bahnhof und Empfang gleichermaßen.',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Ruhige Apothekentheke, klares Licht, kurzer Hilferuf ohne Drama.',
  },
  songSeed: {
    genre: 'soft acoustic',
    mood: 'calm and asking',
  },
  visualNotes: 'Ruhiger Innenraum, sanftes Pastellgrün, klare Geste am Tresen.',
}

const brightSpanishLesson008: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: 'Este sitio es muy bonito.',
    baseText: 'Dieser Ort ist sehr schön.',
  },
  meaning: 'Ein kurzer, positiver Small-Talk-Kommentar über das Lokal oder den Raum.',
  chunks: [
    { id: 'este-sitio', targetText: 'Este sitio', baseText: 'Dieser Ort' },
    { id: 'es-muy', targetText: 'es muy', baseText: 'ist sehr' },
    { id: 'bonito', targetText: 'bonito.', baseText: 'schön.' },
  ],
  lessonItems: [
    { id: 'este-sitio', targetText: 'este sitio', baseText: 'dieser Ort', acceptedAnswers: ['este sitio', 'Este sitio'] },
    { id: 'es', targetText: 'es', baseText: 'ist', acceptedAnswers: ['es', 'Es'] },
    { id: 'muy', targetText: 'muy', baseText: 'sehr', acceptedAnswers: ['muy', 'Muy'] },
    { id: 'bonito', targetText: 'bonito', baseText: 'schön / hübsch', acceptedAnswers: ['bonito', 'Bonito'] },
  ],
  build: {
    targetText: 'Este sitio es muy bonito.',
    chips: ['Este sitio', 'es muy', 'bonito.', 'tranquilo', 'genial'],
  },
  typeRecall: {
    before: 'Este sitio es muy ',
    answer: 'bonito',
    after: '.',
    acceptedAnswers: ['bonito', 'Bonito'],
    fallbackChoices: ['bonito', 'tranquilo', 'pequeño', 'nuevo'],
  },
  speakTarget: {
    baseCue: 'Dieser Ort ist sehr schön.',
    targetPhrase: 'Este sitio es muy bonito.',
    language: 'es-ES',
    passingThreshold: 0.8,
    requiredTokens: ['este', 'sitio', 'bonito'],
    optionalTokens: ['es', 'muy', 'aquí'],
  },
  sceneCaption: 'Im Café drehst du dich kurz zum Gegenüber und sagst etwas Nettes über den Ort.',
  trophyWord: {
    word: 'bonito',
    meaning: 'schön / hübsch',
    example: 'Este sitio es muy bonito.',
    whyThisWord: 'Bonito ist auf A1 das warme, neutrale Lob-Wort für Orte und Dinge und ersetzt sicher größere Ausdrücke.',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Café von innen, warmes Licht, ein kurzer zufriedener Blick.',
  },
  songSeed: {
    genre: 'sunny indie pop',
    mood: 'happy and present',
  },
  visualNotes: 'Innenraum mit weichen Schatten, Korall-Akzent, sanftes Lächeln im Hintergrund.',
}

const brightSpanishLesson009: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: 'Mañana a las siete. ¡Perfecto!',
    baseText: 'Morgen um sieben. Perfekt!',
  },
  meaning: 'Eine kurze Bestätigung eines Plans mit Tag, Uhrzeit und freundlichem Zusatz.',
  chunks: [
    { id: 'manana', targetText: 'Mañana', baseText: 'Morgen' },
    { id: 'a-las-siete', targetText: 'a las siete.', baseText: 'um sieben.' },
    { id: 'perfecto', targetText: '¡Perfecto!', baseText: 'Perfekt!' },
  ],
  lessonItems: [
    { id: 'manana', targetText: 'mañana', baseText: 'morgen (am nächsten Tag)', acceptedAnswers: ['mañana', 'manana', 'Mañana', 'Manana'] },
    { id: 'a-las-siete', targetText: 'a las siete', baseText: 'um sieben Uhr', acceptedAnswers: ['a las siete', 'A las siete'] },
    { id: 'perfecto', targetText: 'perfecto', baseText: 'perfekt', acceptedAnswers: ['perfecto', 'Perfecto'] },
    { id: 'vale', targetText: 'vale', baseText: 'okay / einverstanden', acceptedAnswers: ['vale', 'Vale'] },
  ],
  build: {
    targetText: 'Mañana a las siete. ¡Perfecto!',
    chips: ['Mañana', 'a las siete.', '¡Perfecto!', 'vale', 'genial'],
  },
  typeRecall: {
    before: '',
    answer: 'Mañana',
    after: ' a las siete. ¡Perfecto!',
    acceptedAnswers: ['mañana', 'manana', 'Mañana', 'Manana'],
    fallbackChoices: ['Mañana', 'Hoy', 'Ahora', 'Después'],
  },
  speakTarget: {
    baseCue: 'Morgen um sieben. Perfekt!',
    targetPhrase: 'Mañana a las siete. ¡Perfecto!',
    language: 'es-ES',
    passingThreshold: 0.8,
    requiredTokens: ['mañana', 'siete', 'perfecto'],
    optionalTokens: ['a', 'las', 'vale', 'genial'],
  },
  sceneCaption: 'Am Ende der Begegnung bestätigst du locker den Termin für morgen.',
  trophyWord: {
    word: 'mañana',
    meaning: 'morgen (am nächsten Tag)',
    example: 'Hasta mañana a las siete.',
    whyThisWord: 'Mañana trägt auf A1 zwei Bedeutungen — Morgen und am nächsten Tag — und ist Schlüssel jeder kurzfristigen Planung.',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Spätnachmittag, kurzer Handschlag oder Nicken, ruhige Bestätigung.',
  },
  songSeed: {
    genre: 'sunny acoustic',
    mood: 'easy plan confirmation',
  },
  visualNotes: 'Warmes Abendlicht, Uhr-Akzent, ruhiges Nicken vor dem nächsten Tag.',
}

const brightSpanishLesson010: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: 'Muchas gracias. Adiós.',
    baseText: 'Vielen Dank. Auf Wiedersehen.',
  },
  meaning: 'Ein warmer Abschluss mit deutlichem Dank und freundlichem Abschied.',
  chunks: [
    { id: 'muchas-gracias', targetText: 'Muchas gracias.', baseText: 'Vielen Dank.' },
    { id: 'adios', targetText: 'Adiós.', baseText: 'Auf Wiedersehen.' },
  ],
  lessonItems: [
    { id: 'muchas', targetText: 'muchas', baseText: 'viele', acceptedAnswers: ['muchas', 'Muchas'] },
    { id: 'gracias', targetText: 'gracias', baseText: 'danke', acceptedAnswers: ['gracias', 'Gracias'] },
    { id: 'adios', targetText: 'adiós', baseText: 'auf Wiedersehen', acceptedAnswers: ['adiós', 'adios', 'Adiós', 'Adios'] },
    { id: 'hasta-luego', targetText: 'hasta luego', baseText: 'bis später', acceptedAnswers: ['hasta luego', 'Hasta luego'] },
  ],
  build: {
    targetText: 'Muchas gracias. Adiós.',
    chips: ['Muchas gracias.', 'Adiós.', 'hasta luego', 'vale'],
  },
  typeRecall: {
    before: 'Muchas ',
    answer: 'gracias',
    after: '. Adiós.',
    acceptedAnswers: ['gracias', 'Gracias'],
    fallbackChoices: ['gracias', 'adiós', 'hola', 'perdón'],
  },
  speakTarget: {
    baseCue: 'Vielen Dank. Auf Wiedersehen.',
    targetPhrase: 'Muchas gracias. Adiós.',
    language: 'es-ES',
    passingThreshold: 0.8,
    requiredTokens: ['gracias', 'adiós'],
    optionalTokens: ['muchas', 'hasta', 'luego'],
  },
  sceneCaption: 'Im Gehen drehst du dich noch einmal kurz um und schließt die Szene warm ab.',
  trophyWord: {
    word: 'gracias',
    meaning: 'danke',
    example: 'Muchas gracias por todo.',
    whyThisWord: 'Gracias schließt auf A1 jede Service-Szene sicher ab und ist als alleinstehende Antwort vollständig.',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Tür im Hintergrund, warmes Licht, kurzer Dank im Gehen.',
  },
  songSeed: {
    genre: 'sunny acoustic',
    mood: 'warm goodbye',
  },
  visualNotes: 'Sanftes Honig-Licht beim Ausgang, kurzer Nachklang, ruhige letzte Geste.',
}

const brightItalianLesson001: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: 'Salve, parla italiano?',
    baseText: 'Hallo, sprechen Sie Italienisch?',
  },
  meaning: 'Eine höfliche Eröffnungsfrage, bevor das Gespräch auf Italienisch weiterläuft.',
  chunks: [
    { id: 'salve', targetText: 'Salve,', baseText: 'Hallo,' },
    { id: 'parla', targetText: 'parla', baseText: 'sprechen Sie' },
    { id: 'italiano', targetText: 'italiano?', baseText: 'Italienisch?' },
  ],
  lessonItems: [
    { id: 'salve', targetText: 'salve', baseText: 'hallo (höflich)', acceptedAnswers: ['salve', 'Salve'] },
    { id: 'parla', targetText: 'parla', baseText: 'spricht / sprechen Sie', acceptedAnswers: ['parla', 'Parla'] },
    { id: 'italiano', targetText: 'italiano', baseText: 'Italienisch', acceptedAnswers: ['italiano', 'Italiano'] },
    { id: 'lei', targetText: 'Lei', baseText: 'Sie (höflich)', acceptedAnswers: ['Lei', 'lei'] },
  ],
  build: {
    targetText: 'Salve, parla italiano?',
    chips: ['Salve,', 'parla', 'italiano?', 'Lei', 'grazie'],
  },
  typeRecall: {
    before: 'Salve, ',
    answer: 'parla',
    after: ' italiano?',
    acceptedAnswers: ['parla', 'Parla'],
    fallbackChoices: ['parla', 'parli', 'italiano', 'Lei'],
  },
  speakTarget: {
    baseCue: 'Hallo, sprechen Sie Italienisch?',
    targetPhrase: 'Salve, parla italiano?',
    language: 'it-IT',
    passingThreshold: 0.8,
    requiredTokens: ['salve', 'parla', 'italiano'],
    optionalTokens: ['Lei', 'per', 'favore'],
  },
  sceneCaption: 'Vor der Theke im Café fragst du höflich, ob hier Italienisch gesprochen wird.',
  trophyWord: {
    word: 'salve',
    meaning: 'hallo (höflich, tageszeitenneutral)',
    example: 'Salve, come va?',
    whyThisWord: 'Salve eröffnet auf A1 jede Service-Szene höflich und passt morgens wie nachmittags, ohne zwischen "buongiorno" und "buonasera" wählen zu müssen.',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Morgenlicht im Café, offene Theke, ruhiger erster Gruß auf Italienisch.',
  },
  songSeed: {
    genre: 'sunny acoustic mediterranean',
    mood: 'warm first contact',
  },
  visualNotes: 'Warmes Honig-Licht, Café-Theke, sanfter Korall-Akzent auf Salve.',
}

const brightItalianLesson002: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: 'Scusi, può ripetere?',
    baseText: 'Entschuldigung, können Sie das wiederholen?',
  },
  meaning: 'Eine höfliche Bitte, das eben Gesagte noch einmal zu hören.',
  chunks: [
    { id: 'scusi', targetText: 'Scusi,', baseText: 'Entschuldigung,' },
    { id: 'puo', targetText: 'può', baseText: 'können Sie' },
    { id: 'ripetere', targetText: 'ripetere?', baseText: 'wiederholen?' },
  ],
  lessonItems: [
    { id: 'scusi', targetText: 'scusi', baseText: 'Entschuldigung (höflich)', acceptedAnswers: ['scusi', 'Scusi'] },
    { id: 'puo', targetText: 'può', baseText: 'können Sie', acceptedAnswers: ['può', 'puo', 'Può', 'Puo'] },
    { id: 'ripetere', targetText: 'ripetere', baseText: 'wiederholen', acceptedAnswers: ['ripetere', 'Ripetere'] },
    { id: 'piu-lentamente', targetText: 'più lentamente', baseText: 'langsamer', acceptedAnswers: ['più lentamente', 'piu lentamente'] },
  ],
  build: {
    targetText: 'Scusi, può ripetere?',
    chips: ['Scusi,', 'può', 'ripetere?', 'più lentamente', 'grazie'],
  },
  typeRecall: {
    before: 'Scusi, può ',
    answer: 'ripetere',
    after: '?',
    acceptedAnswers: ['ripetere', 'Ripetere'],
    fallbackChoices: ['ripetere', 'parlare', 'dire', 'ascoltare'],
  },
  speakTarget: {
    baseCue: 'Entschuldigung, können Sie das wiederholen?',
    targetPhrase: 'Scusi, può ripetere?',
    language: 'it-IT',
    passingThreshold: 0.8,
    requiredTokens: ['scusi', 'può', 'ripetere'],
    optionalTokens: ['più', 'lentamente', 'per', 'favore'],
  },
  sceneCaption: 'Mitten im Gespräch hebst du kurz die Hand und bittest höflich um eine Wiederholung.',
  trophyWord: {
    word: 'scusi',
    meaning: 'Entschuldigung (höflich, Lei)',
    example: 'Scusi, non ho capito.',
    whyThisWord: 'Scusi ist die höfliche Lei-Form von "Entschuldigung" und eröffnet auf A1 jede Korrektur, Rückfrage oder kleine Pause im Gespräch. Achtung: "scusa" ist die du-Form.',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Sanftes Café-Licht, kurze Pause am Tresen, ruhige Rückfrage.',
  },
  songSeed: {
    genre: 'soft acoustic',
    mood: 'gentle pause',
  },
  visualNotes: 'Pausen-Beat, sanfter Glow um Scusi, ruhiger Atemmoment.',
}

const brightItalianLesson003: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: "Scusi, dov'è la stazione?",
    baseText: 'Entschuldigung, wo ist der Bahnhof?',
  },
  meaning: 'Eine kurze, höfliche Frage nach einem klaren Ziel in der Stadt.',
  chunks: [
    { id: 'scusi', targetText: 'Scusi,', baseText: 'Entschuldigung,' },
    { id: 'dove-e', targetText: "dov'è", baseText: 'wo ist' },
    { id: 'la-stazione', targetText: 'la stazione?', baseText: 'der Bahnhof?' },
  ],
  lessonItems: [
    { id: 'dove', targetText: 'dove', baseText: 'wo', acceptedAnswers: ['dove', 'Dove'] },
    { id: 'e', targetText: 'è', baseText: 'ist (Ort)', acceptedAnswers: ['è', 'e', 'È', 'E'] },
    { id: 'stazione', targetText: 'stazione', baseText: 'Bahnhof', acceptedAnswers: ['stazione', 'Stazione'] },
    { id: 'qui-vicino', targetText: 'qui vicino', baseText: 'hier in der Nähe', acceptedAnswers: ['qui vicino', 'Qui vicino'] },
  ],
  build: {
    targetText: "Scusi, dov'è la stazione?",
    chips: ['Scusi,', "dov'è", 'la stazione?', 'qui vicino', 'grazie'],
  },
  typeRecall: {
    before: 'Scusi, ',
    answer: "dov'è",
    after: ' la stazione?',
    acceptedAnswers: ["dov'è", 'dove è', "Dov'è", 'Dove è'],
    fallbackChoices: ["dov'è", 'come', 'quando', 'chi'],
  },
  speakTarget: {
    baseCue: 'Entschuldigung, wo ist der Bahnhof?',
    targetPhrase: "Scusi, dov'è la stazione?",
    language: 'it-IT',
    passingThreshold: 0.8,
    requiredTokens: ['scusi', 'dove', 'stazione'],
    optionalTokens: ['è', 'la', 'qui', 'vicino', 'per', 'favore'],
  },
  sceneCaption: 'Auf dem Gehweg sprichst du jemanden kurz an und fragst höflich nach dem Bahnhof.',
  trophyWord: {
    word: 'dove',
    meaning: 'wo',
    example: "Dov'è il museo?",
    whyThisWord: 'Dove ist auf A1 das zentrale Frage-Wort für jede Ortsfrage und vor Vokalen wird daraus die Verschmelzung "dov\'è" — eine der wichtigsten kleinen Italienisch-Reflexe.',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Helle Straße am Vormittag, ein Bahnhofsschild in der Ferne, offene Geste.',
  },
  songSeed: {
    genre: 'sunny acoustic',
    mood: 'open and asking',
  },
  visualNotes: 'Goldene Richtungsachse, Bahnhofssymbol am Horizont, warme Hinweisspur.',
}

const brightItalianLesson004: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: 'Vorrei un caffè, per favore.',
    baseText: 'Ich hätte gerne einen Kaffee, bitte.',
  },
  meaning: 'Eine höfliche Bestellung am Tresen mit dem italienischen Konditional als sanftem Wunsch.',
  chunks: [
    { id: 'vorrei', targetText: 'Vorrei', baseText: 'Ich hätte gerne' },
    { id: 'un-caffe', targetText: 'un caffè,', baseText: 'einen Kaffee,' },
    { id: 'per-favore', targetText: 'per favore.', baseText: 'bitte.' },
  ],
  lessonItems: [
    { id: 'vorrei', targetText: 'vorrei', baseText: 'ich hätte gerne', acceptedAnswers: ['vorrei', 'Vorrei'] },
    { id: 'un', targetText: 'un', baseText: 'einen / ein', acceptedAnswers: ['un', 'Un'] },
    { id: 'caffe', targetText: 'caffè', baseText: 'Kaffee', acceptedAnswers: ['caffè', 'caffe', 'Caffè', 'Caffe'] },
    { id: 'per-favore', targetText: 'per favore', baseText: 'bitte', acceptedAnswers: ['per favore', 'Per favore', 'per piacere', 'Per piacere'] },
  ],
  build: {
    targetText: 'Vorrei un caffè, per favore.',
    chips: ['Vorrei', 'un caffè,', 'per favore.', 'macchiato', 'grazie'],
  },
  typeRecall: {
    before: 'Vorrei un ',
    answer: 'caffè',
    after: ', per favore.',
    acceptedAnswers: ['caffè', 'caffe', 'Caffè', 'Caffe'],
    fallbackChoices: ['caffè', 'tè', 'acqua', 'vino'],
  },
  speakTarget: {
    baseCue: 'Ich hätte gerne einen Kaffee, bitte.',
    targetPhrase: 'Vorrei un caffè, per favore.',
    language: 'it-IT',
    passingThreshold: 0.8,
    requiredTokens: ['vorrei', 'caffè', 'per', 'favore'],
    optionalTokens: ['un', 'macchiato', 'grazie'],
  },
  sceneCaption: 'Am Tresen klingt die Bestellung kurz, ruhig und freundlich mit dem typischen "vorrei".',
  trophyWord: {
    word: 'caffè',
    meaning: 'Kaffee (espresso)',
    example: 'Un caffè, per favore.',
    whyThisWord: 'Caffè ist auf A1 das Tresen-Wort schlechthin — im Italienischen bedeutet "un caffè" immer einen Espresso, nicht den deutschen "Becher Kaffee". Schreibe den Grave-Akzent: caffè, nicht caffe.',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Espresso-Tasse auf der Theke, warmes Morgenlicht, ruhige Bestellung.',
  },
  songSeed: {
    genre: 'upbeat acoustic mediterranean',
    mood: 'fresh and easy',
  },
  visualNotes: 'Espresso-Detail in goldenem Licht, kurzer Tresenmoment, sanfte Wärme.',
}

const brightItalianLesson005: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: 'Quanto costa?',
    baseText: 'Wie viel kostet das?',
  },
  meaning: 'Eine direkte, höfliche Preisfrage zu einem Gegenstand vor dir.',
  chunks: [
    { id: 'quanto', targetText: 'Quanto', baseText: 'Wie viel' },
    { id: 'costa', targetText: 'costa?', baseText: 'kostet?' },
  ],
  lessonItems: [
    { id: 'quanto', targetText: 'quanto', baseText: 'wie viel', acceptedAnswers: ['quanto', 'Quanto'] },
    { id: 'costa', targetText: 'costa', baseText: 'kostet', acceptedAnswers: ['costa', 'Costa'] },
    { id: 'questo', targetText: 'questo', baseText: 'das hier', acceptedAnswers: ['questo', 'Questo'] },
    { id: 'caro', targetText: 'caro', baseText: 'teuer', acceptedAnswers: ['caro', 'Caro'] },
  ],
  build: {
    targetText: 'Quanto costa?',
    chips: ['Quanto', 'costa?', 'questo', 'caro', 'troppo'],
  },
  typeRecall: {
    before: '',
    answer: 'Quanto',
    after: ' costa?',
    acceptedAnswers: ['quanto', 'Quanto'],
    fallbackChoices: ['Quanto', 'Come', 'Quando', 'Chi'],
  },
  speakTarget: {
    baseCue: 'Wie viel kostet das?',
    targetPhrase: 'Quanto costa?',
    language: 'it-IT',
    passingThreshold: 0.8,
    requiredTokens: ['quanto', 'costa'],
    optionalTokens: ['questo', 'per', 'favore', 'scusi'],
  },
  sceneCaption: 'Im kleinen Laden hältst du den Gegenstand in der Hand und fragst nach dem Preis.',
  trophyWord: {
    word: 'quanto',
    meaning: 'wie viel',
    example: "Quanto costa? Quant'è?",
    whyThisWord: 'Quanto öffnet auf A1 jede Preis- und Mengenfrage am Tresen und verschmilzt vor Vokalen oft zu "quant\'è". Achtung: das Wort kongruiert mit dem Bezugswort (quanti caffè, quante volte).',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Kleines Ladenlokal, Gegenstand auf dem Tresen, klare Preisfrage.',
  },
  songSeed: {
    genre: 'sunny indie pop',
    mood: 'curious and direct',
  },
  visualNotes: 'Preisschild im Fokus, warme Pastellfarben, ruhige Beleuchtung.',
}

const brightItalianLesson006: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: 'A che ora parte il treno?',
    baseText: 'Um wie viel Uhr fährt der Zug?',
  },
  meaning: 'Eine klare Frage nach der Abfahrtszeit am Bahnhof.',
  chunks: [
    { id: 'a-che-ora', targetText: 'A che ora', baseText: 'Um wie viel Uhr' },
    { id: 'parte', targetText: 'parte', baseText: 'fährt' },
    { id: 'il-treno', targetText: 'il treno?', baseText: 'der Zug?' },
  ],
  lessonItems: [
    { id: 'a-che-ora', targetText: 'a che ora', baseText: 'um wie viel Uhr', acceptedAnswers: ['a che ora', 'A che ora'] },
    { id: 'parte', targetText: 'parte', baseText: 'fährt ab', acceptedAnswers: ['parte', 'Parte'] },
    { id: 'treno', targetText: 'treno', baseText: 'Zug', acceptedAnswers: ['treno', 'Treno'] },
    { id: 'binario', targetText: 'binario', baseText: 'Bahnsteig / Gleis', acceptedAnswers: ['binario', 'Binario'] },
  ],
  build: {
    targetText: 'A che ora parte il treno?',
    chips: ['A che ora', 'parte', 'il treno?', 'binario', 'adesso'],
  },
  typeRecall: {
    before: 'A che ora parte il ',
    answer: 'treno',
    after: '?',
    acceptedAnswers: ['treno', 'Treno'],
    fallbackChoices: ['treno', 'autobus', 'binario', 'taxi'],
  },
  speakTarget: {
    baseCue: 'Um wie viel Uhr fährt der Zug?',
    targetPhrase: 'A che ora parte il treno?',
    language: 'it-IT',
    passingThreshold: 0.8,
    requiredTokens: ['ora', 'parte', 'treno'],
    optionalTokens: ['a', 'che', 'il', 'per', 'favore'],
  },
  sceneCaption: 'Am Informationsschalter im Bahnhof fragst du nach der Abfahrtszeit.',
  trophyWord: {
    word: 'treno',
    meaning: 'Zug',
    example: 'Il treno parte alle otto.',
    whyThisWord: 'Treno ist auf A1 das zentrale Reisewort für Italien und öffnet das ganze Bahnhofs-Vokabular von "binario" bis "biglietto".',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Helle Bahnhofshalle, Anzeigetafel im Hintergrund, ruhige Frage am Schalter.',
  },
  songSeed: {
    genre: 'upbeat acoustic',
    mood: 'ready and moving',
  },
  visualNotes: 'Uhr- und Tafel-Detail, warme Halle, klare Linienführung Richtung Bahnsteig.',
}

const brightItalianLesson007: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: 'Ho bisogno di aiuto, per favore.',
    baseText: 'Ich brauche Hilfe, bitte.',
  },
  meaning: 'Eine knappe, höfliche Bitte um Hilfe, ohne das Problem schon zu benennen.',
  chunks: [
    { id: 'ho-bisogno', targetText: 'Ho bisogno', baseText: 'Ich brauche' },
    { id: 'di-aiuto', targetText: 'di aiuto,', baseText: 'Hilfe,' },
    { id: 'per-favore', targetText: 'per favore.', baseText: 'bitte.' },
  ],
  lessonItems: [
    { id: 'ho-bisogno', targetText: 'ho bisogno', baseText: 'ich brauche', acceptedAnswers: ['ho bisogno', 'Ho bisogno'] },
    { id: 'aiuto', targetText: 'aiuto', baseText: 'Hilfe', acceptedAnswers: ['aiuto', 'Aiuto'] },
    { id: 'per-favore', targetText: 'per favore', baseText: 'bitte', acceptedAnswers: ['per favore', 'Per favore', 'per piacere', 'Per piacere'] },
    { id: 'qui', targetText: 'qui', baseText: 'hier', acceptedAnswers: ['qui', 'Qui'] },
  ],
  build: {
    targetText: 'Ho bisogno di aiuto, per favore.',
    chips: ['Ho bisogno', 'di aiuto,', 'per favore.', 'qui', 'grazie'],
  },
  typeRecall: {
    before: 'Ho bisogno di ',
    answer: 'aiuto',
    after: ', per favore.',
    acceptedAnswers: ['aiuto', 'Aiuto'],
    fallbackChoices: ['aiuto', 'acqua', 'tempo', 'spazio'],
  },
  speakTarget: {
    baseCue: 'Ich brauche Hilfe, bitte.',
    targetPhrase: 'Ho bisogno di aiuto, per favore.',
    language: 'it-IT',
    passingThreshold: 0.8,
    requiredTokens: ['bisogno', 'aiuto', 'per', 'favore'],
    optionalTokens: ['ho', 'di', 'qui', 'scusi'],
  },
  sceneCaption: 'In der Apotheke gehst du ruhig zur Theke und nennst kurz, dass du Hilfe brauchst.',
  trophyWord: {
    word: 'aiuto',
    meaning: 'Hilfe',
    example: 'Ho bisogno di aiuto.',
    whyThisWord: 'Aiuto ist auf A1 das direkte Hilfe-Wort und funktioniert in Apotheke, Bahnhof und am Empfang gleichermaßen. Lautlich beachten: drei Silben, "a-iu-to".',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Ruhige Apothekentheke, klares Licht, kurzer Hilferuf ohne Drama.',
  },
  songSeed: {
    genre: 'soft acoustic',
    mood: 'calm and asking',
  },
  visualNotes: 'Ruhiger Innenraum, sanftes Pastellgrün, klare Geste am Tresen.',
}

const brightItalianLesson008: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: 'Mi piace molto questo posto.',
    baseText: 'Mir gefällt dieser Ort sehr.',
  },
  meaning: 'Ein kurzer, warmer Small-Talk-Satz über das Lokal oder den Raum.',
  chunks: [
    { id: 'mi-piace-molto', targetText: 'Mi piace molto', baseText: 'Mir gefällt sehr' },
    { id: 'questo-posto', targetText: 'questo posto.', baseText: 'dieser Ort.' },
  ],
  lessonItems: [
    { id: 'mi-piace', targetText: 'mi piace', baseText: 'es gefällt mir', acceptedAnswers: ['mi piace', 'Mi piace'] },
    { id: 'molto', targetText: 'molto', baseText: 'sehr', acceptedAnswers: ['molto', 'Molto'] },
    { id: 'questo', targetText: 'questo', baseText: 'dieses', acceptedAnswers: ['questo', 'Questo'] },
    { id: 'posto', targetText: 'posto', baseText: 'Ort / Platz', acceptedAnswers: ['posto', 'Posto'] },
  ],
  build: {
    targetText: 'Mi piace molto questo posto.',
    chips: ['Mi piace molto', 'questo posto.', 'tranquillo', 'bello'],
  },
  typeRecall: {
    before: 'Mi piace molto questo ',
    answer: 'posto',
    after: '.',
    acceptedAnswers: ['posto', 'Posto'],
    fallbackChoices: ['posto', 'bar', 'tavolo', 'angolo'],
  },
  speakTarget: {
    baseCue: 'Mir gefällt dieser Ort sehr.',
    targetPhrase: 'Mi piace molto questo posto.',
    language: 'it-IT',
    passingThreshold: 0.8,
    requiredTokens: ['piace', 'questo', 'posto'],
    optionalTokens: ['mi', 'molto', 'tanto'],
  },
  sceneCaption: 'Im Café drehst du dich kurz zum Gegenüber und sagst etwas Nettes über den Ort.',
  trophyWord: {
    word: 'posto',
    meaning: 'Ort / Platz',
    example: 'Questo posto è bellissimo.',
    whyThisWord: 'Posto ist auf A1 das warme, neutrale Wort für jeden Ort, Tisch oder Sitzplatz und ersetzt sicher kompliziertere Begriffe wie "luogo".',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Café von innen, warmes Licht, ein kurzer zufriedener Blick.',
  },
  songSeed: {
    genre: 'sunny indie pop',
    mood: 'happy and present',
  },
  visualNotes: 'Innenraum mit weichen Schatten, Korall-Akzent, sanftes Lächeln im Hintergrund.',
}

const brightItalianLesson009: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: 'Domani alle sette. Perfetto!',
    baseText: 'Morgen um sieben. Perfekt!',
  },
  meaning: 'Eine kurze Bestätigung eines Plans mit Tag, Uhrzeit und freundlichem Zusatz.',
  chunks: [
    { id: 'domani', targetText: 'Domani', baseText: 'Morgen' },
    { id: 'alle-sette', targetText: 'alle sette.', baseText: 'um sieben.' },
    { id: 'perfetto', targetText: 'Perfetto!', baseText: 'Perfekt!' },
  ],
  lessonItems: [
    { id: 'domani', targetText: 'domani', baseText: 'morgen (am nächsten Tag)', acceptedAnswers: ['domani', 'Domani'] },
    { id: 'alle-sette', targetText: 'alle sette', baseText: 'um sieben Uhr', acceptedAnswers: ['alle sette', 'Alle sette'] },
    { id: 'perfetto', targetText: 'perfetto', baseText: 'perfekt', acceptedAnswers: ['perfetto', 'Perfetto'] },
    { id: 'va-bene', targetText: 'va bene', baseText: 'okay / einverstanden', acceptedAnswers: ['va bene', 'Va bene'] },
  ],
  build: {
    targetText: 'Domani alle sette. Perfetto!',
    chips: ['Domani', 'alle sette.', 'Perfetto!', 'va bene', 'ottimo'],
  },
  typeRecall: {
    before: 'Domani alle sette. ',
    answer: 'Perfetto',
    after: '!',
    acceptedAnswers: ['perfetto', 'Perfetto'],
    fallbackChoices: ['Perfetto', 'Ottimo', 'Bene', 'Magari'],
  },
  speakTarget: {
    baseCue: 'Morgen um sieben. Perfekt!',
    targetPhrase: 'Domani alle sette. Perfetto!',
    language: 'it-IT',
    passingThreshold: 0.8,
    requiredTokens: ['domani', 'sette', 'perfetto'],
    optionalTokens: ['alle', 'va', 'bene', 'ottimo'],
  },
  sceneCaption: 'Am Ende der Begegnung bestätigst du locker den Termin für morgen.',
  trophyWord: {
    word: 'perfetto',
    meaning: 'perfekt (zustimmend)',
    example: 'Domani alle sette? Perfetto!',
    whyThisWord: 'Perfetto ist auf A1 die freundliche, leichte Zustimmung und ersetzt sicher die englischen Floskeln "great" oder "brilliant". Wird im Italienischen sehr oft als alleinstehende Antwort verwendet.',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Spätnachmittag, kurzer Handschlag oder Nicken, ruhige Bestätigung.',
  },
  songSeed: {
    genre: 'sunny acoustic',
    mood: 'easy plan confirmation',
  },
  visualNotes: 'Warmes Abendlicht, Uhr-Akzent, ruhiges Nicken vor dem nächsten Tag.',
}

const brightItalianLesson010: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: 'Grazie mille. Arrivederci.',
    baseText: 'Vielen Dank. Auf Wiedersehen.',
  },
  meaning: 'Ein warmer Abschluss mit deutlichem Dank und freundlichem höflichem Abschied.',
  chunks: [
    { id: 'grazie-mille', targetText: 'Grazie mille.', baseText: 'Vielen Dank.' },
    { id: 'arrivederci', targetText: 'Arrivederci.', baseText: 'Auf Wiedersehen.' },
  ],
  lessonItems: [
    { id: 'grazie', targetText: 'grazie', baseText: 'danke', acceptedAnswers: ['grazie', 'Grazie'] },
    { id: 'mille', targetText: 'mille', baseText: 'tausend (verstärkt: vielen)', acceptedAnswers: ['mille', 'Mille'] },
    { id: 'arrivederci', targetText: 'arrivederci', baseText: 'auf Wiedersehen (höflich)', acceptedAnswers: ['arrivederci', 'Arrivederci'] },
    { id: 'a-presto', targetText: 'a presto', baseText: 'bis bald', acceptedAnswers: ['a presto', 'A presto'] },
  ],
  build: {
    targetText: 'Grazie mille. Arrivederci.',
    chips: ['Grazie mille.', 'Arrivederci.', 'a presto', 'buona giornata'],
  },
  typeRecall: {
    before: 'Grazie mille. ',
    answer: 'Arrivederci',
    after: '.',
    acceptedAnswers: ['arrivederci', 'Arrivederci'],
    fallbackChoices: ['Arrivederci', 'Ciao', 'Salve', 'Scusi'],
  },
  speakTarget: {
    baseCue: 'Vielen Dank. Auf Wiedersehen.',
    targetPhrase: 'Grazie mille. Arrivederci.',
    language: 'it-IT',
    passingThreshold: 0.8,
    requiredTokens: ['grazie', 'arrivederci'],
    optionalTokens: ['mille', 'a', 'presto', 'buona', 'giornata'],
  },
  sceneCaption: 'Im Gehen drehst du dich noch einmal kurz um und schließt die Szene warm und höflich ab.',
  trophyWord: {
    word: 'arrivederci',
    meaning: 'auf Wiedersehen (höflich)',
    example: 'Grazie mille. Arrivederci.',
    whyThisWord: 'Arrivederci schließt auf A1 jede Service-Szene höflich ab und ist die sichere Lei-Variante von "ciao". Wörtlich "auf das Wiedersehen" — das "a rivederci" gibt dem Wort seine warme Schwingung.',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Tür im Hintergrund, warmes Licht, kurzer Dank im Gehen.',
  },
  songSeed: {
    genre: 'sunny acoustic mediterranean',
    mood: 'warm goodbye',
  },
  visualNotes: 'Sanftes Honig-Licht beim Ausgang, kurzer Nachklang, ruhige letzte Geste.',
}

const brightItalianP2Lesson001: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: 'Scusi, non capisco. Mi può aiutare?',
    baseText: 'Entschuldigung, ich verstehe nicht. Können Sie mir helfen?',
  },
  meaning: 'Eine ruhige, höfliche Eröffnung: kurz zugeben, dass etwas unklar ist, und um Hilfe bitten.',
  chunks: [
    { id: 'scusi', targetText: 'Scusi,', baseText: 'Entschuldigung,' },
    { id: 'non-capisco', targetText: 'non capisco.', baseText: 'ich verstehe nicht.' },
    { id: 'mi-puo-aiutare', targetText: 'Mi può aiutare?', baseText: 'Können Sie mir helfen?' },
  ],
  lessonItems: [
    { id: 'capisco', targetText: 'capisco', baseText: 'ich verstehe', acceptedAnswers: ['capisco', 'Capisco'] },
    { id: 'non-capisco', targetText: 'non capisco', baseText: 'ich verstehe nicht', acceptedAnswers: ['non capisco', 'Non capisco'] },
    { id: 'mi-puo', targetText: 'mi può', baseText: 'können Sie mir', acceptedAnswers: ['mi può', 'mi puo', 'Mi può', 'Mi puo'] },
    { id: 'aiutare', targetText: 'aiutare', baseText: 'helfen', acceptedAnswers: ['aiutare', 'Aiutare'] },
  ],
  build: {
    targetText: 'Scusi, non capisco. Mi può aiutare?',
    chips: ['Scusi,', 'non capisco.', 'Mi può aiutare?', 'aiutare', 'per favore'],
  },
  typeRecall: {
    before: 'Scusi, non ',
    answer: 'capisco',
    after: '. Mi può aiutare?',
    acceptedAnswers: ['capisco', 'Capisco'],
    fallbackChoices: ['capisco', 'capisce', 'parlo', 'sento'],
  },
  speakTarget: {
    baseCue: 'Entschuldigung, ich verstehe nicht. Können Sie mir helfen?',
    targetPhrase: 'Scusi, non capisco. Mi può aiutare?',
    language: 'it-IT',
    passingThreshold: 0.8,
    requiredTokens: ['scusi', 'non', 'capisco', 'aiutare'],
    optionalTokens: ['mi', 'può', 'per', 'favore'],
  },
  sceneCaption: 'Mitten im Gespräch gibst du ruhig zu, dass du etwas nicht verstanden hast, und öffnest die Bitte um Hilfe.',
  trophyWord: {
    word: 'capisco',
    meaning: 'ich verstehe',
    example: 'Non capisco, mi scusi.',
    whyThisWord: 'Capisco ist auf A1 das zentrale Verständnis-Verb in der 1. Person und öffnet jede Klärungsbitte ohne Drama. Negation einfach mit "non" davor: non capisco.',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Tresen, ruhige Geste, kurze ehrliche Bitte um Hilfe.',
  },
  songSeed: {
    genre: 'soft acoustic',
    mood: 'calm and asking',
  },
  visualNotes: 'Sanftes Pastellgrün, ehrlicher Blick, ruhige Mikropause vor der Bitte.',
}

const brightItalianP2Lesson002: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: 'Può scriverlo, per favore?',
    baseText: 'Können Sie es bitte aufschreiben?',
  },
  meaning: 'Eine knappe, höfliche Bitte, eine wichtige Information aufzuschreiben.',
  chunks: [
    { id: 'puo', targetText: 'Può', baseText: 'Können Sie' },
    { id: 'scriverlo', targetText: 'scriverlo,', baseText: 'es aufschreiben,' },
    { id: 'per-favore', targetText: 'per favore?', baseText: 'bitte?' },
  ],
  lessonItems: [
    { id: 'puo', targetText: 'può', baseText: 'können Sie', acceptedAnswers: ['può', 'puo', 'Può', 'Puo'] },
    { id: 'scrivere', targetText: 'scrivere', baseText: 'schreiben', acceptedAnswers: ['scrivere', 'Scrivere'] },
    { id: 'scriverlo', targetText: 'scriverlo', baseText: 'es aufschreiben', acceptedAnswers: ['scriverlo', 'Scriverlo'] },
    { id: 'qui', targetText: 'qui', baseText: 'hier', acceptedAnswers: ['qui', 'Qui'] },
  ],
  build: {
    targetText: 'Può scriverlo, per favore?',
    chips: ['Può', 'scriverlo,', 'per favore?', 'qui', 'grazie'],
  },
  typeRecall: {
    before: 'Può ',
    answer: 'scriverlo',
    after: ', per favore?',
    acceptedAnswers: ['scriverlo', 'Scriverlo'],
    fallbackChoices: ['scriverlo', 'dirlo', 'ripeterlo', 'mostrarlo'],
  },
  speakTarget: {
    baseCue: 'Können Sie es bitte aufschreiben?',
    targetPhrase: 'Può scriverlo, per favore?',
    language: 'it-IT',
    passingThreshold: 0.8,
    requiredTokens: ['può', 'scriverlo', 'per', 'favore'],
    optionalTokens: ['qui', 'mi', 'lo'],
  },
  sceneCaption: 'Am Schalter reichst du Stift oder Notiz hin und bittest, etwas Wichtiges aufzuschreiben.',
  trophyWord: {
    word: 'scrivere',
    meaning: 'schreiben',
    example: 'Può scriverlo qui?',
    whyThisWord: 'Scrivere ist das A1-Verb für jede Schreib-Bitte und nimmt die kleinen Anhänge sehr italienisch: scriverlo = "es schreiben", scrivermi = "mir schreiben".',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Notizzettel auf der Theke, Stift bereit, ruhige Hilfe-Geste.',
  },
  songSeed: {
    genre: 'soft acoustic',
    mood: 'precise and helpful',
  },
  visualNotes: 'Klare Linien, Notizzettel im Fokus, sanfter Akzent auf der Spitze des Stifts.',
}

const brightItalianP2Lesson003: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: 'Mi può mostrare sulla mappa?',
    baseText: 'Können Sie es mir auf der Karte zeigen?',
  },
  meaning: 'Eine konkrete Bitte, einen Ort auf der Karte (oder dem Handy) zu zeigen.',
  chunks: [
    { id: 'mi-puo-mostrare', targetText: 'Mi può mostrare', baseText: 'Können Sie mir zeigen' },
    { id: 'sulla-mappa', targetText: 'sulla mappa?', baseText: 'auf der Karte?' },
  ],
  lessonItems: [
    { id: 'mostrare', targetText: 'mostrare', baseText: 'zeigen', acceptedAnswers: ['mostrare', 'Mostrare'] },
    { id: 'mappa', targetText: 'mappa', baseText: 'Karte (Stadtplan)', acceptedAnswers: ['mappa', 'Mappa'] },
    { id: 'sulla', targetText: 'sulla', baseText: 'auf der', acceptedAnswers: ['sulla', 'Sulla'] },
    { id: 'qui', targetText: 'qui', baseText: 'hier', acceptedAnswers: ['qui', 'Qui'] },
  ],
  build: {
    targetText: 'Mi può mostrare sulla mappa?',
    chips: ['Mi può mostrare', 'sulla mappa?', 'qui', 'per favore'],
  },
  typeRecall: {
    before: 'Mi può mostrare sulla ',
    answer: 'mappa',
    after: '?',
    acceptedAnswers: ['mappa', 'Mappa'],
    fallbackChoices: ['mappa', 'foto', 'schermo', 'pagina'],
  },
  speakTarget: {
    baseCue: 'Können Sie es mir auf der Karte zeigen?',
    targetPhrase: 'Mi può mostrare sulla mappa?',
    language: 'it-IT',
    passingThreshold: 0.8,
    requiredTokens: ['mostrare', 'mappa'],
    optionalTokens: ['mi', 'può', 'sulla', 'per', 'favore'],
  },
  sceneCaption: 'Am Schalter oder auf dem Bürgersteig hältst du die Karte hin und bittest um eine konkrete Geste.',
  trophyWord: {
    word: 'mappa',
    meaning: 'Karte (Stadtplan)',
    example: 'Dov\'è sulla mappa?',
    whyThisWord: 'Mappa ist auf A1 die Karte in der Hand oder auf dem Handy. Vorsicht: das deutsche "Mappe" (Ordner) heißt im Italienischen "cartella" — falscher Freund.',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Stadtkarte auf dem Tresen, Finger zeigt eine Linie, ruhige Frage.',
  },
  songSeed: {
    genre: 'sunny acoustic',
    mood: 'navigating together',
  },
  visualNotes: 'Karte im Fokus, warmes Hinweislicht, leichte Hand-Bewegung.',
}

const brightItalianP2Lesson004: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: 'Questo o quello?',
    baseText: 'Dieses oder jenes?',
  },
  meaning: 'Eine knappe Auswahl-Frage zwischen zwei sichtbaren Möglichkeiten.',
  chunks: [
    { id: 'questo', targetText: 'Questo', baseText: 'Dieses' },
    { id: 'o', targetText: 'o', baseText: 'oder' },
    { id: 'quello', targetText: 'quello?', baseText: 'jenes?' },
  ],
  lessonItems: [
    { id: 'questo', targetText: 'questo', baseText: 'dieses (hier)', acceptedAnswers: ['questo', 'Questo'] },
    { id: 'quello', targetText: 'quello', baseText: 'jenes (dort)', acceptedAnswers: ['quello', 'Quello'] },
    { id: 'o', targetText: 'o', baseText: 'oder', acceptedAnswers: ['o', 'O'] },
    { id: 'meglio', targetText: 'meglio', baseText: 'besser', acceptedAnswers: ['meglio', 'Meglio'] },
  ],
  build: {
    targetText: 'Questo o quello?',
    chips: ['Questo', 'o', 'quello?', 'meglio', 'qui'],
  },
  typeRecall: {
    before: '',
    answer: 'Questo',
    after: ' o quello?',
    acceptedAnswers: ['questo', 'Questo'],
    fallbackChoices: ['Questo', 'Quello', 'Quale', 'Quanto'],
  },
  speakTarget: {
    baseCue: 'Dieses oder jenes?',
    targetPhrase: 'Questo o quello?',
    language: 'it-IT',
    passingThreshold: 0.8,
    requiredTokens: ['questo', 'quello'],
    optionalTokens: ['o', 'meglio', 'per', 'favore'],
  },
  sceneCaption: 'Vor zwei kleinen Stücken Gebäck zeigst du kurz beide und stellst die Wahlfrage.',
  trophyWord: {
    word: 'questo',
    meaning: 'dieses (hier)',
    example: 'Questo o quello?',
    whyThisWord: 'Questo ist auf A1 das maskuline Nahzeige-Wort und kongruiert mit dem Bezugswort: questo caffè, questa mela, questi panini, queste cose. Das Gegenstück fern ist "quello".',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Zwei kleine Stücke nebeneinander, Finger zeigt erst auf das eine, dann auf das andere.',
  },
  songSeed: {
    genre: 'upbeat acoustic',
    mood: 'curious and choosing',
  },
  visualNotes: 'Symmetrische Zwei-Objekt-Komposition, warmes Licht, klare Auswahl-Stimmung.',
}

const brightItalianP2Lesson005: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: 'Questo è disponibile?',
    baseText: 'Ist das verfügbar?',
  },
  meaning: 'Eine kurze, höfliche Frage, ob etwas Sichtbares gerade vorhanden ist.',
  chunks: [
    { id: 'questo', targetText: 'Questo', baseText: 'Dieses' },
    { id: 'e', targetText: 'è', baseText: 'ist' },
    { id: 'disponibile', targetText: 'disponibile?', baseText: 'verfügbar?' },
  ],
  lessonItems: [
    { id: 'disponibile', targetText: 'disponibile', baseText: 'verfügbar / erhältlich', acceptedAnswers: ['disponibile', 'Disponibile'] },
    { id: 'e', targetText: 'è', baseText: 'ist', acceptedAnswers: ['è', 'e', 'È', 'E'] },
    { id: 'ancora', targetText: 'ancora', baseText: 'noch', acceptedAnswers: ['ancora', 'Ancora'] },
    { id: 'subito', targetText: 'subito', baseText: 'sofort', acceptedAnswers: ['subito', 'Subito'] },
  ],
  build: {
    targetText: 'Questo è disponibile?',
    chips: ['Questo', 'è', 'disponibile?', 'ancora', 'subito'],
  },
  typeRecall: {
    before: 'Questo è ',
    answer: 'disponibile',
    after: '?',
    acceptedAnswers: ['disponibile', 'Disponibile'],
    fallbackChoices: ['disponibile', 'pronto', 'libero', 'aperto'],
  },
  speakTarget: {
    baseCue: 'Ist das verfügbar?',
    targetPhrase: 'Questo è disponibile?',
    language: 'it-IT',
    passingThreshold: 0.8,
    requiredTokens: ['questo', 'disponibile'],
    optionalTokens: ['è', 'ancora', 'subito', 'per', 'favore'],
  },
  sceneCaption: 'Im kleinen Laden zeigst du kurz auf etwas und fragst, ob es gerade noch zu haben ist.',
  trophyWord: {
    word: 'disponibile',
    meaning: 'verfügbar / erhältlich',
    example: 'È ancora disponibile?',
    whyThisWord: 'Disponibile deckt auf A1 sowohl Ware ("ist erhältlich") als auch Personen ("hat Zeit") ab und ist im Dienstleistungs-Italienisch das natürlichere Wort als ein wörtliches "avete...?".',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Ladentheke, Gegenstand im Fokus, ruhige Verfügbarkeitsfrage.',
  },
  songSeed: {
    genre: 'sunny acoustic',
    mood: 'practical and asking',
  },
  visualNotes: 'Gegenstand im Fokus, warmer Tresen-Akzent, dezent fragender Blick.',
}

const brightItalianP2Lesson006: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: 'Posso pagare con la carta?',
    baseText: 'Kann ich mit Karte zahlen?',
  },
  meaning: 'Die höfliche Standard-Frage am Tresen, ob Kartenzahlung möglich ist.',
  chunks: [
    { id: 'posso-pagare', targetText: 'Posso pagare', baseText: 'Kann ich zahlen' },
    { id: 'con-la-carta', targetText: 'con la carta?', baseText: 'mit Karte?' },
  ],
  lessonItems: [
    { id: 'posso', targetText: 'posso', baseText: 'kann ich', acceptedAnswers: ['posso', 'Posso'] },
    { id: 'pagare', targetText: 'pagare', baseText: 'zahlen', acceptedAnswers: ['pagare', 'Pagare'] },
    { id: 'carta', targetText: 'carta', baseText: 'Karte / Papier', acceptedAnswers: ['carta', 'Carta'] },
    { id: 'contanti', targetText: 'contanti', baseText: 'Bargeld', acceptedAnswers: ['contanti', 'Contanti'] },
  ],
  build: {
    targetText: 'Posso pagare con la carta?',
    chips: ['Posso pagare', 'con la carta?', 'contanti', 'grazie'],
  },
  typeRecall: {
    before: 'Posso pagare con la ',
    answer: 'carta',
    after: '?',
    acceptedAnswers: ['carta', 'Carta'],
    fallbackChoices: ['carta', 'banca', 'mancia', 'fattura'],
  },
  speakTarget: {
    baseCue: 'Kann ich mit Karte zahlen?',
    targetPhrase: 'Posso pagare con la carta?',
    language: 'it-IT',
    passingThreshold: 0.8,
    requiredTokens: ['posso', 'pagare', 'carta'],
    optionalTokens: ['con', 'la', 'per', 'favore'],
  },
  sceneCaption: 'An der Kasse hältst du die Karte kurz hoch und stellst die Standard-Zahlungsfrage.',
  trophyWord: {
    word: 'carta',
    meaning: 'Karte (Plastik) / Papier',
    example: 'Pagare con la carta.',
    whyThisWord: 'Carta heißt im Italienischen sowohl die Bankkarte als auch Papier — der Kontext macht eindeutig, was gemeint ist. Achtung: die deutsche "Karte" (Speisekarte) heißt italienisch "menù", nicht "carta".',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Kartenterminal nah, Karte in der Hand, ruhige Zahlungsgeste.',
  },
  songSeed: {
    genre: 'upbeat acoustic',
    mood: 'practical checkout',
  },
  visualNotes: 'Terminal-Detail, warme Kassenlichter, kurzer Bestätigungs-Beat.',
}

const brightItalianP2Lesson007: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: 'Lo scontrino e una busta, per favore.',
    baseText: 'Den Beleg und eine Tüte, bitte.',
  },
  meaning: 'Zwei knappe Bitten am Kassenende: Kassenzettel mitnehmen und Tüte dazu.',
  chunks: [
    { id: 'lo-scontrino', targetText: 'Lo scontrino', baseText: 'Den Beleg' },
    { id: 'e-una-busta', targetText: 'e una busta,', baseText: 'und eine Tüte,' },
    { id: 'per-favore', targetText: 'per favore.', baseText: 'bitte.' },
  ],
  lessonItems: [
    { id: 'scontrino', targetText: 'scontrino', baseText: 'Kassenbon / Beleg', acceptedAnswers: ['scontrino', 'Scontrino'] },
    { id: 'busta', targetText: 'busta', baseText: 'Tüte / Beutel', acceptedAnswers: ['busta', 'Busta'] },
    { id: 'lo', targetText: 'lo', baseText: 'den (vor s+Konsonant)', acceptedAnswers: ['lo', 'Lo'] },
    { id: 'una', targetText: 'una', baseText: 'eine', acceptedAnswers: ['una', 'Una'] },
  ],
  build: {
    targetText: 'Lo scontrino e una busta, per favore.',
    chips: ['Lo scontrino', 'e una busta,', 'per favore.', 'grazie'],
  },
  typeRecall: {
    before: 'Lo ',
    answer: 'scontrino',
    after: ' e una busta, per favore.',
    acceptedAnswers: ['scontrino', 'Scontrino'],
    fallbackChoices: ['scontrino', 'biglietto', 'documento', 'foglio'],
  },
  speakTarget: {
    baseCue: 'Den Beleg und eine Tüte, bitte.',
    targetPhrase: 'Lo scontrino e una busta, per favore.',
    language: 'it-IT',
    passingThreshold: 0.8,
    requiredTokens: ['scontrino', 'busta', 'per', 'favore'],
    optionalTokens: ['lo', 'una', 'e', 'grazie'],
  },
  sceneCaption: 'An der Kasse nimmst du die Tüte entgegen und fragst gleichzeitig nach dem Kassenbon.',
  trophyWord: {
    word: 'scontrino',
    meaning: 'Kassenbon / Beleg',
    example: 'Vuole lo scontrino?',
    whyThisWord: 'Scontrino ist auf A1 das italienische Kassenwort schlechthin — kürzer und alltäglicher als "ricevuta", die eher die offizielle Quittung ist. Wegen s+Konsonant nimmt es den Artikel "lo": lo scontrino.',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Kassendetail, Beleg löst sich aus dem Drucker, Tüte am Tresen.',
  },
  songSeed: {
    genre: 'upbeat acoustic',
    mood: 'wrapping up the buy',
  },
  visualNotes: 'Belegdrucker-Detail, Tüten-Akzent, warme Schluss-Stimmung.',
}

const brightItalianP2Lesson008: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: 'Ho una prenotazione.',
    baseText: 'Ich habe eine Reservierung.',
  },
  meaning: 'Die kurze, klare Eröffnung an Restaurant-Empfang oder Service-Theke, wenn ein Platz reserviert ist.',
  chunks: [
    { id: 'ho', targetText: 'Ho', baseText: 'Ich habe' },
    { id: 'una-prenotazione', targetText: 'una prenotazione.', baseText: 'eine Reservierung.' },
  ],
  lessonItems: [
    { id: 'ho', targetText: 'ho', baseText: 'ich habe', acceptedAnswers: ['ho', 'Ho'] },
    { id: 'prenotazione', targetText: 'prenotazione', baseText: 'Reservierung', acceptedAnswers: ['prenotazione', 'Prenotazione'] },
    { id: 'una', targetText: 'una', baseText: 'eine', acceptedAnswers: ['una', 'Una'] },
    { id: 'a-nome', targetText: 'a nome', baseText: 'auf den Namen', acceptedAnswers: ['a nome', 'A nome'] },
  ],
  build: {
    targetText: 'Ho una prenotazione.',
    chips: ['Ho', 'una prenotazione.', 'a nome', 'grazie'],
  },
  typeRecall: {
    before: 'Ho una ',
    answer: 'prenotazione',
    after: '.',
    acceptedAnswers: ['prenotazione', 'Prenotazione'],
    fallbackChoices: ['prenotazione', 'domanda', 'richiesta', 'fattura'],
  },
  speakTarget: {
    baseCue: 'Ich habe eine Reservierung.',
    targetPhrase: 'Ho una prenotazione.',
    language: 'it-IT',
    passingThreshold: 0.8,
    requiredTokens: ['ho', 'prenotazione'],
    optionalTokens: ['una', 'a', 'nome', 'per', 'favore'],
  },
  sceneCaption: 'Am Restaurant-Empfang öffnest du die Szene knapp und sicher mit dem Reservierungs-Stichwort.',
  trophyWord: {
    word: 'prenotazione',
    meaning: 'Reservierung / Buchung',
    example: 'Ho una prenotazione a nome Rossi.',
    whyThisWord: 'Prenotazione deckt auf A1 jede Reservierung ab — Restaurant, Hotel, Friseur, Arzt. Das Verb dazu ist "prenotare". Wichtig: kein falscher Freund — passt eins zu eins.',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Empfangsstand, kleine Liste auf dem Tresen, ruhige Ankunft.',
  },
  songSeed: {
    genre: 'soft acoustic',
    mood: 'arriving with a name',
  },
  visualNotes: 'Empfangs-Pult mit Reservierungs-Liste, kurzer Blick auf die Uhr, warme Begrüßung.',
}

const brightItalianP2Lesson009: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: 'Questo è giusto?',
    baseText: 'Ist das richtig?',
  },
  meaning: 'Eine kurze, freundliche Vergewisserung, bevor du etwas annimmst oder dich festlegst.',
  chunks: [
    { id: 'questo', targetText: 'Questo', baseText: 'Dieses' },
    { id: 'e', targetText: 'è', baseText: 'ist' },
    { id: 'giusto', targetText: 'giusto?', baseText: 'richtig?' },
  ],
  lessonItems: [
    { id: 'giusto', targetText: 'giusto', baseText: 'richtig', acceptedAnswers: ['giusto', 'Giusto'] },
    { id: 'e', targetText: 'è', baseText: 'ist', acceptedAnswers: ['è', 'e', 'È', 'E'] },
    { id: 'sicuro', targetText: 'sicuro', baseText: 'sicher', acceptedAnswers: ['sicuro', 'Sicuro'] },
    { id: 'esatto', targetText: 'esatto', baseText: 'genau', acceptedAnswers: ['esatto', 'Esatto'] },
  ],
  build: {
    targetText: 'Questo è giusto?',
    chips: ['Questo', 'è', 'giusto?', 'sicuro', 'esatto'],
  },
  typeRecall: {
    before: 'Questo è ',
    answer: 'giusto',
    after: '?',
    acceptedAnswers: ['giusto', 'Giusto'],
    fallbackChoices: ['giusto', 'sicuro', 'esatto', 'corretto'],
  },
  speakTarget: {
    baseCue: 'Ist das richtig?',
    targetPhrase: 'Questo è giusto?',
    language: 'it-IT',
    passingThreshold: 0.8,
    requiredTokens: ['questo', 'giusto'],
    optionalTokens: ['è', 'sicuro', 'esatto', 'per', 'favore'],
  },
  sceneCaption: 'Bevor du einsteigst oder mitnimmst, hebst du das Objekt kurz und fragst freundlich nach.',
  trophyWord: {
    word: 'giusto',
    meaning: 'richtig / korrekt',
    example: 'Questo è giusto, grazie.',
    whyThisWord: 'Giusto ist auf A1 das warme Bestätigungs-Wort: "richtig", "stimmt", "passt". Als alleinstehende Antwort sagt der italienische Gesprächspartner oft nur "Giusto!" — kurz und entspannt.',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Objekt in der Hand, kurzer Blickkontakt, freundliche Vergewisserung.',
  },
  songSeed: {
    genre: 'sunny acoustic',
    mood: 'checking gently',
  },
  visualNotes: 'Hände im Vordergrund, weiches Licht, kurzes Bestätigungs-Nicken im Hintergrund.',
}

const brightItalianP2Lesson010: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: 'Un momento, per favore.',
    baseText: 'Einen Moment, bitte.',
  },
  meaning: 'Eine ruhige, höfliche Bitte um eine kurze Pause, während du etwas erledigst.',
  chunks: [
    { id: 'un-momento', targetText: 'Un momento,', baseText: 'Einen Moment,' },
    { id: 'per-favore', targetText: 'per favore.', baseText: 'bitte.' },
  ],
  lessonItems: [
    { id: 'momento', targetText: 'momento', baseText: 'Moment', acceptedAnswers: ['momento', 'Momento'] },
    { id: 'un', targetText: 'un', baseText: 'einen / ein', acceptedAnswers: ['un', 'Un'] },
    { id: 'attimo', targetText: 'attimo', baseText: 'Augenblick', acceptedAnswers: ['attimo', 'Attimo'] },
    { id: 'subito', targetText: 'subito', baseText: 'sofort', acceptedAnswers: ['subito', 'Subito'] },
  ],
  build: {
    targetText: 'Un momento, per favore.',
    chips: ['Un momento,', 'per favore.', 'attimo', 'subito'],
  },
  typeRecall: {
    before: 'Un ',
    answer: 'momento',
    after: ', per favore.',
    acceptedAnswers: ['momento', 'Momento'],
    fallbackChoices: ['momento', 'attimo', 'minuto', 'secondo'],
  },
  speakTarget: {
    baseCue: 'Einen Moment, bitte.',
    targetPhrase: 'Un momento, per favore.',
    language: 'it-IT',
    passingThreshold: 0.8,
    requiredTokens: ['momento', 'per', 'favore'],
    optionalTokens: ['un', 'attimo', 'subito', 'scusi'],
  },
  sceneCaption: 'Mitten im Bezahlen suchst du kurz die Karte oder das Wort und bittest höflich um einen Moment.',
  trophyWord: {
    word: 'momento',
    meaning: 'Moment / Augenblick',
    example: 'Un momento, per favore.',
    whyThisWord: 'Momento ist auf A1 die universelle Mini-Pause-Bitte im italienischen Service-Alltag. Synonym ist "un attimo" — ebenfalls A1, oft sogar kürzer.',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Geldbeutel halb offen, kurzer Blick nach unten, ruhige Mikropause.',
  },
  songSeed: {
    genre: 'soft acoustic',
    mood: 'gentle pause',
  },
  visualNotes: 'Ruhige Detailaufnahme, leichter Verschnauf-Beat, sanfter Übergang.',
}

const brightItalianP3Lesson001: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: 'Scusi, a destra o a sinistra?',
    baseText: 'Entschuldigung, nach rechts oder nach links?',
  },
  meaning: 'Eine kurze Richtungsfrage an einen Passanten beim Navigieren.',
  chunks: [
    { id: 'scusi', targetText: 'Scusi,', baseText: 'Entschuldigung,' },
    { id: 'a-destra', targetText: 'a destra', baseText: 'nach rechts' },
    { id: 'o-a-sinistra', targetText: 'o a sinistra?', baseText: 'oder nach links?' },
  ],
  lessonItems: [
    { id: 'destra', targetText: 'destra', baseText: 'rechts', acceptedAnswers: ['destra', 'Destra'] },
    { id: 'sinistra', targetText: 'sinistra', baseText: 'links', acceptedAnswers: ['sinistra', 'Sinistra'] },
    { id: 'a', targetText: 'a', baseText: 'nach (Richtung)', acceptedAnswers: ['a', 'A'] },
    { id: 'dritto', targetText: 'dritto', baseText: 'geradeaus', acceptedAnswers: ['dritto', 'Dritto'] },
  ],
  build: {
    targetText: 'Scusi, a destra o a sinistra?',
    chips: ['Scusi,', 'a destra', 'o a sinistra?', 'dritto', 'qui'],
  },
  typeRecall: {
    before: 'Scusi, a ',
    answer: 'destra',
    after: ' o a sinistra?',
    acceptedAnswers: ['destra', 'Destra'],
    fallbackChoices: ['destra', 'sinistra', 'dritto', 'indietro'],
  },
  speakTarget: {
    baseCue: 'Entschuldigung, nach rechts oder nach links?',
    targetPhrase: 'Scusi, a destra o a sinistra?',
    language: 'it-IT',
    passingThreshold: 0.8,
    requiredTokens: ['scusi', 'destra', 'sinistra'],
    optionalTokens: ['a', 'o', 'per', 'favore'],
  },
  sceneCaption: 'An einer Kreuzung sprichst du jemanden kurz an und prüfst, ob es rechts oder links weitergeht.',
  trophyWord: {
    word: 'destra',
    meaning: 'rechts',
    example: 'A destra al semaforo.',
    whyThisWord: 'Destra ist auf A1 das Richtungswort für "rechts" und tritt als Paar mit "sinistra" auf — die zwei Wörter prägen jede italienische Wegbeschreibung.',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Kreuzung am Vormittag, kurze Geste in beide Richtungen, ruhige Klärung.',
  },
  songSeed: {
    genre: 'sunny acoustic',
    mood: 'choosing the way',
  },
  visualNotes: 'Kreuzungs-Linien, Sonnenpfeil in Korallton, ruhiger Gehweg-Akzent.',
}

const brightItalianP3Lesson002: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: 'Scusi, è lontano?',
    baseText: 'Entschuldigung, ist es weit?',
  },
  meaning: 'Eine knappe Frage, wie weit das Ziel von hier entfernt ist.',
  chunks: [
    { id: 'scusi', targetText: 'Scusi,', baseText: 'Entschuldigung,' },
    { id: 'e', targetText: 'è', baseText: 'ist es' },
    { id: 'lontano', targetText: 'lontano?', baseText: 'weit?' },
  ],
  lessonItems: [
    { id: 'lontano', targetText: 'lontano', baseText: 'weit', acceptedAnswers: ['lontano', 'Lontano'] },
    { id: 'vicino', targetText: 'vicino', baseText: 'nah', acceptedAnswers: ['vicino', 'Vicino'] },
    { id: 'minuti', targetText: 'minuti', baseText: 'Minuten', acceptedAnswers: ['minuti', 'Minuti'] },
    { id: 'piedi-noun', targetText: 'piedi', baseText: 'Füße (in "a piedi")', acceptedAnswers: ['piedi', 'Piedi'] },
  ],
  build: {
    targetText: 'Scusi, è lontano?',
    chips: ['Scusi,', 'è', 'lontano?', 'vicino', 'minuti'],
  },
  typeRecall: {
    before: 'Scusi, è ',
    answer: 'lontano',
    after: '?',
    acceptedAnswers: ['lontano', 'Lontano'],
    fallbackChoices: ['lontano', 'vicino', 'aperto', 'pronto'],
  },
  speakTarget: {
    baseCue: 'Entschuldigung, ist es weit?',
    targetPhrase: 'Scusi, è lontano?',
    language: 'it-IT',
    passingThreshold: 0.8,
    requiredTokens: ['scusi', 'lontano'],
    optionalTokens: ['è', 'molto', 'da', 'qui'],
  },
  sceneCaption: 'Mitten auf dem Gehweg klärst du kurz, wie weit das Ziel noch entfernt ist.',
  trophyWord: {
    word: 'lontano',
    meaning: 'weit / weit entfernt',
    example: 'È lontano da qui?',
    whyThisWord: 'Lontano ist auf A1 das kurze Wort für jede Entfernungsfrage und steht im Paar mit "vicino" — die zwei Adjektive ordnen jede italienische Wegfrage.',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Gehweg am Vormittag, Blick in die Ferne, ruhige Verständigungsgeste.',
  },
  songSeed: {
    genre: 'sunny acoustic',
    mood: 'gauging the distance',
  },
  visualNotes: 'Horizontaler Tiefenblick, warme Pastell-Ferne, ruhiger Fragezeichen-Beat.',
}

const brightItalianP3Lesson003: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: 'È aperto?',
    baseText: 'Ist es geöffnet?',
  },
  meaning: 'Eine knappe Frage vor dem Hineingehen, ob das Lokal gerade offen ist.',
  chunks: [
    { id: 'e', targetText: 'È', baseText: 'Ist es' },
    { id: 'aperto', targetText: 'aperto?', baseText: 'geöffnet?' },
  ],
  lessonItems: [
    { id: 'aperto', targetText: 'aperto', baseText: 'geöffnet / offen', acceptedAnswers: ['aperto', 'Aperto'] },
    { id: 'chiuso', targetText: 'chiuso', baseText: 'geschlossen / zu', acceptedAnswers: ['chiuso', 'Chiuso'] },
    { id: 'oggi', targetText: 'oggi', baseText: 'heute', acceptedAnswers: ['oggi', 'Oggi'] },
    { id: 'ancora', targetText: 'ancora', baseText: 'noch', acceptedAnswers: ['ancora', 'Ancora'] },
  ],
  build: {
    targetText: 'È aperto?',
    chips: ['È', 'aperto?', 'oggi', 'ancora'],
  },
  typeRecall: {
    before: 'È ',
    answer: 'aperto',
    after: '?',
    acceptedAnswers: ['aperto', 'Aperto'],
    fallbackChoices: ['aperto', 'chiuso', 'pronto', 'libero'],
  },
  speakTarget: {
    baseCue: 'Ist es geöffnet?',
    targetPhrase: 'È aperto?',
    language: 'it-IT',
    passingThreshold: 0.8,
    requiredTokens: ['aperto'],
    optionalTokens: ['è', 'oggi', 'ancora', 'scusi'],
  },
  sceneCaption: 'Vor einem kleinen Laden hebst du kurz den Blick zur Tür und prüfst, ob jetzt geöffnet ist.',
  trophyWord: {
    word: 'aperto',
    meaning: 'geöffnet / offen',
    example: 'Il bar è aperto.',
    whyThisWord: 'Aperto ist auf A1 das Zustandswort vor jedem Ladenbesuch und steht im Paar mit "chiuso". Im Italienischen wird der Zustand mit "è aperto" beschrieben — kürzer als die deutsche Konstruktion mit "haben".',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Ladentür mit offenem Schild, sanftes Vormittagslicht, ruhiger Blick darauf.',
  },
  songSeed: {
    genre: 'sunny acoustic',
    mood: 'checking the door',
  },
  visualNotes: 'Tür-Detail mit Schildakzent, warmes Honiglicht, sanfte Klingel-Anmutung.',
}

const brightItalianP3Lesson004: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: 'Quale autobus va in centro?',
    baseText: 'Welcher Bus fährt ins Zentrum?',
  },
  meaning: 'Eine klare Routenfrage an der Haltestelle: welcher Bus passt zum Ziel?',
  chunks: [
    { id: 'quale-autobus', targetText: 'Quale autobus', baseText: 'Welcher Bus' },
    { id: 'va', targetText: 'va', baseText: 'fährt' },
    { id: 'in-centro', targetText: 'in centro?', baseText: 'ins Zentrum?' },
  ],
  lessonItems: [
    { id: 'autobus', targetText: 'autobus', baseText: 'Bus', acceptedAnswers: ['autobus', 'Autobus'] },
    { id: 'quale', targetText: 'quale', baseText: 'welcher / welche', acceptedAnswers: ['quale', 'Quale'] },
    { id: 'va', targetText: 'va', baseText: 'fährt / geht', acceptedAnswers: ['va', 'Va'] },
    { id: 'centro', targetText: 'centro', baseText: 'Zentrum', acceptedAnswers: ['centro', 'Centro'] },
  ],
  build: {
    targetText: 'Quale autobus va in centro?',
    chips: ['Quale autobus', 'va', 'in centro?', 'qui', 'grazie'],
  },
  typeRecall: {
    before: 'Quale ',
    answer: 'autobus',
    after: ' va in centro?',
    acceptedAnswers: ['autobus', 'Autobus'],
    fallbackChoices: ['autobus', 'treno', 'tram', 'taxi'],
  },
  speakTarget: {
    baseCue: 'Welcher Bus fährt ins Zentrum?',
    targetPhrase: 'Quale autobus va in centro?',
    language: 'it-IT',
    passingThreshold: 0.8,
    requiredTokens: ['quale', 'autobus', 'centro'],
    optionalTokens: ['va', 'in', 'per', 'favore'],
  },
  sceneCaption: 'An der Haltestelle fragst du jemanden ruhig nach dem richtigen Bus zur Stadtmitte.',
  trophyWord: {
    word: 'autobus',
    meaning: 'Bus (Stadtbus)',
    example: 'Quale autobus va al museo?',
    whyThisWord: 'Autobus ist im Italienischen das Standardwort für "Bus" und kongruiert im Plural nicht (gli autobus). Vorsicht: das deutsche "Autobus" ist im Italienischen wirklich "autobus", aber im Alltag oft kürzer "bus".',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Bushaltestelle mit Linien-Schild, kurze Frage Richtung wartender Passant.',
  },
  songSeed: {
    genre: 'upbeat acoustic',
    mood: 'choosing the line',
  },
  visualNotes: 'Haltestellen-Schild im Fokus, Linienzahl klar lesbar, warmes Pflasterlicht.',
}

const brightItalianP3Lesson005: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: 'Scusi, è la prossima fermata?',
    baseText: 'Entschuldigung, ist das die nächste Haltestelle?',
  },
  meaning: 'Eine kurze Vergewisserung im fahrenden Bus oder Tram vor dem Aussteigen.',
  chunks: [
    { id: 'scusi', targetText: 'Scusi,', baseText: 'Entschuldigung,' },
    { id: 'e-la-prossima', targetText: 'è la prossima', baseText: 'ist das die nächste' },
    { id: 'fermata', targetText: 'fermata?', baseText: 'Haltestelle?' },
  ],
  lessonItems: [
    { id: 'fermata', targetText: 'fermata', baseText: 'Haltestelle', acceptedAnswers: ['fermata', 'Fermata'] },
    { id: 'prossima', targetText: 'prossima', baseText: 'nächste', acceptedAnswers: ['prossima', 'Prossima'] },
    { id: 'qui', targetText: 'qui', baseText: 'hier', acceptedAnswers: ['qui', 'Qui'] },
    { id: 'scendo', targetText: 'scendo', baseText: 'ich steige aus', acceptedAnswers: ['scendo', 'Scendo'] },
  ],
  build: {
    targetText: 'Scusi, è la prossima fermata?',
    chips: ['Scusi,', 'è la prossima', 'fermata?', 'qui', 'scendo'],
  },
  typeRecall: {
    before: 'Scusi, è la prossima ',
    answer: 'fermata',
    after: '?',
    acceptedAnswers: ['fermata', 'Fermata'],
    fallbackChoices: ['fermata', 'stazione', 'uscita', 'strada'],
  },
  speakTarget: {
    baseCue: 'Entschuldigung, ist das die nächste Haltestelle?',
    targetPhrase: 'Scusi, è la prossima fermata?',
    language: 'it-IT',
    passingThreshold: 0.8,
    requiredTokens: ['scusi', 'prossima', 'fermata'],
    optionalTokens: ['è', 'la', 'per', 'favore'],
  },
  sceneCaption: 'Im fahrenden Bus drehst du dich kurz zum Nachbarn und vergewisserst dich, dass die nächste Haltestelle die richtige ist.',
  trophyWord: {
    word: 'fermata',
    meaning: 'Haltestelle',
    example: 'La prossima fermata è la mia.',
    whyThisWord: 'Fermata ist auf A1 das Wort für jede Bus- oder Tramhaltestelle. Plural ist regelmäßig "fermate". Verwandt mit "fermare" (anhalten) — leicht zu merken über die Bewegung.',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Fenster im fahrenden Bus, Haltestellen-Anzeige leuchtet auf, ruhige Vergewisserung.',
  },
  songSeed: {
    genre: 'soft acoustic',
    mood: 'arriving soon',
  },
  visualNotes: 'Bus-Innenraum-Detail, Haltestellen-Bildschirm im Fokus, sanfte Bremsbewegung.',
}

const brightItalianP3Lesson006: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: 'Un biglietto, per favore.',
    baseText: 'Eine Fahrkarte, bitte.',
  },
  meaning: 'Die knappe Standard-Bestellung am Fahrkartenschalter oder Automaten.',
  chunks: [
    { id: 'un-biglietto', targetText: 'Un biglietto,', baseText: 'Eine Fahrkarte,' },
    { id: 'per-favore', targetText: 'per favore.', baseText: 'bitte.' },
  ],
  lessonItems: [
    { id: 'biglietto', targetText: 'biglietto', baseText: 'Fahrkarte / Ticket', acceptedAnswers: ['biglietto', 'Biglietto'] },
    { id: 'un', targetText: 'un', baseText: 'eine / ein', acceptedAnswers: ['un', 'Un'] },
    { id: 'andata', targetText: 'andata', baseText: 'Hinfahrt', acceptedAnswers: ['andata', 'Andata'] },
    { id: 'ritorno', targetText: 'ritorno', baseText: 'Rückfahrt', acceptedAnswers: ['ritorno', 'Ritorno'] },
  ],
  build: {
    targetText: 'Un biglietto, per favore.',
    chips: ['Un biglietto,', 'per favore.', 'andata', 'ritorno'],
  },
  typeRecall: {
    before: 'Un ',
    answer: 'biglietto',
    after: ', per favore.',
    acceptedAnswers: ['biglietto', 'Biglietto'],
    fallbackChoices: ['biglietto', 'tessera', 'modulo', 'orario'],
  },
  speakTarget: {
    baseCue: 'Eine Fahrkarte, bitte.',
    targetPhrase: 'Un biglietto, per favore.',
    language: 'it-IT',
    passingThreshold: 0.8,
    requiredTokens: ['biglietto', 'per', 'favore'],
    optionalTokens: ['un', 'andata', 'ritorno', 'grazie'],
  },
  sceneCaption: 'Am Fahrkartenschalter klingt die Bestellung kurz, ruhig und klar.',
  trophyWord: {
    word: 'biglietto',
    meaning: 'Fahrkarte / Ticket',
    example: 'Un biglietto di andata e ritorno.',
    whyThisWord: 'Biglietto ist auf A1 das Wort für jede Fahrkarte — Zug, Bus, Tram, Museum. Plural "biglietti" am Automaten und Schalter sehr häufig.',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Schalter-Detail, Fahrkarte gleitet über den Tresen, ruhige Zahlung.',
  },
  songSeed: {
    genre: 'upbeat acoustic',
    mood: 'ready to travel',
  },
  visualNotes: 'Schalter-Tresen mit Ticket im Vordergrund, warmes Bahnhofs-Licht, klare Übergabe.',
}

const brightItalianP3Lesson007: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: 'A che ora chiude?',
    baseText: 'Um wie viel Uhr schließt es?',
  },
  meaning: 'Eine Frage nach der Schließzeit, um den Besuch noch zu schaffen.',
  chunks: [
    { id: 'a-che-ora', targetText: 'A che ora', baseText: 'Um wie viel Uhr' },
    { id: 'chiude', targetText: 'chiude?', baseText: 'schließt es?' },
  ],
  lessonItems: [
    { id: 'chiude', targetText: 'chiude', baseText: 'schließt (3. Pers. Sg.)', acceptedAnswers: ['chiude', 'Chiude'] },
    { id: 'oggi', targetText: 'oggi', baseText: 'heute', acceptedAnswers: ['oggi', 'Oggi'] },
    { id: 'stasera', targetText: 'stasera', baseText: 'heute Abend', acceptedAnswers: ['stasera', 'Stasera'] },
    { id: 'orario', targetText: 'orario', baseText: 'Öffnungszeit', acceptedAnswers: ['orario', 'Orario'] },
  ],
  build: {
    targetText: 'A che ora chiude?',
    chips: ['A che ora', 'chiude?', 'oggi', 'stasera'],
  },
  typeRecall: {
    before: 'A che ora ',
    answer: 'chiude',
    after: '?',
    acceptedAnswers: ['chiude', 'Chiude'],
    fallbackChoices: ['chiude', 'apre', 'parte', 'arriva'],
  },
  speakTarget: {
    baseCue: 'Um wie viel Uhr schließt es?',
    targetPhrase: 'A che ora chiude?',
    language: 'it-IT',
    passingThreshold: 0.8,
    requiredTokens: ['ora', 'chiude'],
    optionalTokens: ['a', 'che', 'oggi', 'stasera'],
  },
  sceneCaption: 'Vor dem Museum prüfst du kurz, wann zugemacht wird, bevor du eintrittst.',
  trophyWord: {
    word: 'chiude',
    meaning: 'schließt (3. Person Singular)',
    example: 'Il museo chiude alle sei.',
    whyThisWord: 'Chiude ist die 3.-Person-Form von "chiudere" (schließen) und steht im Paar mit "apre". Vor jedem späten Besuch das zentrale Wort.',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Museums-Tafel mit Öffnungszeiten, später Nachmittag, ruhiger Blick auf die Uhr.',
  },
  songSeed: {
    genre: 'sunny acoustic',
    mood: 'planning the visit',
  },
  visualNotes: 'Detail auf Öffnungszeiten-Schild, weiches Spätlicht, kurzer Uhrenakzent.',
}

const brightItalianP3Lesson008: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: "Devo girare all'angolo?",
    baseText: 'Muss ich an der Ecke abbiegen?',
  },
  meaning: 'Eine konkrete Frage am Gehweg, ob die Ecke der Abbiegepunkt ist.',
  chunks: [
    { id: 'devo-girare', targetText: 'Devo girare', baseText: 'Muss ich abbiegen' },
    { id: 'all-angolo', targetText: "all'angolo?", baseText: 'an der Ecke?' },
  ],
  lessonItems: [
    { id: 'angolo', targetText: 'angolo', baseText: 'Ecke', acceptedAnswers: ['angolo', 'Angolo'] },
    { id: 'devo', targetText: 'devo', baseText: 'ich muss', acceptedAnswers: ['devo', 'Devo'] },
    { id: 'girare', targetText: 'girare', baseText: 'abbiegen / drehen', acceptedAnswers: ['girare', 'Girare'] },
    { id: 'dopo', targetText: 'dopo', baseText: 'nach', acceptedAnswers: ['dopo', 'Dopo'] },
  ],
  build: {
    targetText: "Devo girare all'angolo?",
    chips: ['Devo girare', "all'angolo?", 'dopo', 'qui'],
  },
  typeRecall: {
    before: "Devo girare all'",
    answer: 'angolo',
    after: '?',
    acceptedAnswers: ['angolo', 'Angolo'],
    fallbackChoices: ['angolo', 'incrocio', 'semaforo', 'ponte'],
  },
  speakTarget: {
    baseCue: 'Muss ich an der Ecke abbiegen?',
    targetPhrase: "Devo girare all'angolo?",
    language: 'it-IT',
    passingThreshold: 0.8,
    requiredTokens: ['devo', 'girare', 'angolo'],
    optionalTokens: ['qui', 'dopo', 'scusi'],
  },
  sceneCaption: 'Am Gehweg-Eck zeigst du kurz und fragst, ob hier der Abbiegepunkt ist.',
  trophyWord: {
    word: 'angolo',
    meaning: 'Ecke',
    example: "Subito dopo l'angolo, a destra.",
    whyThisWord: 'Angolo ist auf A1 das geometrische und straßenmäßige Wort für jede Ecke. Vor Vokalen verschmilzt der Artikel: "all\'angolo" (an der Ecke), "l\'angolo" (die Ecke).',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Häuser-Ecke mit Pflastersteinen, sanftes Vormittagslicht, Fingerzeig zur Biegung.',
  },
  songSeed: {
    genre: 'sunny acoustic',
    mood: 'one corner away',
  },
  visualNotes: 'Eckiges Gebäudedetail, warmer Diagonalakzent, ruhiger Schritt-Beat.',
}

const brightItalianP3Lesson009: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: 'A piedi o in taxi?',
    baseText: 'Zu Fuß oder mit dem Taxi?',
  },
  meaning: 'Eine lockere Wahlfrage am Gehweg-Ende oder vor langem Weg.',
  chunks: [
    { id: 'a-piedi', targetText: 'A piedi', baseText: 'Zu Fuß' },
    { id: 'o-in-taxi', targetText: 'o in taxi?', baseText: 'oder mit dem Taxi?' },
  ],
  lessonItems: [
    { id: 'piedi', targetText: 'piedi', baseText: 'Füße (in "a piedi")', acceptedAnswers: ['piedi', 'Piedi'] },
    { id: 'taxi', targetText: 'taxi', baseText: 'Taxi', acceptedAnswers: ['taxi', 'Taxi'] },
    { id: 'a', targetText: 'a', baseText: 'zu (in "a piedi")', acceptedAnswers: ['a', 'A'] },
    { id: 'in', targetText: 'in', baseText: 'mit (in "in taxi")', acceptedAnswers: ['in', 'In'] },
  ],
  build: {
    targetText: 'A piedi o in taxi?',
    chips: ['A piedi', 'o in taxi?', 'a', 'in'],
  },
  typeRecall: {
    before: 'A ',
    answer: 'piedi',
    after: ' o in taxi?',
    acceptedAnswers: ['piedi', 'Piedi'],
    fallbackChoices: ['piedi', 'casa', 'mano', 'volo'],
  },
  speakTarget: {
    baseCue: 'Zu Fuß oder mit dem Taxi?',
    targetPhrase: 'A piedi o in taxi?',
    language: 'it-IT',
    passingThreshold: 0.8,
    requiredTokens: ['piedi', 'taxi'],
    optionalTokens: ['a', 'o', 'in', 'allora'],
  },
  sceneCaption: 'Am Gehsteig-Ende drehst du dich kurz zur Begleitung und entscheidet, wie es weitergeht.',
  trophyWord: {
    word: 'piedi',
    meaning: 'Füße (in der Wendung "a piedi" = zu Fuß)',
    example: 'Vado a piedi.',
    whyThisWord: 'Piedi ist der Plural von "piede" (Fuß) und bildet die feste Wendung "a piedi" (zu Fuß) — eine der häufigsten italienischen Präpositionalphrasen für Fortbewegung. "In taxi" als Gegenstück ist ebenfalls A1.',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Gehsteig-Ende am Abend, Taxi am Bordstein bereit, ruhige Entscheidungsgeste.',
  },
  songSeed: {
    genre: 'upbeat acoustic',
    mood: 'casual choice',
  },
  visualNotes: 'Zwei Vektoren — Gehweg-Linie und Taxi-Linie — warmer Abendakzent, ruhiger Schritt.',
}

const brightItalianP3Lesson010: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: 'Ho perso la fermata. Mi può aiutare?',
    baseText: 'Ich habe die Haltestelle verpasst. Können Sie mir helfen?',
  },
  meaning: 'Eine ruhige Bitte um Hilfe, nachdem die Haltestelle vorbei ist.',
  chunks: [
    { id: 'ho-perso', targetText: 'Ho perso', baseText: 'Ich habe verpasst' },
    { id: 'la-fermata', targetText: 'la fermata.', baseText: 'die Haltestelle.' },
    { id: 'mi-puo-aiutare', targetText: 'Mi può aiutare?', baseText: 'Können Sie mir helfen?' },
  ],
  lessonItems: [
    { id: 'perso', targetText: 'perso', baseText: 'verpasst / verloren (Partizip)', acceptedAnswers: ['perso', 'Perso'] },
    { id: 'ho', targetText: 'ho', baseText: 'ich habe', acceptedAnswers: ['ho', 'Ho'] },
    { id: 'mi-puo', targetText: 'mi può', baseText: 'können Sie mir', acceptedAnswers: ['mi può', 'mi puo', 'Mi può', 'Mi puo'] },
    { id: 'fermata-noun', targetText: 'la fermata', baseText: 'die Haltestelle', acceptedAnswers: ['la fermata', 'La fermata'] },
  ],
  build: {
    targetText: 'Ho perso la fermata. Mi può aiutare?',
    chips: ['Ho perso', 'la fermata.', 'Mi può aiutare?', 'scusi', 'grazie'],
  },
  typeRecall: {
    before: 'Ho ',
    answer: 'perso',
    after: ' la fermata. Mi può aiutare?',
    acceptedAnswers: ['perso', 'Perso'],
    fallbackChoices: ['perso', 'persa', 'preso', 'visto'],
  },
  speakTarget: {
    baseCue: 'Ich habe die Haltestelle verpasst. Können Sie mir helfen?',
    targetPhrase: 'Ho perso la fermata. Mi può aiutare?',
    language: 'it-IT',
    passingThreshold: 0.8,
    requiredTokens: ['ho', 'perso', 'fermata', 'aiutare'],
    optionalTokens: ['mi', 'può', 'la', 'scusi'],
  },
  sceneCaption: 'Du steigst zu spät aus, drehst dich ruhig um und bittest jemanden auf dem Bürgersteig um Hilfe.',
  trophyWord: {
    word: 'perso',
    meaning: 'verpasst / verloren (Partizip von "perdere")',
    example: 'Ho perso la fermata, scusi.',
    whyThisWord: 'Perso ist das unregelmäßige Partizip von "perdere" und bildet mit "ho perso" das Standard-Perfekt für "ich habe verloren / verpasst". Achtung: bei weiblichen Subjekten als Adjektiv-Partizip in "Mi sono persa" — geschlechtskongruent.',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Bürgersteig nach einer Haltestelle, Bus fährt im Hintergrund weiter, ruhige Hilfegeste.',
  },
  songSeed: {
    genre: 'soft acoustic',
    mood: 'recovering gently',
  },
  visualNotes: 'Bus von hinten im Hintergrund, ruhiger Vordergrund-Blick, sanfte Hilfegeste.',
}

const brightFrenchLesson001: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: 'Bonjour, vous parlez français ?',
    baseText: 'Guten Tag, sprechen Sie Französisch?',
  },
  meaning: 'Eine höfliche Eröffnungsfrage am Tresen, bevor das Gespräch auf Französisch weiterläuft.',
  chunks: [
    { id: 'bonjour', targetText: 'Bonjour,', baseText: 'Guten Tag,' },
    { id: 'vous-parlez', targetText: 'vous parlez', baseText: 'sprechen Sie' },
    { id: 'francais', targetText: 'français ?', baseText: 'Französisch?' },
  ],
  lessonItems: [
    { id: 'bonjour', targetText: 'bonjour', baseText: 'Guten Tag / Hallo', acceptedAnswers: ['bonjour', 'Bonjour'] },
    { id: 'vous', targetText: 'vous', baseText: 'Sie (höflich)', acceptedAnswers: ['vous', 'Vous'] },
    { id: 'parlez', targetText: 'parlez', baseText: 'sprechen Sie', acceptedAnswers: ['parlez', 'Parlez'] },
    { id: 'francais', targetText: 'français', baseText: 'Französisch', acceptedAnswers: ['français', 'francais', 'Français', 'Francais'] },
  ],
  build: {
    targetText: 'Bonjour, vous parlez français ?',
    chips: ['Bonjour,', 'vous parlez', 'français ?', 'merci', 'pardon'],
  },
  typeRecall: {
    before: 'Bonjour, vous ',
    answer: 'parlez',
    after: ' français ?',
    acceptedAnswers: ['parlez', 'Parlez'],
    fallbackChoices: ['parlez', 'parle', 'français', 'vous'],
  },
  speakTarget: {
    baseCue: 'Guten Tag, sprechen Sie Französisch?',
    targetPhrase: 'Bonjour, vous parlez français ?',
    language: 'fr-FR',
    passingThreshold: 0.8,
    requiredTokens: ['bonjour', 'vous', 'parlez'],
    optionalTokens: ['français', 'francais', 'merci', 'pardon'],
  },
  sceneCaption: 'Vor der Theke im Café fragst du höflich, ob die andere Person Französisch spricht.',
  trophyWord: {
    word: 'bonjour',
    meaning: 'Guten Tag / Hallo',
    example: 'Bonjour, vous parlez français ?',
    whyThisWord: 'Bonjour ist die sichere A1-Eröffnung in Frankreich: im Servicekontext neutral, höflich und tageszeitlich breiter als ein lockeres "salut". Hier steht "vous" als höfliche Singularform für eine fremde Person.',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Morgenlicht im Café, offene Theke, ruhiger erster Gruß auf Französisch.',
  },
  songSeed: {
    genre: 'sunny acoustic chanson-light',
    mood: 'warm first contact',
  },
  visualNotes: 'Warmes Honig-Licht, Café-Theke, sanfter Korall-Akzent auf Bonjour.',
}

const brightFrenchLesson002: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: "Pardon, vous pouvez répéter, s'il vous plaît ?",
    baseText: 'Entschuldigung, können Sie das bitte wiederholen?',
  },
  meaning: 'Eine höfliche Bitte, das eben Gesagte noch einmal zu hören.',
  chunks: [
    { id: 'pardon', targetText: 'Pardon,', baseText: 'Entschuldigung,' },
    { id: 'vous-pouvez-repeter', targetText: 'vous pouvez répéter,', baseText: 'können Sie wiederholen,' },
    { id: 'sil-vous-plait', targetText: "s'il vous plaît ?", baseText: 'bitte?' },
  ],
  lessonItems: [
    { id: 'pardon', targetText: 'pardon', baseText: 'Entschuldigung', acceptedAnswers: ['pardon', 'Pardon'] },
    { id: 'pouvez', targetText: 'pouvez', baseText: 'können Sie', acceptedAnswers: ['pouvez', 'Pouvez'] },
    { id: 'repeter', targetText: 'répéter', baseText: 'wiederholen', acceptedAnswers: ['répéter', 'repeter', 'Répéter', 'Repeter'] },
    { id: 'sil-vous-plait', targetText: "s'il vous plaît", baseText: 'bitte (höflich)', acceptedAnswers: ["s'il vous plaît", "s'il vous plait", 'sil vous plaît', 'sil vous plait'] },
  ],
  build: {
    targetText: "Pardon, vous pouvez répéter, s'il vous plaît ?",
    chips: ['Pardon,', 'vous pouvez', 'répéter,', "s'il vous plaît ?", 'lentement'],
  },
  typeRecall: {
    before: 'Pardon, vous pouvez ',
    answer: 'répéter',
    after: ", s'il vous plaît ?",
    acceptedAnswers: ['répéter', 'repeter', 'Répéter', 'Repeter'],
    fallbackChoices: ['répéter', 'parler', 'dire', 'écouter'],
  },
  speakTarget: {
    baseCue: 'Entschuldigung, können Sie das bitte wiederholen?',
    targetPhrase: "Pardon, vous pouvez répéter, s'il vous plaît ?",
    language: 'fr-FR',
    passingThreshold: 0.8,
    requiredTokens: ['pardon', 'vous', 'pouvez'],
    optionalTokens: ['répéter', 'repeter', 'sil', 'plait', 'lentement'],
  },
  sceneCaption: 'Mitten im Gespräch bittest du ruhig und höflich um eine Wiederholung.',
  trophyWord: {
    word: 'pardon',
    meaning: 'Entschuldigung',
    example: 'Pardon, vous pouvez répéter ?',
    whyThisWord: 'Pardon ist auf A1 die kurze, natürliche Reparatur-Eröffnung, wenn du etwas nicht verstanden hast. In dieser Service-Szene bleibt "vous" konsequent höflich.',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Sanftes Café-Licht, kurze Pause am Tresen, ruhige Rückfrage.',
  },
  songSeed: {
    genre: 'soft acoustic',
    mood: 'gentle pause',
  },
  visualNotes: 'Pausen-Beat, sanfter Glow um Pardon, ruhiger Atemmoment.',
}

const brightFrenchLesson003: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: 'Excusez-moi, où est la gare ?',
    baseText: 'Entschuldigung, wo ist der Bahnhof?',
  },
  meaning: 'Eine kurze, höfliche Frage nach einem klaren Ziel in der Stadt.',
  chunks: [
    { id: 'excusez-moi', targetText: 'Excusez-moi,', baseText: 'Entschuldigung,' },
    { id: 'ou-est', targetText: 'où est', baseText: 'wo ist' },
    { id: 'la-gare', targetText: 'la gare ?', baseText: 'der Bahnhof?' },
  ],
  lessonItems: [
    { id: 'excusez-moi', targetText: 'excusez-moi', baseText: 'entschuldigen Sie', acceptedAnswers: ['excusez-moi', 'Excusez-moi', 'excusez moi'] },
    { id: 'ou', targetText: 'où', baseText: 'wo', acceptedAnswers: ['où', 'ou', 'Où', 'Ou'] },
    { id: 'est', targetText: 'est', baseText: 'ist', acceptedAnswers: ['est', 'Est'] },
    { id: 'gare', targetText: 'gare', baseText: 'Bahnhof', acceptedAnswers: ['gare', 'Gare'] },
  ],
  build: {
    targetText: 'Excusez-moi, où est la gare ?',
    chips: ['Excusez-moi,', 'où est', 'la gare ?', 'ici', 'merci'],
  },
  typeRecall: {
    before: 'Excusez-moi, ',
    answer: 'où',
    after: ' est la gare ?',
    acceptedAnswers: ['où', 'ou', 'Où', 'Ou'],
    fallbackChoices: ['où', 'quand', 'comment', 'qui'],
  },
  speakTarget: {
    baseCue: 'Entschuldigung, wo ist der Bahnhof?',
    targetPhrase: 'Excusez-moi, où est la gare ?',
    language: 'fr-FR',
    passingThreshold: 0.8,
    requiredTokens: ['excusez', 'moi', 'est', 'gare'],
    optionalTokens: ['où', 'ou', 'la', 'ici', 'merci'],
  },
  sceneCaption: 'Auf dem Gehweg sprichst du jemanden höflich an und fragst nach dem Bahnhof.',
  trophyWord: {
    word: 'où',
    meaning: 'wo',
    example: 'Où est la gare ?',
    whyThisWord: 'Où ist das A1-Schlüsselwort für Ortsfragen. Der Akzent unterscheidet es von "ou" ohne Akzent, das "oder" bedeutet; in Tippantworten tolerieren wir die fehlende Akzenttaste.',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Helle Straße am Vormittag, ein Bahnhofsschild in der Ferne, offene Geste.',
  },
  songSeed: {
    genre: 'sunny acoustic',
    mood: 'open and asking',
  },
  visualNotes: 'Goldene Richtungsachse, Bahnhofssymbol am Horizont, warme Hinweisspur.',
}

const brightFrenchLesson004: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: "Je voudrais un café, s'il vous plaît.",
    baseText: 'Ich hätte gerne einen Kaffee, bitte.',
  },
  meaning: 'Eine höfliche Bestellung am Tresen mit dem französischen Wunsch-Konditional.',
  chunks: [
    { id: 'je-voudrais', targetText: 'Je voudrais', baseText: 'Ich hätte gerne' },
    { id: 'un-cafe', targetText: 'un café,', baseText: 'einen Kaffee,' },
    { id: 'sil-vous-plait', targetText: "s'il vous plaît.", baseText: 'bitte.' },
  ],
  lessonItems: [
    { id: 'je-voudrais', targetText: 'je voudrais', baseText: 'ich hätte gerne', acceptedAnswers: ['je voudrais', 'Je voudrais'] },
    { id: 'un', targetText: 'un', baseText: 'einen / ein', acceptedAnswers: ['un', 'Un'] },
    { id: 'cafe', targetText: 'café', baseText: 'Kaffee', acceptedAnswers: ['café', 'cafe', 'Café', 'Cafe'] },
    { id: 'sil-vous-plait', targetText: "s'il vous plaît", baseText: 'bitte (höflich)', acceptedAnswers: ["s'il vous plaît", "s'il vous plait", 'sil vous plaît', 'sil vous plait'] },
  ],
  build: {
    targetText: "Je voudrais un café, s'il vous plaît.",
    chips: ['Je voudrais', 'un café,', "s'il vous plaît.", 'merci', 'avec du lait'],
  },
  typeRecall: {
    before: 'Je voudrais un ',
    answer: 'café',
    after: ", s'il vous plaît.",
    acceptedAnswers: ['café', 'cafe', 'Café', 'Cafe'],
    fallbackChoices: ['café', 'thé', 'eau', 'vin'],
  },
  speakTarget: {
    baseCue: 'Ich hätte gerne einen Kaffee, bitte.',
    targetPhrase: "Je voudrais un café, s'il vous plaît.",
    language: 'fr-FR',
    passingThreshold: 0.8,
    requiredTokens: ['je', 'voudrais', 'un'],
    optionalTokens: ['café', 'cafe', 'sil', 'vous', 'plait', 'merci'],
  },
  sceneCaption: 'Am Tresen klingt die Bestellung kurz, ruhig und freundlich mit "je voudrais".',
  trophyWord: {
    word: 'café',
    meaning: 'Kaffee / Café',
    example: "Je voudrais un café, s'il vous plaît.",
    whyThisWord: 'Café ist A1-Alltag: Getränk und Ort teilen im Französischen dieselbe Form. Im Servicekontext ist "je voudrais" höflicher und natürlicher als das direkte "je veux".',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Kaffeetasse auf der Theke, warmes Morgenlicht, ruhige Bestellung.',
  },
  songSeed: {
    genre: 'upbeat acoustic chanson-light',
    mood: 'fresh and easy',
  },
  visualNotes: 'Tassen-Detail in goldenem Licht, kurzer Tresenmoment, sanfte Wärme.',
}

const brightFrenchLesson005: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: "Combien ça coûte, s'il vous plaît ?",
    baseText: 'Wie viel kostet das bitte?',
  },
  meaning: 'Eine direkte, höfliche Preisfrage zu einem Gegenstand vor dir.',
  chunks: [
    { id: 'combien', targetText: 'Combien', baseText: 'Wie viel' },
    { id: 'ca-coute', targetText: 'ça coûte,', baseText: 'kostet das,' },
    { id: 'sil-vous-plait', targetText: "s'il vous plaît ?", baseText: 'bitte?' },
  ],
  lessonItems: [
    { id: 'combien', targetText: 'combien', baseText: 'wie viel', acceptedAnswers: ['combien', 'Combien'] },
    { id: 'ca', targetText: 'ça', baseText: 'das', acceptedAnswers: ['ça', 'ca', 'Ça', 'Ca'] },
    { id: 'coute', targetText: 'coûte', baseText: 'kostet', acceptedAnswers: ['coûte', 'coute', 'Coûte', 'Coute'] },
    { id: 'cher', targetText: 'cher', baseText: 'teuer', acceptedAnswers: ['cher', 'Cher'] },
  ],
  build: {
    targetText: "Combien ça coûte, s'il vous plaît ?",
    chips: ['Combien', 'ça coûte,', "s'il vous plaît ?", 'cher', 'merci'],
  },
  typeRecall: {
    before: '',
    answer: 'Combien',
    after: " ça coûte, s'il vous plaît ?",
    acceptedAnswers: ['combien', 'Combien'],
    fallbackChoices: ['Combien', 'Comment', 'Quand', 'Où'],
  },
  speakTarget: {
    baseCue: 'Wie viel kostet das bitte?',
    targetPhrase: "Combien ça coûte, s'il vous plaît ?",
    language: 'fr-FR',
    passingThreshold: 0.8,
    requiredTokens: ['combien', 'ça', 'coûte'],
    optionalTokens: ['ca', 'coute', 'sil', 'vous', 'plait', 'cher'],
  },
  sceneCaption: 'Im kleinen Laden hältst du den Gegenstand in der Hand und fragst nach dem Preis.',
  trophyWord: {
    word: 'combien',
    meaning: 'wie viel',
    example: 'Combien ça coûte ?',
    whyThisWord: 'Combien deckt auf A1 Preis- und Mengenfragen ab. In der Preisfrage ist "ça coûte" die natürliche kurze Form; kein spanisches oder italienisches Fragezeichen davor.',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Kleines Ladenlokal, Gegenstand auf dem Tresen, klare Preisfrage.',
  },
  songSeed: {
    genre: 'sunny indie pop',
    mood: 'curious and direct',
  },
  visualNotes: 'Preisschild im Fokus, warme Pastellfarben, ruhige Beleuchtung.',
}

const brightFrenchLesson006: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: 'À quelle heure part le train ?',
    baseText: 'Um wie viel Uhr fährt der Zug?',
  },
  meaning: 'Eine klare Frage nach der Abfahrtszeit am Bahnhof.',
  chunks: [
    { id: 'a-quelle-heure', targetText: 'À quelle heure', baseText: 'Um wie viel Uhr' },
    { id: 'part', targetText: 'part', baseText: 'fährt ab' },
    { id: 'le-train', targetText: 'le train ?', baseText: 'der Zug?' },
  ],
  lessonItems: [
    { id: 'a-quelle-heure', targetText: 'à quelle heure', baseText: 'um wie viel Uhr', acceptedAnswers: ['à quelle heure', 'a quelle heure', 'À quelle heure', 'A quelle heure'] },
    { id: 'part', targetText: 'part', baseText: 'fährt ab', acceptedAnswers: ['part', 'Part'] },
    { id: 'train', targetText: 'train', baseText: 'Zug', acceptedAnswers: ['train', 'Train'] },
    { id: 'heure', targetText: 'heure', baseText: 'Uhrzeit / Stunde', acceptedAnswers: ['heure', 'Heure'] },
  ],
  build: {
    targetText: 'À quelle heure part le train ?',
    chips: ['À quelle heure', 'part', 'le train ?', 'gare', 'maintenant'],
  },
  typeRecall: {
    before: 'À quelle heure part le ',
    answer: 'train',
    after: ' ?',
    acceptedAnswers: ['train', 'Train'],
    fallbackChoices: ['train', 'bus', 'métro', 'taxi'],
  },
  speakTarget: {
    baseCue: 'Um wie viel Uhr fährt der Zug?',
    targetPhrase: 'À quelle heure part le train ?',
    language: 'fr-FR',
    passingThreshold: 0.8,
    requiredTokens: ['quelle', 'heure', 'part', 'train'],
    optionalTokens: ['à', 'a', 'le', 'gare', 'maintenant'],
  },
  sceneCaption: 'Am Informationsschalter im Bahnhof fragst du nach der Abfahrtszeit.',
  trophyWord: {
    word: 'train',
    meaning: 'Zug',
    example: 'Le train part à huit heures.',
    whyThisWord: 'Train ist ein A1-Kernwort für Reisen in Frankreich. Die Frage bleibt einfach im Präsens; "part" ist hier "fährt ab".',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Helle Bahnhofshalle, Anzeigetafel im Hintergrund, ruhige Frage am Schalter.',
  },
  songSeed: {
    genre: 'upbeat acoustic',
    mood: 'ready and moving',
  },
  visualNotes: 'Uhr- und Tafel-Detail, warme Halle, klare Linienführung Richtung Bahnsteig.',
}

const brightFrenchLesson007: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: "J'ai besoin d'aide, s'il vous plaît.",
    baseText: 'Ich brauche Hilfe, bitte.',
  },
  meaning: 'Eine knappe, höfliche Bitte um Hilfe, ohne das Problem schon zu benennen.',
  chunks: [
    { id: 'jai-besoin', targetText: "J'ai besoin", baseText: 'Ich brauche' },
    { id: 'daide', targetText: "d'aide,", baseText: 'Hilfe,' },
    { id: 'sil-vous-plait', targetText: "s'il vous plaît.", baseText: 'bitte.' },
  ],
  lessonItems: [
    { id: 'jai-besoin', targetText: "j'ai besoin", baseText: 'ich brauche', acceptedAnswers: ["j'ai besoin", 'j ai besoin', "J'ai besoin"] },
    { id: 'aide', targetText: 'aide', baseText: 'Hilfe', acceptedAnswers: ['aide', 'Aide'] },
    { id: 'daide', targetText: "d'aide", baseText: 'von Hilfe / Hilfe', acceptedAnswers: ["d'aide", 'd aide', "D'aide"] },
    { id: 'ici', targetText: 'ici', baseText: 'hier', acceptedAnswers: ['ici', 'Ici'] },
  ],
  build: {
    targetText: "J'ai besoin d'aide, s'il vous plaît.",
    chips: ["J'ai besoin", "d'aide,", "s'il vous plaît.", 'ici', 'merci'],
  },
  typeRecall: {
    before: "J'ai besoin d'",
    answer: 'aide',
    after: ", s'il vous plaît.",
    acceptedAnswers: ['aide', 'Aide'],
    fallbackChoices: ['aide', 'eau', 'heure', 'adresse'],
  },
  speakTarget: {
    baseCue: 'Ich brauche Hilfe, bitte.',
    targetPhrase: "J'ai besoin d'aide, s'il vous plaît.",
    language: 'fr-FR',
    passingThreshold: 0.8,
    requiredTokens: ['jai', 'besoin', 'aide'],
    optionalTokens: ['sil', 'vous', 'plait', 'ici', 'merci'],
  },
  sceneCaption: 'In der Apotheke gehst du ruhig zur Theke und sagst, dass du Hilfe brauchst.',
  trophyWord: {
    word: 'aide',
    meaning: 'Hilfe',
    example: "J'ai besoin d'aide.",
    whyThisWord: "Aide ist das A1-Hilfe-Wort für Apotheke, Bahnhof und Empfang. Die Form \"d'aide\" zeigt die nötige Elision nach \"de\": nicht \"de aide\".",
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Ruhige Apothekentheke, klares Licht, kurze Bitte um Hilfe ohne Drama.',
  },
  songSeed: {
    genre: 'soft acoustic',
    mood: 'calm and asking',
  },
  visualNotes: 'Ruhiger Innenraum, sanftes Pastellgrün, klare Geste am Tresen.',
}

const brightFrenchLesson008: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: "C'est très joli ici.",
    baseText: 'Es ist hier sehr schön.',
  },
  meaning: 'Ein kurzer, positiver Small-Talk-Satz über das Lokal oder den Ort.',
  chunks: [
    { id: 'cest', targetText: "C'est", baseText: 'Es ist' },
    { id: 'tres-joli', targetText: 'très joli', baseText: 'sehr schön' },
    { id: 'ici', targetText: 'ici.', baseText: 'hier.' },
  ],
  lessonItems: [
    { id: 'cest', targetText: "c'est", baseText: 'es ist / das ist', acceptedAnswers: ["c'est", 'c est', "C'est"] },
    { id: 'tres', targetText: 'très', baseText: 'sehr', acceptedAnswers: ['très', 'tres', 'Très', 'Tres'] },
    { id: 'joli', targetText: 'joli', baseText: 'schön / hübsch', acceptedAnswers: ['joli', 'Joli'] },
    { id: 'ici', targetText: 'ici', baseText: 'hier', acceptedAnswers: ['ici', 'Ici'] },
  ],
  build: {
    targetText: "C'est très joli ici.",
    chips: ["C'est", 'très joli', 'ici.', 'calme', 'merci'],
  },
  typeRecall: {
    before: "C'est très joli ",
    answer: 'ici',
    after: '.',
    acceptedAnswers: ['ici', 'Ici'],
    fallbackChoices: ['ici', 'là', 'où', 'gare'],
  },
  speakTarget: {
    baseCue: 'Es ist hier sehr schön.',
    targetPhrase: "C'est très joli ici.",
    language: 'fr-FR',
    passingThreshold: 0.8,
    requiredTokens: ['cest', 'joli', 'ici'],
    optionalTokens: ['très', 'tres', 'calme'],
  },
  sceneCaption: 'Im Café drehst du dich kurz zum Gegenüber und sagst etwas Nettes über den Ort.',
  trophyWord: {
    word: 'ici',
    meaning: 'hier',
    example: "C'est très joli ici.",
    whyThisWord: "Ici ist ein A1-Ortsanker und macht den Satz sofort auf den aktuellen Raum bezogen. \"C'est\" zeigt die Pflicht-Elision: nicht \"ce est\".",
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Café von innen, warmes Licht, ein kurzer zufriedener Blick.',
  },
  songSeed: {
    genre: 'sunny indie pop',
    mood: 'happy and present',
  },
  visualNotes: 'Innenraum mit weichen Schatten, Korall-Akzent, sanftes Lächeln im Hintergrund.',
}

const brightFrenchLesson009: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: "Demain à sept heures. D'accord !",
    baseText: 'Morgen um sieben Uhr. Einverstanden!',
  },
  meaning: 'Eine kurze Bestätigung eines Plans mit Tag, Uhrzeit und Zustimmung.',
  chunks: [
    { id: 'demain', targetText: 'Demain', baseText: 'Morgen' },
    { id: 'a-sept-heures', targetText: 'à sept heures.', baseText: 'um sieben Uhr.' },
    { id: 'daccord', targetText: "D'accord !", baseText: 'Einverstanden!' },
  ],
  lessonItems: [
    { id: 'demain', targetText: 'demain', baseText: 'morgen', acceptedAnswers: ['demain', 'Demain'] },
    { id: 'a-sept-heures', targetText: 'à sept heures', baseText: 'um sieben Uhr', acceptedAnswers: ['à sept heures', 'a sept heures', 'À sept heures', 'A sept heures'] },
    { id: 'sept', targetText: 'sept', baseText: 'sieben', acceptedAnswers: ['sept', 'Sept'] },
    { id: 'daccord', targetText: "d'accord", baseText: 'einverstanden / okay', acceptedAnswers: ["d'accord", 'd accord', "D'accord"] },
  ],
  build: {
    targetText: "Demain à sept heures. D'accord !",
    chips: ['Demain', 'à sept heures.', "D'accord !", 'merci', 'ici'],
  },
  typeRecall: {
    before: '',
    answer: 'Demain',
    after: " à sept heures. D'accord !",
    acceptedAnswers: ['demain', 'Demain'],
    fallbackChoices: ['Demain', "Aujourd'hui", 'Maintenant', 'Hier'],
  },
  speakTarget: {
    baseCue: 'Morgen um sieben Uhr. Einverstanden!',
    targetPhrase: "Demain à sept heures. D'accord !",
    language: 'fr-FR',
    passingThreshold: 0.8,
    requiredTokens: ['demain', 'sept', 'heures'],
    optionalTokens: ['à', 'a', 'daccord', 'accord', 'merci'],
  },
  sceneCaption: 'Am Ende der Begegnung bestätigst du locker den Termin für morgen.',
  trophyWord: {
    word: 'demain',
    meaning: 'morgen',
    example: "Demain à sept heures, d'accord.",
    whyThisWord: 'Demain ist ein A1-Zeitanker für kurzfristige Planung. Die Zahl sieben bleibt A1-sicher; wir vermeiden die schwierigen französischen 70/80/90-Zahlen.',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Spätnachmittag, kurzer Handschlag oder Nicken, ruhige Bestätigung.',
  },
  songSeed: {
    genre: 'sunny acoustic',
    mood: 'easy plan confirmation',
  },
  visualNotes: 'Warmes Abendlicht, Uhr-Akzent, ruhiges Nicken vor dem nächsten Tag.',
}

const brightFrenchLesson010: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: 'Merci beaucoup. Au revoir.',
    baseText: 'Vielen Dank. Auf Wiedersehen.',
  },
  meaning: 'Ein warmer Abschluss mit deutlichem Dank und höflichem Abschied.',
  chunks: [
    { id: 'merci-beaucoup', targetText: 'Merci beaucoup.', baseText: 'Vielen Dank.' },
    { id: 'au-revoir', targetText: 'Au revoir.', baseText: 'Auf Wiedersehen.' },
  ],
  lessonItems: [
    { id: 'merci', targetText: 'merci', baseText: 'danke', acceptedAnswers: ['merci', 'Merci'] },
    { id: 'beaucoup', targetText: 'beaucoup', baseText: 'viel / sehr', acceptedAnswers: ['beaucoup', 'Beaucoup'] },
    { id: 'au-revoir', targetText: 'au revoir', baseText: 'auf Wiedersehen', acceptedAnswers: ['au revoir', 'Au revoir'] },
    { id: 'a-bientot', targetText: 'à bientôt', baseText: 'bis bald', acceptedAnswers: ['à bientôt', 'a bientot', 'À bientôt', 'A bientot'] },
  ],
  build: {
    targetText: 'Merci beaucoup. Au revoir.',
    chips: ['Merci beaucoup.', 'Au revoir.', 'à bientôt', "d'accord"],
  },
  typeRecall: {
    before: '',
    answer: 'Merci',
    after: ' beaucoup. Au revoir.',
    acceptedAnswers: ['merci', 'Merci'],
    fallbackChoices: ['Merci', 'Bonjour', 'Pardon', 'Demain'],
  },
  speakTarget: {
    baseCue: 'Vielen Dank. Auf Wiedersehen.',
    targetPhrase: 'Merci beaucoup. Au revoir.',
    language: 'fr-FR',
    passingThreshold: 0.8,
    requiredTokens: ['merci', 'beaucoup', 'revoir'],
    optionalTokens: ['au', 'bientôt', 'bientot'],
  },
  sceneCaption: 'Im Gehen drehst du dich noch einmal kurz um und schließt die Szene höflich ab.',
  trophyWord: {
    word: 'merci',
    meaning: 'danke',
    example: 'Merci beaucoup. Au revoir.',
    whyThisWord: 'Merci schließt auf A1 jede Service-Szene sicher ab und ist allein schon vollständig. Mit "beaucoup" wird daraus ein klares "vielen Dank".',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Tür im Hintergrund, warmes Licht, kurzer Dank im Gehen.',
  },
  songSeed: {
    genre: 'sunny acoustic chanson-light',
    mood: 'warm goodbye',
  },
  visualNotes: 'Sanftes Honig-Licht beim Ausgang, kurzer Nachklang, ruhige letzte Geste.',
}

const brightFrenchP2Lesson001: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: "Excusez-moi, je ne comprends pas. Vous pouvez m'aider ?",
    baseText: 'Entschuldigen Sie, ich verstehe nicht. Können Sie mir helfen?',
  },
  meaning: 'Eine höfliche Service-Pause: du sagst klar, dass du nicht verstehst, und bittest mit vous um Hilfe.',
  chunks: [
    { id: 'excusez-moi', targetText: 'Excusez-moi,', baseText: 'Entschuldigen Sie,' },
    { id: 'je-ne-comprends-pas', targetText: 'je ne comprends pas.', baseText: 'ich verstehe nicht.' },
    { id: 'vous-pouvez-maider', targetText: "Vous pouvez m'aider ?", baseText: 'Können Sie mir helfen?' },
  ],
  lessonItems: [
    { id: 'excusez-moi', targetText: 'excusez-moi', baseText: 'entschuldigen Sie', acceptedAnswers: ['excusez-moi', 'Excusez-moi', 'excusez moi', 'Excusez moi'] },
    { id: 'ne-comprends-pas', targetText: 'je ne comprends pas', baseText: 'ich verstehe nicht', acceptedAnswers: ['je ne comprends pas', 'Je ne comprends pas'] },
    { id: 'pouvez', targetText: 'vous pouvez', baseText: 'Sie können', acceptedAnswers: ['vous pouvez', 'Vous pouvez'] },
    { id: 'aider', targetText: "m'aider", baseText: 'mir helfen', acceptedAnswers: ["m'aider", "M'aider", 'm aider', 'M aider'] },
    { id: 'comprendre', targetText: 'comprendre', baseText: 'verstehen', acceptedAnswers: ['comprendre', 'Comprendre'] },
  ],
  build: {
    targetText: "Excusez-moi, je ne comprends pas. Vous pouvez m'aider ?",
    chips: ['Excusez-moi,', 'je ne comprends pas.', "Vous pouvez m'aider ?", 'répéter', 'merci'],
  },
  typeRecall: {
    before: 'Excusez-moi, je ne ',
    answer: 'comprends',
    after: " pas. Vous pouvez m'aider ?",
    acceptedAnswers: ['comprends', 'Comprends'],
    fallbackChoices: ['comprends', 'comprenez', 'parle', 'écoute'],
  },
  speakTarget: {
    baseCue: 'Entschuldigen Sie, ich verstehe nicht. Können Sie mir helfen?',
    targetPhrase: "Excusez-moi, je ne comprends pas. Vous pouvez m'aider ?",
    language: 'fr-FR',
    passingThreshold: 0.8,
    requiredTokens: ['excusez', 'comprends', 'pas', 'aider'],
    optionalTokens: ['moi', 'je', 'ne', 'vous', 'pouvez'],
  },
  sceneCaption: 'Am Schalter stoppst du freundlich den Ablauf und machst die Bitte um Hilfe klar.',
  trophyWord: {
    word: 'comprendre',
    meaning: 'verstehen',
    example: 'Je ne comprends pas.',
    whyThisWord: 'Comprendre ist das A1-Verb für Verstehen. In der Service-Szene bleibt die vollständige Negation "je ne comprends pas" die saubere Lernform; "vous" ist hier die höfliche Form für eine fremde Person.',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Heller Schalter, kurze ruhige Unterbrechung, offene Hilfe-Geste.',
  },
  songSeed: {
    genre: 'sunny acoustic chanson-light',
    mood: 'clear and asking',
  },
  visualNotes: 'Warmer Tresen, kleiner Pausenmoment, Fokus auf freundlicher Klarheit.',
}

const brightFrenchP2Lesson002: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: "Vous pouvez l'écrire, s'il vous plaît ?",
    baseText: 'Können Sie es bitte aufschreiben?',
  },
  meaning: 'Eine präzise Bitte am Schalter, damit Name, Adresse oder Nummer schriftlich sicher werden.',
  chunks: [
    { id: 'vous-pouvez', targetText: 'Vous pouvez', baseText: 'Können Sie' },
    { id: 'lecrire', targetText: "l'écrire,", baseText: 'es aufschreiben,' },
    { id: 'sil-vous-plait', targetText: "s'il vous plaît ?", baseText: 'bitte?' },
  ],
  lessonItems: [
    { id: 'vous-pouvez', targetText: 'vous pouvez', baseText: 'Sie können', acceptedAnswers: ['vous pouvez', 'Vous pouvez'] },
    { id: 'lecrire', targetText: "l'écrire", baseText: 'es schreiben / aufschreiben', acceptedAnswers: ["l'écrire", "L'écrire", 'l ecrire', 'L ecrire', 'lecrire'] },
    { id: 'sil-vous-plait', targetText: "s'il vous plaît", baseText: 'bitte', acceptedAnswers: ["s'il vous plaît", "S'il vous plaît", "s'il vous plait", "S'il vous plait", 'sil vous plait'] },
    { id: 'ici', targetText: 'ici', baseText: 'hier', acceptedAnswers: ['ici', 'Ici'] },
    { id: 'ecrire', targetText: 'écrire', baseText: 'schreiben', acceptedAnswers: ['écrire', 'ecrire', 'Écrire', 'Ecrire'] },
  ],
  build: {
    targetText: "Vous pouvez l'écrire, s'il vous plaît ?",
    chips: ['Vous pouvez', "l'écrire,", "s'il vous plaît ?", 'ici', 'merci'],
  },
  typeRecall: {
    before: 'Vous pouvez ',
    answer: "l'écrire",
    after: ", s'il vous plaît ?",
    acceptedAnswers: ["l'écrire", "L'écrire", 'l ecrire', 'L ecrire', 'lecrire'],
    fallbackChoices: ["l'écrire", 'le dire', 'répéter', 'montrer'],
  },
  speakTarget: {
    baseCue: 'Können Sie es bitte aufschreiben?',
    targetPhrase: "Vous pouvez l'écrire, s'il vous plaît ?",
    language: 'fr-FR',
    passingThreshold: 0.8,
    requiredTokens: ['pouvez', 'écrire', 'plaît'],
    optionalTokens: ['vous', 'sil', 's', 'il', 'plait'],
  },
  sceneCaption: 'Du hältst Notiz oder Telefon hin und bittest freundlich um die schriftliche Form.',
  trophyWord: {
    word: 'écrire',
    meaning: 'schreiben',
    example: "Vous pouvez l'écrire ?",
    whyThisWord: "Écrire ist der A1-Anker für Schriftlichkeit. In \"l'écrire\" zeigt die Form die verpflichtende Elision vor Vokal; \"le écrire\" wäre falsch.",
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Notizfeld auf dem Tresen, Stift daneben, ruhige Bitte um Schrift.',
  },
  songSeed: {
    genre: 'soft acoustic chanson-light',
    mood: 'precise and helpful',
  },
  visualNotes: 'Klares Papier, heller Rand, Akzent auf dem geschriebenen Detail.',
}

const brightFrenchP2Lesson003: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: "Vous pouvez me montrer où c'est sur le plan ?",
    baseText: 'Können Sie mir auf dem Stadtplan zeigen, wo das ist?',
  },
  meaning: 'Eine konkrete Bitte, einen Ort mit einer Geste auf Plan, Karte oder Handy zu zeigen.',
  chunks: [
    { id: 'vous-pouvez-me-montrer', targetText: 'Vous pouvez me montrer', baseText: 'Können Sie mir zeigen' },
    { id: 'ou-cest', targetText: "où c'est", baseText: 'wo das ist' },
    { id: 'sur-le-plan', targetText: 'sur le plan ?', baseText: 'auf dem Stadtplan?' },
  ],
  lessonItems: [
    { id: 'montrer', targetText: 'montrer', baseText: 'zeigen', acceptedAnswers: ['montrer', 'Montrer'] },
    { id: 'me-montrer', targetText: 'me montrer', baseText: 'mir zeigen', acceptedAnswers: ['me montrer', 'Me montrer'] },
    { id: 'plan', targetText: 'plan', baseText: 'Plan / Stadtplan', acceptedAnswers: ['plan', 'Plan'] },
    { id: 'sur-le-plan', targetText: 'sur le plan', baseText: 'auf dem Stadtplan', acceptedAnswers: ['sur le plan', 'Sur le plan'] },
  ],
  build: {
    targetText: "Vous pouvez me montrer où c'est sur le plan ?",
    chips: ['Vous pouvez me montrer', "où c'est", 'sur le plan ?', 'ici', 'là'],
  },
  typeRecall: {
    before: "Vous pouvez me montrer où c'est sur le ",
    answer: 'plan',
    after: ' ?',
    acceptedAnswers: ['plan', 'Plan'],
    fallbackChoices: ['plan', 'nom', 'ticket', 'sac'],
  },
  speakTarget: {
    baseCue: 'Können Sie mir auf dem Stadtplan zeigen, wo das ist?',
    targetPhrase: "Vous pouvez me montrer où c'est sur le plan ?",
    language: 'fr-FR',
    passingThreshold: 0.8,
    requiredTokens: ['pouvez', 'montrer', 'où', 'plan'],
    optionalTokens: ['vous', 'me', 'cest', 'sur', 'le'],
  },
  sceneCaption: 'Du hältst den Stadtplan offen und bittest die Person, den Ort sichtbar zu markieren.',
  trophyWord: {
    word: 'plan',
    meaning: 'Plan / Stadtplan',
    example: 'Le plan est ici.',
    whyThisWord: 'Plan ist im Französischen der praktische Stadtplan oder Lageplan. Nicht mit einem abstrakten deutschen "Plan" verwechseln: hier geht es um die sichtbare Karte vor dir.',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Stadtplan auf dem Tisch, Finger zeigt auf eine Ecke, helle Orientierungsszene.',
  },
  songSeed: {
    genre: 'sunny acoustic',
    mood: 'navigating together',
  },
  visualNotes: 'Planlinien im Fokus, warmer Fingerzeig, klare Ortsmarkierung.',
}

const brightFrenchP2Lesson004: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: "Ça ou ça, s'il vous plaît ?",
    baseText: 'Das hier oder das da, bitte?',
  },
  meaning: 'Eine sehr kurze Wahlfrage zwischen zwei sichtbaren Optionen; die Zeigegeste trägt den Unterschied.',
  chunks: [
    { id: 'ca', targetText: 'Ça', baseText: 'das hier' },
    { id: 'ou-ca', targetText: 'ou ça,', baseText: 'oder das da,' },
    { id: 'sil-vous-plait', targetText: "s'il vous plaît ?", baseText: 'bitte?' },
  ],
  lessonItems: [
    { id: 'ca', targetText: 'ça', baseText: 'das / das hier', acceptedAnswers: ['ça', 'ca', 'Ça', 'Ca'] },
    { id: 'ou', targetText: 'ou', baseText: 'oder', acceptedAnswers: ['ou', 'Ou'] },
    { id: 'sil-vous-plait', targetText: "s'il vous plaît", baseText: 'bitte', acceptedAnswers: ["s'il vous plaît", "S'il vous plaît", "s'il vous plait", "S'il vous plait", 'sil vous plait'] },
    { id: 'celui-la', targetText: 'celui-là', baseText: 'der da', acceptedAnswers: ['celui-là', 'celui-la', 'Celui-là', 'Celui-la'] },
  ],
  build: {
    targetText: "Ça ou ça, s'il vous plaît ?",
    chips: ['Ça', 'ou ça,', "s'il vous plaît ?", 'celui-là', 'merci'],
  },
  typeRecall: {
    before: '',
    answer: 'Ça',
    after: " ou ça, s'il vous plaît ?",
    acceptedAnswers: ['ça', 'ca', 'Ça', 'Ca'],
    fallbackChoices: ['Ça', 'Où', 'Quand', 'Qui'],
  },
  speakTarget: {
    baseCue: 'Das hier oder das da, bitte?',
    targetPhrase: "Ça ou ça, s'il vous plaît ?",
    language: 'fr-FR',
    passingThreshold: 0.8,
    requiredTokens: ['ça'],
    optionalTokens: ['ou', 'sil', 'vous', 'plaît', 'plait'],
  },
  sceneCaption: 'Vor zwei Stücken oder zwei Varianten zeigst du nacheinander und stellst die knappe Wahlfrage.',
  trophyWord: {
    word: 'ça',
    meaning: 'das',
    example: 'Je voudrais ça, s’il vous plaît.',
    whyThisWord: 'Ça ist das A1-Zeigewort für etwas Sichtbares. Es bleibt im Servicekontext natürlich, wenn die Geste klar ist; "s’il vous plaît" hält die Bitte höflich.',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Zwei sichtbare Optionen auf der Theke, kurze Zeigegeste links und rechts.',
  },
  songSeed: {
    genre: 'upbeat acoustic chanson-light',
    mood: 'light choice',
  },
  visualNotes: 'Zwei helle Auswahlpunkte, kurze Bewegung, klarer Fokus auf ça.',
}

const brightFrenchP2Lesson005: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: 'Vous avez ça ?',
    baseText: 'Haben Sie das?',
  },
  meaning: 'Eine knappe, höfliche Verfügbarkeitsfrage im Laden, wenn du auf etwas Sichtbares zeigst.',
  chunks: [
    { id: 'vous-avez', targetText: 'Vous avez', baseText: 'Haben Sie' },
    { id: 'ca', targetText: 'ça ?', baseText: 'das?' },
  ],
  lessonItems: [
    { id: 'vous-avez', targetText: 'vous avez', baseText: 'Sie haben / haben Sie', acceptedAnswers: ['vous avez', 'Vous avez'] },
    { id: 'avez', targetText: 'avez', baseText: 'haben (Sie)', acceptedAnswers: ['avez', 'Avez'] },
    { id: 'ca', targetText: 'ça', baseText: 'das', acceptedAnswers: ['ça', 'ca', 'Ça', 'Ca'] },
    { id: 'en-bleu', targetText: 'en bleu', baseText: 'in Blau', acceptedAnswers: ['en bleu', 'En bleu'] },
  ],
  build: {
    targetText: 'Vous avez ça ?',
    chips: ['Vous avez', 'ça ?', 'en bleu', 'ici'],
  },
  typeRecall: {
    before: 'Vous ',
    answer: 'avez',
    after: ' ça ?',
    acceptedAnswers: ['avez', 'Avez'],
    fallbackChoices: ['avez', 'êtes', 'allez', 'faites'],
  },
  speakTarget: {
    baseCue: 'Haben Sie das?',
    targetPhrase: 'Vous avez ça ?',
    language: 'fr-FR',
    passingThreshold: 0.8,
    requiredTokens: ['vous', 'avez', 'ça'],
    optionalTokens: ['ca', 'ici', 'bleu'],
  },
  sceneCaption: 'Im Laden zeigst du auf ein Modell oder Foto und fragst schlicht nach der Verfügbarkeit.',
  trophyWord: {
    word: 'avez',
    meaning: 'haben Sie',
    example: 'Vous avez ça ?',
    whyThisWord: 'Avez ist die vous-Form von avoir. In Läden ist "vous avez... ?" eine natürliche A1-Frage an Personal; "vous" ist hier höfliches Singular gegenüber einer fremden Person.',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Kleines Geschäft, Hand zeigt auf ein Bild oder Modell, ruhige Nachfrage.',
  },
  songSeed: {
    genre: 'sunny acoustic',
    mood: 'practical shop check',
  },
  visualNotes: 'Schaufensterlicht, Objekt im Fokus, kurze klare Frage.',
}

const brightFrenchP2Lesson006: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: 'Je peux payer par carte ?',
    baseText: 'Kann ich mit Karte zahlen?',
  },
  meaning: 'Die Standardfrage an der Kasse, ob Kartenzahlung möglich ist.',
  chunks: [
    { id: 'je-peux-payer', targetText: 'Je peux payer', baseText: 'Kann ich zahlen' },
    { id: 'par-carte', targetText: 'par carte ?', baseText: 'mit Karte?' },
  ],
  lessonItems: [
    { id: 'je-peux', targetText: 'je peux', baseText: 'ich kann', acceptedAnswers: ['je peux', 'Je peux'] },
    { id: 'payer', targetText: 'payer', baseText: 'zahlen', acceptedAnswers: ['payer', 'Payer'] },
    { id: 'carte', targetText: 'carte', baseText: 'Karte', acceptedAnswers: ['carte', 'Carte'] },
    { id: 'par-carte', targetText: 'par carte', baseText: 'mit Karte', acceptedAnswers: ['par carte', 'Par carte'] },
  ],
  build: {
    targetText: 'Je peux payer par carte ?',
    chips: ['Je peux payer', 'par carte ?', 'en espèces', 'merci'],
  },
  typeRecall: {
    before: 'Je peux payer par ',
    answer: 'carte',
    after: ' ?',
    acceptedAnswers: ['carte', 'Carte'],
    fallbackChoices: ['carte', 'ticket', 'sac', 'plan'],
  },
  speakTarget: {
    baseCue: 'Kann ich mit Karte zahlen?',
    targetPhrase: 'Je peux payer par carte ?',
    language: 'fr-FR',
    passingThreshold: 0.8,
    requiredTokens: ['peux', 'payer', 'carte'],
    optionalTokens: ['je', 'par', 'espèces', 'especes'],
  },
  sceneCaption: 'An der Kasse hältst du die Karte bereit und fragst kurz nach der Zahlungsart.',
  trophyWord: {
    word: 'peux',
    meaning: 'ich kann',
    example: 'Je peux payer par carte ?',
    whyThisWord: 'Peux ist die je-Form von pouvoir und auf A1 der einfache Modal-Anker für "Kann ich...?". Die Karte bleibt im Satz, aber der Lernanker ist das robuste Verb.',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Kartenterminal an der Kasse, Karte in der Hand, freundliche Bezahlfrage.',
  },
  songSeed: {
    genre: 'upbeat acoustic',
    mood: 'easy checkout',
  },
  visualNotes: 'Terminal-Detail, heller Kassenrand, kurzer Bestätigungsbeat.',
}

const brightFrenchP2Lesson007: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: "Un ticket et un sac, s'il vous plaît.",
    baseText: 'Einen Beleg und eine Tüte, bitte.',
  },
  meaning: 'Zwei kleine Kassenbitten in einer höflichen Zeile: Beleg mitnehmen und eine Tüte dazu.',
  chunks: [
    { id: 'un-ticket', targetText: 'Un ticket', baseText: 'Einen Beleg' },
    { id: 'et-un-sac', targetText: 'et un sac,', baseText: 'und eine Tüte,' },
    { id: 'sil-vous-plait', targetText: "s'il vous plaît.", baseText: 'bitte.' },
  ],
  lessonItems: [
    { id: 'ticket', targetText: 'ticket', baseText: 'Kassenbon / Beleg', acceptedAnswers: ['ticket', 'Ticket'] },
    { id: 'sac', targetText: 'sac', baseText: 'Tüte / Tasche', acceptedAnswers: ['sac', 'Sac'] },
    { id: 'un-sac', targetText: 'un sac', baseText: 'eine Tüte', acceptedAnswers: ['un sac', 'Un sac'] },
    { id: 'sil-vous-plait', targetText: "s'il vous plaît", baseText: 'bitte', acceptedAnswers: ["s'il vous plaît", "S'il vous plaît", "s'il vous plait", "S'il vous plait", 'sil vous plait'] },
  ],
  build: {
    targetText: "Un ticket et un sac, s'il vous plaît.",
    chips: ['Un ticket', 'et un sac,', "s'il vous plaît.", 'merci', 'la carte'],
  },
  typeRecall: {
    before: 'Un ',
    answer: 'ticket',
    after: " et un sac, s'il vous plaît.",
    acceptedAnswers: ['ticket', 'Ticket'],
    fallbackChoices: ['ticket', 'plan', 'bus', 'nom'],
  },
  speakTarget: {
    baseCue: 'Einen Beleg und eine Tüte, bitte.',
    targetPhrase: "Un ticket et un sac, s'il vous plaît.",
    language: 'fr-FR',
    passingThreshold: 0.8,
    requiredTokens: ['ticket', 'sac', 'plaît'],
    optionalTokens: ['un', 'et', 'sil', 'vous', 'plait'],
  },
  sceneCaption: 'Am Ende des Kaufs fragst du freundlich nach Bon und Tüte, ohne den Ablauf aufzuhalten.',
  trophyWord: {
    word: 'sac',
    meaning: 'Tüte / Tasche',
    example: "Un sac, s'il vous plaît.",
    whyThisWord: 'Sac ist ein einfacher A1-Gegenstand im Ladenkontext. In der Kassenphrase bleibt "ticket" als Servicewort stehen, aber der sichere produktive Anker ist die Tüte.',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Kassentresen mit kleinem Bon und gefaltetem Papierbeutel.',
  },
  songSeed: {
    genre: 'soft acoustic',
    mood: 'neat checkout',
  },
  visualNotes: 'Bonpapier, kleine Tüte, warmer Abschluss an der Kasse.',
}

const brightFrenchP2Lesson008: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: "J'ai une réservation au nom de Martin.",
    baseText: 'Ich habe eine Reservierung auf den Namen Martin.',
  },
  meaning: 'Eine höfliche Ankunftszeile am Restaurantempfang: Reservierung und Name sofort klar nennen.',
  chunks: [
    { id: 'jai-une-reservation', targetText: "J'ai une réservation", baseText: 'Ich habe eine Reservierung' },
    { id: 'au-nom-de-martin', targetText: 'au nom de Martin.', baseText: 'auf den Namen Martin.' },
  ],
  lessonItems: [
    { id: 'jai', targetText: "j'ai", baseText: 'ich habe', acceptedAnswers: ["j'ai", "J'ai", 'jai', 'Jai'] },
    { id: 'reservation', targetText: 'réservation', baseText: 'Reservierung', acceptedAnswers: ['réservation', 'reservation', 'Réservation', 'Reservation'] },
    { id: 'nom', targetText: 'nom', baseText: 'Name', acceptedAnswers: ['nom', 'Nom'] },
    { id: 'au-nom-de', targetText: 'au nom de', baseText: 'auf den Namen von', acceptedAnswers: ['au nom de', 'Au nom de'] },
  ],
  build: {
    targetText: "J'ai une réservation au nom de Martin.",
    chips: ["J'ai une réservation", 'au nom de Martin.', 'pour deux', 'bonsoir'],
  },
  typeRecall: {
    before: "J'ai une ",
    answer: 'réservation',
    after: ' au nom de Martin.',
    acceptedAnswers: ['réservation', 'reservation', 'Réservation', 'Reservation'],
    fallbackChoices: ['réservation', 'addition', 'carte', 'gare'],
  },
  speakTarget: {
    baseCue: 'Ich habe eine Reservierung auf den Namen Martin.',
    targetPhrase: "J'ai une réservation au nom de Martin.",
    language: 'fr-FR',
    passingThreshold: 0.8,
    requiredTokens: ['réservation', 'nom', 'martin'],
    optionalTokens: ['jai', 'j', 'ai', 'une', 'au', 'de'],
  },
  sceneCaption: 'Am Empfang nennst du ruhig die Reservierung und den Namen, damit der Eintrag schnell gefunden wird.',
  trophyWord: {
    word: 'réservation',
    meaning: 'Reservierung',
    example: "J'ai une réservation.",
    whyThisWord: 'Réservation ist der A1-Serviceanker für Restaurant und Hotel. Die Elision in "j’ai" ist verpflichtend; "je ai" wäre keine korrekte französische Form.',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Restaurantpult, Reservierungsbuch offen, freundlicher Empfang.',
  },
  songSeed: {
    genre: 'warm acoustic chanson-light',
    mood: 'arriving clearly',
  },
  visualNotes: 'Reservierungsbuch im Licht, ruhiger Blick zur Gastgeberin, klarer Name.',
}

const brightFrenchP2Lesson009: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: "Excusez-moi, c'est le bon bus ?",
    baseText: 'Entschuldigen Sie, ist das der richtige Bus?',
  },
  meaning: 'Eine kurze Kontrollfrage an Haltestelle oder Fahrer, bevor du einsteigst.',
  chunks: [
    { id: 'excusez-moi', targetText: 'Excusez-moi,', baseText: 'Entschuldigen Sie,' },
    { id: 'cest-le-bon', targetText: "c'est le bon", baseText: 'ist das der richtige' },
    { id: 'bus', targetText: 'bus ?', baseText: 'Bus?' },
  ],
  lessonItems: [
    { id: 'excusez-moi', targetText: 'excusez-moi', baseText: 'entschuldigen Sie', acceptedAnswers: ['excusez-moi', 'Excusez-moi', 'excusez moi', 'Excusez moi'] },
    { id: 'cest', targetText: "c'est", baseText: 'das ist / ist das', acceptedAnswers: ["c'est", "C'est", 'c est', 'C est'] },
    { id: 'bon', targetText: 'bon', baseText: 'richtig / gut', acceptedAnswers: ['bon', 'Bon'] },
    { id: 'bus', targetText: 'bus', baseText: 'Bus', acceptedAnswers: ['bus', 'Bus'] },
  ],
  build: {
    targetText: "Excusez-moi, c'est le bon bus ?",
    chips: ['Excusez-moi,', "c'est le bon", 'bus ?', 'train', 'merci'],
  },
  typeRecall: {
    before: "Excusez-moi, c'est le bon ",
    answer: 'bus',
    after: ' ?',
    acceptedAnswers: ['bus', 'Bus'],
    fallbackChoices: ['bus', 'sac', 'ticket', 'plan'],
  },
  speakTarget: {
    baseCue: 'Entschuldigen Sie, ist das der richtige Bus?',
    targetPhrase: "Excusez-moi, c'est le bon bus ?",
    language: 'fr-FR',
    passingThreshold: 0.8,
    requiredTokens: ['excusez', 'bon', 'bus'],
    optionalTokens: ['moi', 'cest', 'c', 'est', 'le'],
  },
  sceneCaption: 'Vor dem Einsteigen prüfst du kurz beim Fahrer oder an der Haltestelle, ob es der richtige Bus ist.',
  trophyWord: {
    word: 'bus',
    meaning: 'Bus',
    example: "C'est le bon bus ?",
    whyThisWord: 'Bus ist im Französischen wie im Deutschen kurz und alltagstauglich. Die Kontrollfrage nutzt "c’est"; die Elision ist Pflicht, "ce est" wäre falsch.',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Haltestelle, Busfront im Licht, kurze Frage vor dem Einstieg.',
  },
  songSeed: {
    genre: 'sunny acoustic',
    mood: 'checking the route',
  },
  visualNotes: 'Busnummer im Fokus, heller Straßenrand, kurzer Entscheidungsbeat.',
}

const brightFrenchP2Lesson010: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: "Un instant, s'il vous plaît.",
    baseText: 'Einen Augenblick, bitte.',
  },
  meaning: 'Eine höfliche kurze Pause, wenn du am Schalter etwas suchst, zahlst oder prüfst.',
  chunks: [
    { id: 'un-instant', targetText: 'Un instant,', baseText: 'Einen Augenblick,' },
    { id: 'sil-vous-plait', targetText: "s'il vous plaît.", baseText: 'bitte.' },
  ],
  lessonItems: [
    { id: 'instant', targetText: 'instant', baseText: 'Augenblick', acceptedAnswers: ['instant', 'Instant'] },
    { id: 'un-instant', targetText: 'un instant', baseText: 'einen Augenblick', acceptedAnswers: ['un instant', 'Un instant'] },
    { id: 'sil-vous-plait', targetText: "s'il vous plaît", baseText: 'bitte', acceptedAnswers: ["s'il vous plaît", "S'il vous plaît", "s'il vous plait", "S'il vous plait", 'sil vous plait'] },
    { id: 'attendez', targetText: 'attendez', baseText: 'warten Sie', acceptedAnswers: ['attendez', 'Attendez'] },
  ],
  build: {
    targetText: "Un instant, s'il vous plaît.",
    chips: ['Un instant,', "s'il vous plaît.", 'attendez', 'merci'],
  },
  typeRecall: {
    before: 'Un ',
    answer: 'instant',
    after: ", s'il vous plaît.",
    acceptedAnswers: ['instant', 'Instant'],
    fallbackChoices: ['instant', 'ticket', 'bus', 'plan'],
  },
  speakTarget: {
    baseCue: 'Einen Augenblick, bitte.',
    targetPhrase: "Un instant, s'il vous plaît.",
    language: 'fr-FR',
    passingThreshold: 0.8,
    requiredTokens: ['instant', 'plaît'],
    optionalTokens: ['un', 'sil', 'vous', 'plait'],
  },
  sceneCaption: 'Du suchst kurz Karte oder Notiz und hältst die andere Person mit einer höflichen Pause im Gespräch.',
  trophyWord: {
    word: 'instant',
    meaning: 'Augenblick',
    example: "Un instant, s'il vous plaît.",
    whyThisWord: 'Instant ist die kurze höfliche Pause in Service- und Telefonsituationen. In "s’il vous plaît" ist die Elision obligatorisch; das "vous" hält den Ton höflich.',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Kasse oder Schalter, eine Hand sucht kurz in der Tasche, ruhige Wartebitte.',
  },
  songSeed: {
    genre: 'soft acoustic',
    mood: 'patient and bright',
  },
  visualNotes: 'Ruhige Pause, weiches Licht, kleiner Fokus auf Karte oder Notiz.',
}

const brightFrenchP3Lesson001: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: 'Je tourne à droite ou à gauche ?',
    baseText: 'Biege ich rechts oder links ab?',
  },
  meaning: 'Eine höfliche Orientierungsfrage an eine fremde Person: Welche Richtung ist richtig?',
  chunks: [
    { id: 'je-tourne', targetText: 'Je tourne', baseText: 'Ich biege ab' },
    { id: 'a-droite', targetText: 'à droite', baseText: 'nach rechts' },
    { id: 'ou-a-gauche', targetText: 'ou à gauche ?', baseText: 'oder nach links?' },
  ],
  lessonItems: [
    { id: 'tourne', targetText: 'tourne', baseText: 'biege ab / drehe', acceptedAnswers: ['tourne', 'Tourne'] },
    { id: 'droite', targetText: 'droite', baseText: 'rechts', acceptedAnswers: ['droite', 'Droite'] },
    { id: 'gauche', targetText: 'gauche', baseText: 'links', acceptedAnswers: ['gauche', 'Gauche'] },
    { id: 'a-droite', targetText: 'à droite', baseText: 'nach rechts', acceptedAnswers: ['à droite', 'a droite', 'À droite', 'A droite'] },
  ],
  build: {
    targetText: 'Je tourne à droite ou à gauche ?',
    chips: ['Je tourne', 'à droite', 'ou à gauche ?', 'tout droit', 'merci'],
  },
  typeRecall: {
    before: 'Je tourne à ',
    answer: 'droite',
    after: ' ou à gauche ?',
    acceptedAnswers: ['droite', 'Droite'],
    fallbackChoices: ['droite', 'gauche', 'loin', 'gare'],
  },
  speakTarget: {
    baseCue: 'Biege ich rechts oder links ab?',
    targetPhrase: 'Je tourne à droite ou à gauche ?',
    language: 'fr-FR',
    passingThreshold: 0.8,
    requiredTokens: ['tourne', 'droite', 'gauche'],
    optionalTokens: ['je', 'a', 'à', 'ou'],
  },
  sceneCaption: 'An der Kreuzung fragst du eine fremde Person, ob die richtige Richtung rechts oder links ist.',
  trophyWord: {
    word: 'droite',
    meaning: 'rechts',
    example: 'Je tourne à droite.',
    whyThisWord: 'Droite ist ein A1-Richtungswort. In Wegfragen steht es fast immer in der festen Gruppe "à droite"; der Akzent auf à markiert die Richtung.',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Helle Straßenecke mit zwei möglichen Richtungen und kurzer Nachfrage.',
  },
  songSeed: {
    genre: 'sunny acoustic',
    mood: 'choosing a turn',
  },
  visualNotes: 'Kreuzung, zwei klare Pfeilrichtungen, heller Stadtmoment.',
}

const brightFrenchP3Lesson002: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: "C'est loin à pied ?",
    baseText: 'Ist es zu Fuß weit?',
  },
  meaning: 'Eine kurze Frage, ob ein Ziel zu Fuß gut erreichbar ist.',
  chunks: [
    { id: 'cest-loin', targetText: "C'est loin", baseText: 'Ist es weit' },
    { id: 'a-pied', targetText: 'à pied ?', baseText: 'zu Fuß?' },
  ],
  lessonItems: [
    { id: 'cest', targetText: "c'est", baseText: 'das ist / ist es', acceptedAnswers: ["c'est", "C'est", 'c est', 'C est'] },
    { id: 'loin', targetText: 'loin', baseText: 'weit', acceptedAnswers: ['loin', 'Loin'] },
    { id: 'a-pied', targetText: 'à pied', baseText: 'zu Fuß', acceptedAnswers: ['à pied', 'a pied', 'À pied', 'A pied'] },
    { id: 'pres', targetText: 'près', baseText: 'nah', acceptedAnswers: ['près', 'pres', 'Près', 'Pres'] },
  ],
  build: {
    targetText: "C'est loin à pied ?",
    chips: ["C'est loin", 'à pied ?', 'en taxi', 'maintenant'],
  },
  typeRecall: {
    before: "C'est ",
    answer: 'loin',
    after: ' à pied ?',
    acceptedAnswers: ['loin', 'Loin'],
    fallbackChoices: ['loin', 'près', 'droite', 'heure'],
  },
  speakTarget: {
    baseCue: 'Ist es zu Fuß weit?',
    targetPhrase: "C'est loin à pied ?",
    language: 'fr-FR',
    passingThreshold: 0.8,
    requiredTokens: ['loin', 'pied'],
    optionalTokens: ['cest', 'c', 'est', 'a', 'à'],
  },
  sceneCaption: 'Mitten auf dem Weg fragst du, ob der Rest zu Fuß noch gut machbar ist.',
  trophyWord: {
    word: 'loin',
    meaning: 'weit',
    example: "C'est loin ?",
    whyThisWord: 'Loin ist der natürliche A1-Anker für Entfernung. Die französische Frage ist kurz: "C’est loin ?" statt einer wörtlichen deutschen Konstruktion.',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Bürgersteig mit Zielrichtung, kurzer Check zur Entfernung zu Fuß.',
  },
  songSeed: {
    genre: 'light acoustic pop',
    mood: 'checking distance',
  },
  visualNotes: 'Straßenschild, begehbarer Weg, klare Frage nach Nähe oder Entfernung.',
}

const brightFrenchP3Lesson003: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: "C'est ouvert maintenant ?",
    baseText: 'Ist jetzt geöffnet?',
  },
  meaning: 'Vor dem Eingang prüfst du, ob ein Geschäft, Café oder Büro gerade offen ist.',
  chunks: [
    { id: 'cest-ouvert', targetText: "C'est ouvert", baseText: 'Es ist geöffnet' },
    { id: 'maintenant', targetText: 'maintenant ?', baseText: 'jetzt?' },
  ],
  lessonItems: [
    { id: 'ouvert', targetText: 'ouvert', baseText: 'geöffnet / offen', acceptedAnswers: ['ouvert', 'Ouvert'] },
    { id: 'maintenant', targetText: 'maintenant', baseText: 'jetzt', acceptedAnswers: ['maintenant', 'Maintenant'] },
    { id: 'ferme-adj', targetText: 'fermé', baseText: 'geschlossen', acceptedAnswers: ['fermé', 'Fermé'] },
    { id: 'cest-ouvert', targetText: "c'est ouvert", baseText: 'es ist offen', acceptedAnswers: ["c'est ouvert", "C'est ouvert", 'c est ouvert', 'C est ouvert'] },
  ],
  build: {
    targetText: "C'est ouvert maintenant ?",
    chips: ["C'est ouvert", 'maintenant ?', 'demain', 'merci'],
  },
  typeRecall: {
    before: "C'est ",
    answer: 'ouvert',
    after: ' maintenant ?',
    acceptedAnswers: ['ouvert', 'Ouvert'],
    fallbackChoices: ['ouvert', 'fermé', 'loin', 'prochain'],
  },
  speakTarget: {
    baseCue: 'Ist jetzt geöffnet?',
    targetPhrase: "C'est ouvert maintenant ?",
    language: 'fr-FR',
    passingThreshold: 0.8,
    requiredTokens: ['ouvert', 'maintenant'],
    optionalTokens: ['cest', 'c', 'est'],
  },
  sceneCaption: 'Vor einer Tür mit Schild fragst du schlicht, ob der Ort gerade geöffnet ist.',
  trophyWord: {
    word: 'ouvert',
    meaning: 'geöffnet / offen',
    example: "C'est ouvert maintenant ?",
    whyThisWord: 'Ouvert beschreibt den Zustand eines Ortes. Die Elision in "c’est" ist obligatorisch; "ce est" ist keine korrekte französische Form.',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Café- oder Ladenfront mit Öffnungsschild und kurzer Nachfrage.',
  },
  songSeed: {
    genre: 'bright cafe acoustic',
    mood: 'checking the door',
  },
  visualNotes: 'Türschild, warmer Innenraum, Frage vor dem Eintreten.',
}

const brightFrenchP3Lesson004: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: 'Quel bus va au musée, s’il vous plaît ?',
    baseText: 'Welcher Bus fährt zum Museum, bitte?',
  },
  meaning: 'An der Haltestelle fragst du höflich nach der passenden Buslinie zu einem Ziel.',
  chunks: [
    { id: 'quel-bus', targetText: 'Quel bus', baseText: 'Welcher Bus' },
    { id: 'va-au-musee', targetText: 'va au musée,', baseText: 'fährt zum Museum,' },
    { id: 'sil-vous-plait', targetText: 's’il vous plaît ?', baseText: 'bitte?' },
  ],
  lessonItems: [
    { id: 'quel', targetText: 'quel', baseText: 'welcher', acceptedAnswers: ['quel', 'Quel'] },
    { id: 'bus', targetText: 'bus', baseText: 'Bus', acceptedAnswers: ['bus', 'Bus'] },
    { id: 'musee', targetText: 'musée', baseText: 'Museum', acceptedAnswers: ['musée', 'musee', 'Musée', 'Musee'] },
    { id: 'au-musee', targetText: 'au musée', baseText: 'zum Museum', acceptedAnswers: ['au musée', 'au musee', 'Au musée', 'Au musee'] },
  ],
  build: {
    targetText: 'Quel bus va au musée, s’il vous plaît ?',
    chips: ['Quel bus', 'va au musée,', 's’il vous plaît ?', 'à pied', 'ici'],
  },
  typeRecall: {
    before: 'Quel bus va au ',
    answer: 'musée',
    after: ', s’il vous plaît ?',
    acceptedAnswers: ['musée', 'musee', 'Musée', 'Musee'],
    fallbackChoices: ['musée', 'café', 'taxi', 'arrêt'],
  },
  speakTarget: {
    baseCue: 'Welcher Bus fährt zum Museum, bitte?',
    targetPhrase: 'Quel bus va au musée, s’il vous plaît ?',
    language: 'fr-FR',
    passingThreshold: 0.8,
    requiredTokens: ['quel', 'bus', 'musée'],
    optionalTokens: ['va', 'au', 'sil', 's', 'il', 'vous', 'plait', 'plaît'],
  },
  sceneCaption: 'An der Haltestelle fragst du Fahrer oder Passantin nach der richtigen Linie zum Museum.',
  trophyWord: {
    word: 'musée',
    meaning: 'Museum',
    example: 'Je vais au musée.',
    whyThisWord: 'Musée ist ein A1-Ort in Stadt- und Reiselektionen. "Au musée" zeigt die Pflichtform à + le = au; "à le musée" wäre falsch.',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Haltestelle mit Stadtplan und Museum als Ziel.',
  },
  songSeed: {
    genre: 'sunny street acoustic',
    mood: 'finding the right bus',
  },
  visualNotes: 'Buslinienplan, Museumssymbol, freundliche Frage am Straßenrand.',
}

const brightFrenchP3Lesson005: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: "C'est le prochain arrêt ?",
    baseText: 'Ist das die nächste Haltestelle?',
  },
  meaning: 'Im Bus oder in der Straßenbahn prüfst du, ob die nächste Haltestelle deine ist.',
  chunks: [
    { id: 'cest-le-prochain', targetText: "C'est le prochain", baseText: 'Ist das der nächste' },
    { id: 'arret', targetText: 'arrêt ?', baseText: 'Halt?' },
  ],
  lessonItems: [
    { id: 'prochain', targetText: 'prochain', baseText: 'nächster', acceptedAnswers: ['prochain', 'Prochain'] },
    { id: 'arret', targetText: 'arrêt', baseText: 'Haltestelle / Halt', acceptedAnswers: ['arrêt', 'arret', 'Arrêt', 'Arret'] },
    { id: 'prochain-arret', targetText: 'prochain arrêt', baseText: 'nächste Haltestelle', acceptedAnswers: ['prochain arrêt', 'prochain arret', 'Prochain arrêt', 'Prochain arret'] },
    { id: 'cest', targetText: "c'est", baseText: 'das ist / ist das', acceptedAnswers: ["c'est", "C'est", 'c est', 'C est'] },
  ],
  build: {
    targetText: "C'est le prochain arrêt ?",
    chips: ["C'est le prochain", 'arrêt ?', 'billet', 'gauche'],
  },
  typeRecall: {
    before: "C'est le ",
    answer: 'prochain',
    after: ' arrêt ?',
    acceptedAnswers: ['prochain', 'Prochain'],
    fallbackChoices: ['prochain', 'ouvert', 'loin', 'bon'],
  },
  speakTarget: {
    baseCue: 'Ist das die nächste Haltestelle?',
    targetPhrase: "C'est le prochain arrêt ?",
    language: 'fr-FR',
    passingThreshold: 0.8,
    requiredTokens: ['prochain', 'arrêt'],
    optionalTokens: ['cest', 'c', 'est', 'le', 'arret'],
  },
  sceneCaption: 'Kurz vor dem Halt prüfst du bei einer Person neben dir, ob du jetzt aussteigen musst.',
  trophyWord: {
    word: 'prochain',
    meaning: 'nächster',
    example: "C'est le prochain arrêt ?",
    whyThisWord: 'Prochain ist A1-nützlich für Zeit und Reihenfolge: nächster Halt, nächster Tag, nächster Termin. Die Liaison vor "arrêt" kann hörbar werden; schriftlich bleibt "prochain arrêt" getrennt.',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Innenraum einer Straßenbahn, Haltestellenanzeige kurz vor dem Halt.',
  },
  songSeed: {
    genre: 'light transit beat',
    mood: 'ready to step off',
  },
  visualNotes: 'Haltestellenanzeige, Hand am Haltegriff, kurzer Kontrollmoment.',
}

const brightFrenchP3Lesson006: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: 'Je voudrais un billet, s’il vous plaît.',
    baseText: 'Ich hätte gern eine Fahrkarte, bitte.',
  },
  meaning: 'Eine höfliche Service-Bitte für eine einzelne Fahrkarte am Schalter oder Automaten.',
  chunks: [
    { id: 'je-voudrais', targetText: 'Je voudrais', baseText: 'Ich hätte gern' },
    { id: 'un-billet', targetText: 'Un billet,', baseText: 'Eine Fahrkarte,' },
    { id: 'sil-vous-plait', targetText: 's’il vous plaît.', baseText: 'bitte.' },
  ],
  lessonItems: [
    { id: 'je-voudrais', targetText: 'je voudrais', baseText: 'ich hätte gern', acceptedAnswers: ['je voudrais', 'Je voudrais'] },
    { id: 'billet', targetText: 'billet', baseText: 'Fahrkarte / Ticket', acceptedAnswers: ['billet', 'Billet'] },
    { id: 'un-billet', targetText: 'un billet', baseText: 'eine Fahrkarte', acceptedAnswers: ['un billet', 'Un billet'] },
    { id: 'sil-vous-plait', targetText: 's’il vous plaît', baseText: 'bitte', acceptedAnswers: ['s’il vous plaît', 'S’il vous plaît', 's’il vous plait', 'S’il vous plait', "s'il vous plaît", "S'il vous plaît", "s'il vous plait", "S'il vous plait", 's il vous plait', 'sil vous plait'] },
    { id: 'aller-simple', targetText: 'aller simple', baseText: 'einfache Fahrt', acceptedAnswers: ['aller simple', 'Aller simple'] },
  ],
  build: {
    targetText: 'Je voudrais un billet, s’il vous plaît.',
    chips: ['Je voudrais', 'un billet,', 's’il vous plaît.', 'deux cafés', 'merci'],
  },
  typeRecall: {
    before: 'Je voudrais un ',
    answer: 'billet',
    after: ', s’il vous plaît.',
    acceptedAnswers: ['billet', 'Billet'],
    fallbackChoices: ['billet', 'bus', 'sac', 'coin'],
  },
  speakTarget: {
    baseCue: 'Ich hätte gern eine Fahrkarte, bitte.',
    targetPhrase: 'Je voudrais un billet, s’il vous plaît.',
    language: 'fr-FR',
    passingThreshold: 0.8,
    requiredTokens: ['voudrais', 'billet', 'plaît'],
    optionalTokens: ['je', 'un', 'sil', 's', 'il', 'vous', 'plait'],
  },
  sceneCaption: 'Am Verkehrsschalter hältst du die Bitte höflich und klar: du hättest gern eine Fahrkarte.',
  trophyWord: {
    word: 'billet',
    meaning: 'Fahrkarte / Ticket',
    example: 'Je voudrais un billet, s’il vous plaît.',
    whyThisWord: 'Billet ist der klare A1-Anker für Fahrkarten. Im Französischen ist es maskulin: "un billet", nicht "une billet"; in Service-Szenen macht "je voudrais" die Bitte höflich.',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Fahrkartenschalter, kleine Schlange, klare Bitte für ein Ticket.',
  },
  songSeed: {
    genre: 'bright acoustic',
    mood: 'simple ticket request',
  },
  visualNotes: 'Schalterfenster, Ticketdrucker, freundlicher Servicekontakt.',
}

const brightFrenchP3Lesson007: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: 'À quelle heure ça ferme ?',
    baseText: 'Um wie viel Uhr schließt es?',
  },
  meaning: 'Eine Planungsfrage nach der Schließzeit eines Ortes.',
  chunks: [
    { id: 'a-quelle-heure', targetText: 'À quelle heure', baseText: 'Um wie viel Uhr' },
    { id: 'ca-ferme', targetText: 'ça ferme ?', baseText: 'schließt es?' },
  ],
  lessonItems: [
    { id: 'heure', targetText: 'heure', baseText: 'Uhr / Stunde', acceptedAnswers: ['heure', 'Heure'] },
    { id: 'quelle-heure', targetText: 'quelle heure', baseText: 'welche Uhrzeit', acceptedAnswers: ['quelle heure', 'Quelle heure'] },
    { id: 'ferme', targetText: 'ferme', baseText: 'schließt', acceptedAnswers: ['ferme', 'Ferme'] },
    { id: 'ca', targetText: 'ça', baseText: 'es / das', acceptedAnswers: ['ça', 'ca', 'Ça', 'Ca'] },
  ],
  build: {
    targetText: 'À quelle heure ça ferme ?',
    chips: ['À quelle heure', 'ça ferme ?', 'maintenant', 'demain'],
  },
  typeRecall: {
    before: 'À quelle ',
    answer: 'heure',
    after: ' ça ferme ?',
    acceptedAnswers: ['heure', 'Heure'],
    fallbackChoices: ['heure', 'billet', 'coin', 'taxi'],
  },
  speakTarget: {
    baseCue: 'Um wie viel Uhr schließt es?',
    targetPhrase: 'À quelle heure ça ferme ?',
    language: 'fr-FR',
    passingThreshold: 0.8,
    requiredTokens: ['quelle', 'heure', 'ferme'],
    optionalTokens: ['a', 'à', 'ça', 'ca'],
  },
  sceneCaption: 'Vor Laden oder Museum fragst du nach der Uhrzeit, damit du den Besuch planen kannst.',
  trophyWord: {
    word: 'heure',
    meaning: 'Uhr / Stunde',
    example: 'À quelle heure ça ferme ?',
    whyThisWord: 'Heure ist der A1-Zeitanker für Uhrzeiten. "À quelle heure... ?" ist die feste Frageform für "um wie viel Uhr".',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Museumseingang mit Öffnungszeiten und kurzer Planungsfrage.',
  },
  songSeed: {
    genre: 'light museum acoustic',
    mood: 'planning the visit',
  },
  visualNotes: 'Öffnungszeiten-Schild, helles Foyer, Blick auf die Uhr.',
}

const brightFrenchP3Lesson008: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: "C'est au coin de la rue ?",
    baseText: 'Ist es an der Straßenecke?',
  },
  meaning: 'Eine konkrete Wegfrage mit einer Straßenecke als Orientierungspunkt.',
  chunks: [
    { id: 'cest-au-coin', targetText: "C'est au coin", baseText: 'Ist es an der Ecke' },
    { id: 'de-la-rue', targetText: 'de la rue ?', baseText: 'der Straße?' },
  ],
  lessonItems: [
    { id: 'coin', targetText: 'coin', baseText: 'Ecke', acceptedAnswers: ['coin', 'Coin'] },
    { id: 'au-coin', targetText: 'au coin', baseText: 'an der Ecke', acceptedAnswers: ['au coin', 'Au coin'] },
    { id: 'rue', targetText: 'rue', baseText: 'Straße', acceptedAnswers: ['rue', 'Rue'] },
    { id: 'de-la-rue', targetText: 'de la rue', baseText: 'der Straße', acceptedAnswers: ['de la rue', 'De la rue'] },
  ],
  build: {
    targetText: "C'est au coin de la rue ?",
    chips: ["C'est au coin", 'de la rue ?', 'à gauche', 'loin'],
  },
  typeRecall: {
    before: "C'est au ",
    answer: 'coin',
    after: ' de la rue ?',
    acceptedAnswers: ['coin', 'Coin'],
    fallbackChoices: ['coin', 'musée', 'billet', 'heure'],
  },
  speakTarget: {
    baseCue: 'Ist es an der Straßenecke?',
    targetPhrase: "C'est au coin de la rue ?",
    language: 'fr-FR',
    passingThreshold: 0.8,
    requiredTokens: ['coin', 'rue'],
    optionalTokens: ['cest', 'c', 'est', 'au', 'de', 'la'],
  },
  sceneCaption: 'An einer Kreuzung prüfst du, ob der gesuchte Ort wirklich an der Ecke liegt.',
  trophyWord: {
    word: 'coin',
    meaning: 'Ecke',
    example: "C'est au coin de la rue.",
    whyThisWord: 'Coin heißt hier "Ecke", nicht englisch "Münze". In Wegbeschreibungen ist "au coin de la rue" eine sehr brauchbare A1-Gruppe.',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Straßenecke mit Ladenfront und kurzer Bestätigung.',
  },
  songSeed: {
    genre: 'sunny city acoustic',
    mood: 'corner landmark',
  },
  visualNotes: 'Ecke, Straßenschild, sichtbarer Eingang als Orientierungspunkt.',
}

const brightFrenchP3Lesson009: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: 'À pied ou en taxi ?',
    baseText: 'Zu Fuß oder mit dem Taxi?',
  },
  meaning: 'Eine neutrale Entscheidung zwischen zwei einfachen Transportoptionen.',
  chunks: [
    { id: 'a-pied', targetText: 'À pied', baseText: 'Zu Fuß' },
    { id: 'ou-en-taxi', targetText: 'ou en taxi ?', baseText: 'oder mit dem Taxi?' },
  ],
  lessonItems: [
    { id: 'a-pied', targetText: 'à pied', baseText: 'zu Fuß', acceptedAnswers: ['à pied', 'a pied', 'À pied', 'A pied'] },
    { id: 'taxi', targetText: 'taxi', baseText: 'Taxi', acceptedAnswers: ['taxi', 'Taxi'] },
    { id: 'en-taxi', targetText: 'en taxi', baseText: 'mit dem Taxi', acceptedAnswers: ['en taxi', 'En taxi'] },
    { id: 'ou', targetText: 'ou', baseText: 'oder', acceptedAnswers: ['ou', 'Ou'] },
  ],
  build: {
    targetText: 'À pied ou en taxi ?',
    chips: ['À pied', 'ou en taxi ?', 'à droite', 'un billet'],
  },
  typeRecall: {
    before: 'À pied ou en ',
    answer: 'taxi',
    after: ' ?',
    acceptedAnswers: ['taxi', 'Taxi'],
    fallbackChoices: ['taxi', 'bus', 'train', 'café'],
  },
  speakTarget: {
    baseCue: 'Zu Fuß oder mit dem Taxi?',
    targetPhrase: 'À pied ou en taxi ?',
    language: 'fr-FR',
    passingThreshold: 0.8,
    requiredTokens: ['pied', 'taxi'],
    optionalTokens: ['a', 'à', 'ou', 'en'],
  },
  sceneCaption: 'Am Ende eines Wegstücks entscheidest du schlicht, ob ihr lauft oder ein Taxi nehmt.',
  trophyWord: {
    word: 'taxi',
    meaning: 'Taxi',
    example: 'On prend un taxi ?',
    whyThisWord: 'Taxi ist international verständlich und im Französischen maskulin: "un taxi". Die Transportgruppe lautet natürlich "en taxi".',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Straßenrand mit Fußweg und wartendem Taxi als einfache Wahl.',
  },
  songSeed: {
    genre: 'bright evening acoustic',
    mood: 'choosing transport',
  },
  visualNotes: 'Zwei Optionen im Bild: Gehweg und Taxi, ruhige Entscheidungsfrage.',
}

const brightFrenchP3Lesson010: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: "J'ai raté mon arrêt. Vous pouvez m'aider ?",
    baseText: 'Ich habe meine Haltestelle verpasst. Können Sie mir helfen?',
  },
  meaning: 'Nach einer kleinen Verkehrspanne erklärst du das Problem und bittest höflich um Hilfe.',
  chunks: [
    { id: 'jai-rate', targetText: "J'ai raté", baseText: 'Ich habe verpasst' },
    { id: 'mon-arret', targetText: 'mon arrêt.', baseText: 'meine Haltestelle.' },
    { id: 'vous-pouvez-maider', targetText: "Vous pouvez m'aider ?", baseText: 'Können Sie mir helfen?' },
  ],
  lessonItems: [
    { id: 'jai-rate', targetText: "j'ai raté", baseText: 'ich habe verpasst', acceptedAnswers: ["j'ai raté", "J'ai raté", "j'ai rate", "J'ai rate", 'jai raté', 'jai rate'] },
    { id: 'arret', targetText: 'arrêt', baseText: 'Haltestelle / Halt', acceptedAnswers: ['arrêt', 'arret', 'Arrêt', 'Arret'] },
    { id: 'mon-arret', targetText: 'mon arrêt', baseText: 'meine Haltestelle', acceptedAnswers: ['mon arrêt', 'mon arret', 'Mon arrêt', 'Mon arret'] },
    { id: 'maider', targetText: "m'aider", baseText: 'mir helfen', acceptedAnswers: ["m'aider", "M'aider", 'm aider', 'M aider'] },
  ],
  build: {
    targetText: "J'ai raté mon arrêt. Vous pouvez m'aider ?",
    chips: ["J'ai raté", 'mon arrêt.', "Vous pouvez m'aider ?", 'à droite', 'merci'],
  },
  typeRecall: {
    before: "J'ai raté mon ",
    answer: 'arrêt',
    after: ". Vous pouvez m'aider ?",
    acceptedAnswers: ['arrêt', 'arret', 'Arrêt', 'Arret'],
    fallbackChoices: ['arrêt', 'billet', 'coin', 'musée'],
  },
  speakTarget: {
    baseCue: 'Ich habe meine Haltestelle verpasst. Können Sie mir helfen?',
    targetPhrase: "J'ai raté mon arrêt. Vous pouvez m'aider ?",
    language: 'fr-FR',
    passingThreshold: 0.8,
    requiredTokens: ['raté', 'arrêt', 'aider'],
    optionalTokens: ['jai', 'j', 'ai', 'rate', 'mon', 'vous', 'pouvez', 'm'],
  },
  sceneCaption: 'Im Bus oder direkt nach dem Aussteigen erklärst du ruhig, dass du den Halt verpasst hast.',
  trophyWord: {
    word: 'arrêt',
    meaning: 'Haltestelle / Halt',
    example: "J'ai raté mon arrêt.",
    whyThisWord: 'Arrêt ist der zentrale A1-Verkehrsanker für Bus und Tram. Der Akzent ist Teil der Standardschreibung; ohne Akzent bleibt es als Tippvariante erkennbar.',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Businnenraum kurz nach der Haltestelle, ruhige Bitte um Hilfe.',
  },
  songSeed: {
    genre: 'soft transit acoustic',
    mood: 'recovering the route',
  },
  visualNotes: 'Haltestellenanzeige, leichter Schreck, sofort höfliche Hilfe-Frage.',
}

const brightFrenchP4Lesson001: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: 'Une table pour deux, s’il vous plaît.',
    baseText: 'Einen Tisch für zwei, bitte.',
  },
  meaning: 'Eine höfliche kurze Bitte am Restaurant- oder Café-Eingang.',
  chunks: [
    { id: 'une-table', targetText: 'Une table', baseText: 'Einen Tisch' },
    { id: 'pour-deux', targetText: 'pour deux,', baseText: 'für zwei,' },
    { id: 'sil-vous-plait', targetText: 's’il vous plaît.', baseText: 'bitte.' },
  ],
  lessonItems: [
    { id: 'table', targetText: 'table', baseText: 'Tisch', acceptedAnswers: ['table', 'Table'] },
    { id: 'une-table', targetText: 'une table', baseText: 'ein Tisch', acceptedAnswers: ['une table', 'Une table'] },
    { id: 'pour-deux', targetText: 'pour deux', baseText: 'für zwei', acceptedAnswers: ['pour deux', 'Pour deux'] },
    { id: 'sil-vous-plait', targetText: 's’il vous plaît', baseText: 'bitte', acceptedAnswers: ['s’il vous plaît', 'S’il vous plaît', 's’il vous plait', 'S’il vous plait', "s'il vous plaît", "S'il vous plaît", "s'il vous plait", "S'il vous plait", 'sil vous plait'] },
  ],
  build: {
    targetText: 'Une table pour deux, s’il vous plaît.',
    chips: ['Une table', 'pour deux,', 's’il vous plaît.', 'un billet', 'merci'],
  },
  typeRecall: {
    before: 'Une ',
    answer: 'table',
    after: ' pour deux, s’il vous plaît.',
    acceptedAnswers: ['table', 'Table'],
    fallbackChoices: ['table', 'carte', 'addition', 'thé'],
  },
  speakTarget: {
    baseCue: 'Einen Tisch für zwei, bitte.',
    targetPhrase: 'Une table pour deux, s’il vous plaît.',
    language: 'fr-FR',
    passingThreshold: 0.8,
    requiredTokens: ['table', 'deux', 'plaît'],
    optionalTokens: ['une', 'pour', 'sil', 's', 'il', 'vous', 'plait'],
  },
  sceneCaption: 'Am Eingang nennst du dem Personal direkt die gewünschte Tischgröße.',
  trophyWord: {
    word: 'table',
    meaning: 'Tisch',
    example: 'Une table pour deux, s’il vous plaît.',
    whyThisWord: 'Table ist im Französischen feminin: "une table". In Servicekontexten hält "vous" den Ton höflich gegenüber dem Personal.',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Restaurant-Eingang, Empfangspult, freundliche Tischbitte.',
  },
  songSeed: {
    genre: 'bright cafe acoustic',
    mood: 'arriving at a table',
  },
  visualNotes: 'Helles Restaurantfoyer, zwei Gedecke, kurzer Empfangsmoment.',
}

const brightFrenchP4Lesson002: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: 'La carte, s’il vous plaît.',
    baseText: 'Die Speisekarte, bitte.',
  },
  meaning: 'Eine natürliche kurze Bitte um die Speisekarte am Tisch.',
  chunks: [
    { id: 'la-carte', targetText: 'La carte,', baseText: 'Die Speisekarte,' },
    { id: 'sil-vous-plait', targetText: 's’il vous plaît.', baseText: 'bitte.' },
  ],
  lessonItems: [
    { id: 'carte', targetText: 'carte', baseText: 'Speisekarte / Karte', acceptedAnswers: ['carte', 'Carte'] },
    { id: 'la-carte', targetText: 'la carte', baseText: 'die Speisekarte', acceptedAnswers: ['la carte', 'La carte'] },
    { id: 'menu', targetText: 'menu', baseText: 'Menü', acceptedAnswers: ['menu', 'Menu'] },
    { id: 'sil-vous-plait', targetText: 's’il vous plaît', baseText: 'bitte', acceptedAnswers: ['s’il vous plaît', 'S’il vous plaît', 's’il vous plait', 'S’il vous plait', "s'il vous plaît", "S'il vous plaît", "s'il vous plait", "S'il vous plait", 'sil vous plait'] },
  ],
  build: {
    targetText: 'La carte, s’il vous plaît.',
    chips: ['La carte,', 's’il vous plaît.', 'un café', 'au coin'],
  },
  typeRecall: {
    before: 'La ',
    answer: 'carte',
    after: ', s’il vous plaît.',
    acceptedAnswers: ['carte', 'Carte'],
    fallbackChoices: ['carte', 'table', 'thé', 'sucre'],
  },
  speakTarget: {
    baseCue: 'Die Speisekarte, bitte.',
    targetPhrase: 'La carte, s’il vous plaît.',
    language: 'fr-FR',
    passingThreshold: 0.8,
    requiredTokens: ['carte', 'plaît'],
    optionalTokens: ['la', 'sil', 's', 'il', 'vous', 'plait'],
  },
  sceneCaption: 'Am Tisch bittest du höflich um die Karte, bevor du bestellst.',
  trophyWord: {
    word: 'carte',
    meaning: 'Speisekarte / Karte',
    example: 'La carte, s’il vous plaît.',
    whyThisWord: 'Carte ist im Restaurant die natürliche Speisekarte. Das ist kein Problem mit der Zahlungskarte aus P2: Der Kontext entscheidet die Bedeutung.',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Restauranttisch, leeres Gedeck, Bedienung bringt die Karte.',
  },
  songSeed: {
    genre: 'soft bistro acoustic',
    mood: 'opening the menu',
  },
  visualNotes: 'Tischkante, Karte im Licht, ruhige Bitte am Anfang.',
}

const brightFrenchP4Lesson003: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: 'Je voudrais un thé, s’il vous plaît.',
    baseText: 'Ich hätte gern einen Tee, bitte.',
  },
  meaning: 'Eine höfliche Getränkebestellung mit je voudrais.',
  chunks: [
    { id: 'je-voudrais', targetText: 'Je voudrais', baseText: 'Ich hätte gern' },
    { id: 'un-the', targetText: 'un thé,', baseText: 'einen Tee,' },
    { id: 'sil-vous-plait', targetText: 's’il vous plaît.', baseText: 'bitte.' },
  ],
  lessonItems: [
    { id: 'voudrais', targetText: 'je voudrais', baseText: 'ich hätte gern', acceptedAnswers: ['je voudrais', 'Je voudrais'] },
    { id: 'the', targetText: 'thé', baseText: 'Tee', acceptedAnswers: ['thé', 'the', 'Thé', 'The'] },
    { id: 'un-the', targetText: 'un thé', baseText: 'ein Tee', acceptedAnswers: ['un thé', 'un the', 'Un thé', 'Un the'] },
    { id: 'sil-vous-plait', targetText: 's’il vous plaît', baseText: 'bitte', acceptedAnswers: ['s’il vous plaît', 'S’il vous plaît', 's’il vous plait', 'S’il vous plait', "s'il vous plaît", "S'il vous plaît", "s'il vous plait", "S'il vous plait", 'sil vous plait'] },
  ],
  build: {
    targetText: 'Je voudrais un thé, s’il vous plaît.',
    chips: ['Je voudrais', 'un thé,', 's’il vous plaît.', 'une table', 'l’addition'],
  },
  typeRecall: {
    before: 'Je voudrais un ',
    answer: 'thé',
    after: ', s’il vous plaît.',
    acceptedAnswers: ['thé', 'the', 'Thé', 'The'],
    fallbackChoices: ['thé', 'sucre', 'carte', 'table'],
  },
  speakTarget: {
    baseCue: 'Ich hätte gern einen Tee, bitte.',
    targetPhrase: 'Je voudrais un thé, s’il vous plaît.',
    language: 'fr-FR',
    passingThreshold: 0.8,
    requiredTokens: ['voudrais', 'thé', 'plaît'],
    optionalTokens: ['je', 'un', 'the', 'sil', 's', 'il', 'vous', 'plait'],
  },
  sceneCaption: 'Beim Bestellen wählst du Tee und hältst die Bitte höflich.',
  trophyWord: {
    word: 'thé',
    meaning: 'Tee',
    example: 'Je voudrais un thé.',
    whyThisWord: 'Thé ist ein einfaches A1-Getränkewort. Der Akzent unterscheidet die Standardschreibung; ohne Akzent bleibt es als Tippvariante tolerierbar.',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Café-Tisch mit Teetasse und kurzer höflicher Bestellung.',
  },
  songSeed: {
    genre: 'bright acoustic chanson-light',
    mood: 'ordering tea',
  },
  visualNotes: 'Tasse, Dampf, helle Tischfläche, warme Bestellung.',
}

const brightFrenchP4Lesson004: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: 'Sans sucre, s’il vous plaît.',
    baseText: 'Ohne Zucker, bitte.',
  },
  meaning: 'Eine kurze höfliche Vorliebe beim Getränk: kein Zucker.',
  chunks: [
    { id: 'sans-sucre', targetText: 'Sans sucre,', baseText: 'Ohne Zucker,' },
    { id: 'sil-vous-plait', targetText: 's’il vous plaît.', baseText: 'bitte.' },
  ],
  lessonItems: [
    { id: 'sans', targetText: 'sans', baseText: 'ohne', acceptedAnswers: ['sans', 'Sans'] },
    { id: 'sucre', targetText: 'sucre', baseText: 'Zucker', acceptedAnswers: ['sucre', 'Sucre'] },
    { id: 'sans-sucre', targetText: 'sans sucre', baseText: 'ohne Zucker', acceptedAnswers: ['sans sucre', 'Sans sucre'] },
    { id: 'sil-vous-plait', targetText: 's’il vous plaît', baseText: 'bitte', acceptedAnswers: ['s’il vous plaît', 'S’il vous plaît', 's’il vous plait', 'S’il vous plait', "s'il vous plaît", "S'il vous plaît", "s'il vous plait", "S'il vous plait", 'sil vous plait'] },
  ],
  build: {
    targetText: 'Sans sucre, s’il vous plaît.',
    chips: ['Sans sucre,', 's’il vous plaît.', 'avec lait', 'merci'],
  },
  typeRecall: {
    before: 'Sans ',
    answer: 'sucre',
    after: ', s’il vous plaît.',
    acceptedAnswers: ['sucre', 'Sucre'],
    fallbackChoices: ['sucre', 'thé', 'table', 'frais'],
  },
  speakTarget: {
    baseCue: 'Ohne Zucker, bitte.',
    targetPhrase: 'Sans sucre, s’il vous plaît.',
    language: 'fr-FR',
    passingThreshold: 0.8,
    requiredTokens: ['sans', 'sucre', 'plaît'],
    optionalTokens: ['sil', 's', 'il', 'vous', 'plait'],
  },
  sceneCaption: 'Während das Getränk vorbereitet wird, sagst du kurz, dass du keinen Zucker möchtest.',
  trophyWord: {
    word: 'sucre',
    meaning: 'Zucker',
    example: 'Sans sucre, s’il vous plaît.',
    whyThisWord: 'Sucre ist ein A1-Caféwort. "Sans sucre" ist die natürliche kurze Gruppe, nicht eine umständliche ganze Negation.',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Tasse am Tresen, Zuckerpäckchen bleibt liegen, höfliche Vorliebe.',
  },
  songSeed: {
    genre: 'soft cafe acoustic',
    mood: 'simple preference',
  },
  visualNotes: 'Zuckerpäckchen, Tasse, kurze klare Präferenz.',
}

const brightFrenchP4Lesson005: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: "C'est frais ?",
    baseText: 'Ist das frisch?',
  },
  meaning: 'Eine kurze Nachfrage am Bäckerei- oder Markttresen, ob ein sichtbares Essen frisch ist.',
  chunks: [
    { id: 'cest', targetText: "C'est", baseText: 'Ist das' },
    { id: 'frais', targetText: 'frais ?', baseText: 'frisch?' },
  ],
  lessonItems: [
    { id: 'cest', targetText: "c'est", baseText: 'das ist / ist das', acceptedAnswers: ["c'est", "C'est", 'c’est', 'C’est', 'c est', 'C est'] },
    { id: 'frais', targetText: 'frais', baseText: 'frisch', acceptedAnswers: ['frais', 'Frais', 'frai', 'Frai'] },
    { id: 'pain', targetText: 'pain', baseText: 'Brot', acceptedAnswers: ['pain', 'Pain'] },
    { id: 'aujourdhui', targetText: "aujourd'hui", baseText: 'heute', acceptedAnswers: ["aujourd'hui", "Aujourd'hui", 'aujourd’hui', 'Aujourd’hui', 'aujourdhui', 'Aujourdhui'] },
  ],
  build: {
    targetText: "C'est frais ?",
    chips: ["C'est", 'frais ?', 'sans sucre', 'la carte'],
  },
  typeRecall: {
    before: "C'est ",
    answer: 'frais',
    after: ' ?',
    acceptedAnswers: ['frais', 'Frais', 'frai', 'Frai'],
    fallbackChoices: ['frais', 'bon', 'beau', 'loin'],
  },
  speakTarget: {
    baseCue: 'Ist das frisch?',
    targetPhrase: "C'est frais ?",
    language: 'fr-FR',
    passingThreshold: 0.8,
    requiredTokens: ['frais'],
    optionalTokens: ['cest', 'c', 'est'],
  },
  sceneCaption: 'An der Auslage zeigst du auf ein Gebäck und fragst schlicht nach der Frische.',
  trophyWord: {
    word: 'frais',
    meaning: 'frisch',
    example: "C'est frais ?",
    whyThisWord: 'Frais ist das Standardwort für frisch bei Lebensmitteln. Das s bleibt in der Standardschreibung, auch wenn es meist nicht hörbar ist.',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Bäckerei-Auslage mit frischem Brot und kurzer Nachfrage.',
  },
  songSeed: {
    genre: 'warm bakery acoustic',
    mood: 'checking freshness',
  },
  visualNotes: 'Gebäck, helles Thekenlicht, kurze natürliche Frage.',
}

const brightFrenchP4Lesson006: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: "Non merci, c'est tout.",
    baseText: 'Nein danke, das ist alles.',
  },
  meaning: 'Eine höfliche Antwort, wenn das Personal fragt, ob noch etwas dazukommt.',
  chunks: [
    { id: 'non-merci', targetText: 'Non merci,', baseText: 'Nein danke,' },
    { id: 'cest-tout', targetText: "c'est tout.", baseText: 'das ist alles.' },
  ],
  lessonItems: [
    { id: 'non-merci', targetText: 'non merci', baseText: 'nein danke', acceptedAnswers: ['non merci', 'Non merci'] },
    { id: 'tout', targetText: 'tout', baseText: 'alles', acceptedAnswers: ['tout', 'Tout', 'tou', 'Tou'] },
    { id: 'cest-tout', targetText: "c'est tout", baseText: 'das ist alles', acceptedAnswers: ["c'est tout", "C'est tout", 'c’est tout', 'C’est tout', 'c est tout', 'C est tout'] },
    { id: 'encore', targetText: 'encore', baseText: 'noch / wieder', acceptedAnswers: ['encore', 'Encore'] },
  ],
  build: {
    targetText: "Non merci, c'est tout.",
    chips: ['Non merci,', "c'est tout.", 'un thé', 'une table'],
  },
  typeRecall: {
    before: "Non merci, c'est ",
    answer: 'tout',
    after: '.',
    acceptedAnswers: ['tout', 'Tout', 'tou', 'Tou'],
    fallbackChoices: ['tout', 'sucre', 'carte', 'beau'],
  },
  speakTarget: {
    baseCue: 'Nein danke, das ist alles.',
    targetPhrase: "Non merci, c'est tout.",
    language: 'fr-FR',
    passingThreshold: 0.8,
    requiredTokens: ['non', 'merci', 'tout'],
    optionalTokens: ['cest', 'c', 'est'],
  },
  sceneCaption: 'Nach der Nachfrage des Personals schließt du deine Bestellung höflich ab.',
  trophyWord: {
    word: 'tout',
    meaning: 'alles',
    example: "C'est tout.",
    whyThisWord: 'Tout ist ein sehr häufiges A1-Wort. In "c’est tout" beendet es eine Bestellung knapp und höflich.',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Café-Tresen, Bestellung abgeschlossen, freundliches Kopfnicken.',
  },
  songSeed: {
    genre: 'light checkout acoustic',
    mood: 'closing the order',
  },
  visualNotes: 'Tresen, kleine Bestellung, klarer Abschluss ohne Hast.',
}

const brightFrenchP4Lesson007: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: 'À emporter, s’il vous plaît.',
    baseText: 'Zum Mitnehmen, bitte.',
  },
  meaning: 'Die feste Café-Formel, wenn die Bestellung mitgenommen werden soll.',
  chunks: [
    { id: 'a-emporter', targetText: 'À emporter,', baseText: 'Zum Mitnehmen,' },
    { id: 'sil-vous-plait', targetText: 's’il vous plaît.', baseText: 'bitte.' },
  ],
  lessonItems: [
    { id: 'emporter', targetText: 'emporter', baseText: 'mitnehmen', acceptedAnswers: ['emporter', 'Emporter'] },
    { id: 'a-emporter', targetText: 'à emporter', baseText: 'zum Mitnehmen', acceptedAnswers: ['à emporter', 'a emporter', 'À emporter', 'A emporter'] },
    { id: 'sur-place', targetText: 'sur place', baseText: 'vor Ort', acceptedAnswers: ['sur place', 'Sur place'] },
    { id: 'sil-vous-plait', targetText: 's’il vous plaît', baseText: 'bitte', acceptedAnswers: ['s’il vous plaît', 'S’il vous plaît', 's’il vous plait', 'S’il vous plait', "s'il vous plaît", "S'il vous plaît", "s'il vous plait", "S'il vous plait", 'sil vous plait'] },
  ],
  build: {
    targetText: 'À emporter, s’il vous plaît.',
    chips: ['À emporter,', 's’il vous plaît.', 'sur place', 'la carte'],
  },
  typeRecall: {
    before: 'À ',
    answer: 'emporter',
    after: ', s’il vous plaît.',
    acceptedAnswers: ['emporter', 'Emporter'],
    fallbackChoices: ['emporter', 'addition', 'table', 'frais'],
  },
  speakTarget: {
    baseCue: 'Zum Mitnehmen, bitte.',
    targetPhrase: 'À emporter, s’il vous plaît.',
    language: 'fr-FR',
    passingThreshold: 0.8,
    requiredTokens: ['emporter', 'plaît'],
    optionalTokens: ['a', 'à', 'sil', 's', 'il', 'vous', 'plait'],
  },
  sceneCaption: 'Am Café-Tresen sagst du direkt, dass die Bestellung zum Mitnehmen ist.',
  trophyWord: {
    word: 'emporter',
    meaning: 'mitnehmen',
    example: 'À emporter, s’il vous plaît.',
    whyThisWord: 'Emporter ist der Kern der festen Serviceformel "à emporter". Das ist die natürliche französische Form für "zum Mitnehmen".',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Café-Theke mit Pappbecher und kleiner Tüte zum Mitnehmen.',
  },
  songSeed: {
    genre: 'quick bright acoustic',
    mood: 'takeaway order',
  },
  visualNotes: 'Pappbecher, Theke, schneller aber höflicher Mitnahme-Moment.',
}

const brightFrenchP4Lesson008: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: "C'était très bon.",
    baseText: 'Es war sehr gut.',
  },
  meaning: 'Ein kurzer positiver Satz nach dem Essen oder Trinken.',
  chunks: [
    { id: 'cetait', targetText: "C'était", baseText: 'Es war' },
    { id: 'tres-bon', targetText: 'très bon.', baseText: 'sehr gut.' },
  ],
  lessonItems: [
    { id: 'cetait', targetText: "c'était", baseText: 'es war', acceptedAnswers: ["c'était", "C'était", 'c’était', 'C’était', 'c’etait', 'C’etait', 'c etait', 'C etait'] },
    { id: 'tres', targetText: 'très', baseText: 'sehr', acceptedAnswers: ['très', 'tres', 'Très', 'Tres'] },
    { id: 'bon', targetText: 'bon', baseText: 'gut', acceptedAnswers: ['bon', 'Bon'] },
    { id: 'tres-bon', targetText: 'très bon', baseText: 'sehr gut', acceptedAnswers: ['très bon', 'tres bon', 'Très bon', 'Tres bon'] },
  ],
  build: {
    targetText: "C'était très bon.",
    chips: ["C'était", 'très bon.', 'sans sucre', 'merci'],
  },
  typeRecall: {
    before: "C'était très ",
    answer: 'bon',
    after: '.',
    acceptedAnswers: ['bon', 'Bon'],
    fallbackChoices: ['bon', 'beau', 'frais', 'loin'],
  },
  speakTarget: {
    baseCue: 'Es war sehr gut.',
    targetPhrase: "C'était très bon.",
    language: 'fr-FR',
    passingThreshold: 0.8,
    requiredTokens: ['était', 'très', 'bon'],
    optionalTokens: ['c', 'cetait', 'etait', 'tres'],
  },
  sceneCaption: 'Nach dem Essen gibst du eine kurze freundliche Rückmeldung.',
  trophyWord: {
    word: 'bon',
    meaning: 'gut / lecker',
    example: "C'était très bon.",
    whyThisWord: 'Bon ist ein Grundwort für einfache positive Urteile. Bei Essen heißt es natürlich auch "lecker".',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Leerer Teller, freundliches Nicken, kurze positive Rückmeldung.',
  },
  songSeed: {
    genre: 'warm bistro acoustic',
    mood: 'simple compliment',
  },
  visualNotes: 'Teller, Serviette, heller Abschluss am Tisch.',
}

const brightFrenchP4Lesson009: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: "Il fait beau aujourd'hui.",
    baseText: 'Heute ist schönes Wetter.',
  },
  meaning: 'Eine leichte Small-Talk-Zeile über das Wetter am Tresen.',
  chunks: [
    { id: 'il-fait-beau', targetText: 'Il fait beau', baseText: 'Es ist schön' },
    { id: 'aujourdhui', targetText: "aujourd'hui.", baseText: 'heute.' },
  ],
  lessonItems: [
    { id: 'il-fait', targetText: 'il fait', baseText: 'es macht / es ist beim Wetter', acceptedAnswers: ['il fait', 'Il fait'] },
    { id: 'beau', targetText: 'beau', baseText: 'schön', acceptedAnswers: ['beau', 'Beau'] },
    { id: 'aujourdhui', targetText: "aujourd'hui", baseText: 'heute', acceptedAnswers: ["aujourd'hui", "Aujourd'hui", 'aujourd’hui', 'Aujourd’hui', 'aujourdhui', 'Aujourdhui'] },
    { id: 'il-fait-beau', targetText: 'il fait beau', baseText: 'es ist schönes Wetter', acceptedAnswers: ['il fait beau', 'Il fait beau'] },
  ],
  build: {
    targetText: "Il fait beau aujourd'hui.",
    chips: ['Il fait beau', "aujourd'hui.", 'à emporter', 'l’addition'],
  },
  typeRecall: {
    before: 'Il fait ',
    answer: 'beau',
    after: " aujourd'hui.",
    acceptedAnswers: ['beau', 'Beau'],
    fallbackChoices: ['beau', 'bon', 'frais', 'sucre'],
  },
  speakTarget: {
    baseCue: 'Heute ist schönes Wetter.',
    targetPhrase: "Il fait beau aujourd'hui.",
    language: 'fr-FR',
    passingThreshold: 0.8,
    requiredTokens: ['fait', 'beau', 'aujourd'],
    optionalTokens: ['il', 'hui', 'aujourdhui'],
  },
  sceneCaption: 'Beim Bezahlen machst du eine kurze freundliche Bemerkung über das Wetter.',
  trophyWord: {
    word: 'beau',
    meaning: 'schön',
    example: "Il fait beau aujourd'hui.",
    whyThisWord: 'Beau ist ein A1-Grundwort. Beim Wetter sagt man fest "il fait beau"; das ist keine wörtliche deutsche Satzstruktur.',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Café-Tresen mit Sonnenlicht am Fenster und leichter Small-Talk-Zeile.',
  },
  songSeed: {
    genre: 'sunny cafe acoustic',
    mood: 'light small talk',
  },
  visualNotes: 'Sonnenlicht, Kassenmoment, kleine freundliche Wetterbemerkung.',
}

const brightFrenchP4Lesson010: GuidedLessonVibeVariant = {
  contentStatus: 'draft',
  corePhrase: {
    targetText: "L'addition, s'il vous plaît.",
    baseText: 'Die Rechnung, bitte.',
  },
  meaning: 'Die kurze Standardformel, um am Ende des Essens die Rechnung zu bekommen.',
  chunks: [
    { id: 'laddition', targetText: "L'addition,", baseText: 'Die Rechnung,' },
    { id: 'sil-vous-plait', targetText: "s'il vous plaît.", baseText: 'bitte.' },
  ],
  lessonItems: [
    { id: 'addition', targetText: 'addition', baseText: 'Rechnung', acceptedAnswers: ['addition', 'Addition'] },
    { id: 'laddition', targetText: "l'addition", baseText: 'die Rechnung', acceptedAnswers: ["l'addition", "L'addition", 'l’addition', 'L’addition', 'l addition', 'L addition'] },
    { id: 'sil-vous-plait', targetText: "s'il vous plaît", baseText: 'bitte', acceptedAnswers: ["s'il vous plaît", "S'il vous plaît", "s'il vous plait", "S'il vous plait", 's’il vous plaît', 'S’il vous plaît', 's’il vous plait', 'S’il vous plait', 's il vous plait', 'sil vous plait'] },
    { id: 'payer', targetText: 'payer', baseText: 'bezahlen', acceptedAnswers: ['payer', 'Payer'] },
  ],
  build: {
    targetText: "L'addition, s'il vous plaît.",
    chips: ["L'addition,", "s'il vous plaît.", 'la carte', 'un billet'],
  },
  typeRecall: {
    before: "L'",
    answer: 'addition',
    after: ", s'il vous plaît.",
    acceptedAnswers: ['addition', 'Addition'],
    fallbackChoices: ['addition', 'table', 'carte', 'thé'],
  },
  speakTarget: {
    baseCue: 'Die Rechnung, bitte.',
    targetPhrase: "L'addition, s'il vous plaît.",
    language: 'fr-FR',
    passingThreshold: 0.8,
    requiredTokens: ['addition', 'plaît'],
    optionalTokens: ['l', 'sil', 's', 'il', 'vous', 'plait'],
  },
  sceneCaption: 'Am Ende des Essens bittest du das Personal höflich um die Rechnung.',
  trophyWord: {
    word: 'addition',
    meaning: 'Rechnung im Restaurant',
    example: "L'addition, s'il vous plaît.",
    whyThisWord: 'Addition ist im Restaurant die Rechnung, nicht eine Rechenaufgabe im deutschen Sinn. Wegen des Vokals steht korrekt "l’addition", nicht "la addition".',
  },
  placeholderMedia: {
    type: 'video',
    caption: 'Restauranttisch am Ende des Essens, kurze Bitte um die Rechnung.',
  },
  songSeed: {
    genre: 'soft bistro acoustic',
    mood: 'ending the meal',
  },
  visualNotes: 'Rechnungsschale, Tischkante, höflicher Abschluss.',
}

export const GUIDED_LESSONS: GuidedLessonDefinition[] = [
  {
    id: "english-a1-practical-001-first-contact",
    pathId: GUIDED_TODAY_PATH_ONE_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_ONE_METADATA.title,
    level: GUIDED_TODAY_PATH_ONE_METADATA.level,
    lessonNumber: 1,
    baseLanguage: GUIDED_TODAY_PATH_ONE_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_ONE_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_ONE_METADATA,
    lessonMetadata: {
      id: "english-a1-practical-001-first-contact",
      sequence: 1,
      title: "First contact",
    },
    title: "First contact",
    situation: {
      en: "In a cafe, ask whether someone speaks English.",
      de: "Im Café fragst du, ob jemand Englisch spricht.",
    },
    pedagogicalGoal: "Ask whether someone speaks English before continuing a conversation, using one short A1-safe English phrase.",
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: "Polite follow-up",
      situation: "Im Café bittest du jemanden, etwas noch einmal oder langsamer zu sagen.",
    },
    vibeVariants: {
      bright: brightLesson001,
      wistful: wistfulLesson001,
      sharp: sharpLesson001,
    },
  },
  {
    id: "english-a1-practical-002-polite-follow-up",
    pathId: GUIDED_TODAY_PATH_ONE_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_ONE_METADATA.title,
    level: GUIDED_TODAY_PATH_ONE_METADATA.level,
    lessonNumber: 2,
    baseLanguage: GUIDED_TODAY_PATH_ONE_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_ONE_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_ONE_METADATA,
    lessonMetadata: {
      id: "english-a1-practical-002-polite-follow-up",
      sequence: 2,
      title: "Polite follow-up",
    },
    title: "Polite follow-up",
    situation: {
      en: "In a cafe, ask someone to repeat or slow down.",
      de: "Im Café bittest du jemanden, etwas noch einmal oder langsamer zu sagen.",
    },
    pedagogicalGoal: "Recover politely when speech is too fast by asking for repetition or slower delivery.",
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: "Where is...?",
      situation: "Auf der Straße fragst du nach dem Bahnhof oder einer Richtung.",
    },
    vibeVariants: {
      bright: brightLesson002,
      wistful: wistfulLesson002,
      sharp: sharpLesson002,
    },
  },
  {
    id: "english-a1-practical-003-where-is",
    pathId: GUIDED_TODAY_PATH_ONE_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_ONE_METADATA.title,
    level: GUIDED_TODAY_PATH_ONE_METADATA.level,
    lessonNumber: 3,
    baseLanguage: GUIDED_TODAY_PATH_ONE_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_ONE_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_ONE_METADATA,
    lessonMetadata: {
      id: "english-a1-practical-003-where-is",
      sequence: 3,
      title: "Where is...?",
    },
    title: "Where is...?",
    situation: {
      en: "On the street, ask for the station or a direction.",
      de: "Auf der Straße fragst du nach dem Bahnhof oder einer Richtung.",
    },
    pedagogicalGoal: "Ask a simple where-question for directions and recognize core direction words.",
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: "I'd like...",
      situation: "Im Café oder Restaurant bestellst du ein einfaches Getränk.",
    },
    vibeVariants: {
      bright: brightLesson003,
      wistful: wistfulLesson003,
      sharp: sharpLesson003,
    },
  },
  {
    id: "english-a1-practical-004-id-like",
    pathId: GUIDED_TODAY_PATH_ONE_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_ONE_METADATA.title,
    level: GUIDED_TODAY_PATH_ONE_METADATA.level,
    lessonNumber: 4,
    baseLanguage: GUIDED_TODAY_PATH_ONE_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_ONE_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_ONE_METADATA,
    lessonMetadata: {
      id: "english-a1-practical-004-id-like",
      sequence: 4,
      title: "I'd like...",
    },
    title: "I'd like...",
    situation: {
      en: "In a cafe or restaurant, order a simple drink.",
      de: "Im Café oder Restaurant bestellst du ein einfaches Getränk.",
    },
    pedagogicalGoal: "Make a short A1 order with a clear item and basic courtesy.",
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: "How much?",
      situation: "Im Laden fragst du nach einem Preis.",
    },
    vibeVariants: {
      bright: brightLesson004,
      wistful: wistfulLesson004,
      sharp: sharpLesson004,
    },
  },
  {
    id: "english-a1-practical-005-how-much",
    pathId: GUIDED_TODAY_PATH_ONE_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_ONE_METADATA.title,
    level: GUIDED_TODAY_PATH_ONE_METADATA.level,
    lessonNumber: 5,
    baseLanguage: GUIDED_TODAY_PATH_ONE_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_ONE_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_ONE_METADATA,
    lessonMetadata: {
      id: "english-a1-practical-005-how-much",
      sequence: 5,
      title: "How much?",
    },
    title: "How much?",
    situation: {
      en: "In a shop, ask about a price.",
      de: "Im Laden fragst du nach einem Preis.",
    },
    pedagogicalGoal: "Ask a simple price question and connect it to the item in front of you.",
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: "The train",
      situation: "Am Bahnhof fragst du nach Uhrzeit oder Bahnsteig.",
    },
    vibeVariants: {
      bright: brightLesson005,
      wistful: wistfulLesson005,
      sharp: sharpLesson005,
    },
  },
  {
    id: "english-a1-practical-006-the-train",
    pathId: GUIDED_TODAY_PATH_ONE_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_ONE_METADATA.title,
    level: GUIDED_TODAY_PATH_ONE_METADATA.level,
    lessonNumber: 6,
    baseLanguage: GUIDED_TODAY_PATH_ONE_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_ONE_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_ONE_METADATA,
    lessonMetadata: {
      id: "english-a1-practical-006-the-train",
      sequence: 6,
      title: "The train",
    },
    title: "The train",
    situation: {
      en: "At a station, ask about train time or platform.",
      de: "Am Bahnhof fragst du nach Uhrzeit oder Bahnsteig.",
    },
    pedagogicalGoal: "Ask for essential train information with short time and platform language.",
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: "I need...",
      situation: "In der Apotheke oder am Infoschalter bittest du um Hilfe.",
    },
    vibeVariants: {
      bright: brightLesson006,
      wistful: wistfulLesson006,
      sharp: sharpLesson006,
    },
  },
  {
    id: "english-a1-practical-007-i-need",
    pathId: GUIDED_TODAY_PATH_ONE_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_ONE_METADATA.title,
    level: GUIDED_TODAY_PATH_ONE_METADATA.level,
    lessonNumber: 7,
    baseLanguage: GUIDED_TODAY_PATH_ONE_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_ONE_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_ONE_METADATA,
    lessonMetadata: {
      id: "english-a1-practical-007-i-need",
      sequence: 7,
      title: "I need...",
    },
    title: "I need...",
    situation: {
      en: "At a pharmacy or help desk, ask for help.",
      de: "In der Apotheke oder am Infoschalter bittest du um Hilfe.",
    },
    pedagogicalGoal: "State a basic need for help in a practical service situation.",
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: "I like...",
      situation: "Im Small Talk sagst du etwas Einfaches über einen Ort.",
    },
    vibeVariants: {
      bright: brightLesson007,
      wistful: wistfulLesson007,
      sharp: sharpLesson007,
    },
  },
  {
    id: "english-a1-practical-008-i-like",
    pathId: GUIDED_TODAY_PATH_ONE_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_ONE_METADATA.title,
    level: GUIDED_TODAY_PATH_ONE_METADATA.level,
    lessonNumber: 8,
    baseLanguage: GUIDED_TODAY_PATH_ONE_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_ONE_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_ONE_METADATA,
    lessonMetadata: {
      id: "english-a1-practical-008-i-like",
      sequence: 8,
      title: "I like...",
    },
    title: "I like...",
    situation: {
      en: "In small talk, say something simple about a place.",
      de: "Im Small Talk sagst du etwas Einfaches über einen Ort.",
    },
    pedagogicalGoal: "Make a short positive comment about a place using A1 small-talk language.",
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: "Tomorrow at seven",
      situation: "Beim Planen bestätigst du morgen um sieben.",
    },
    vibeVariants: {
      bright: brightLesson008,
      wistful: wistfulLesson008,
      sharp: sharpLesson008,
    },
  },
  {
    id: "english-a1-practical-009-tomorrow-at-seven",
    pathId: GUIDED_TODAY_PATH_ONE_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_ONE_METADATA.title,
    level: GUIDED_TODAY_PATH_ONE_METADATA.level,
    lessonNumber: 9,
    baseLanguage: GUIDED_TODAY_PATH_ONE_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_ONE_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_ONE_METADATA,
    lessonMetadata: {
      id: "english-a1-practical-009-tomorrow-at-seven",
      sequence: 9,
      title: "Tomorrow at seven",
    },
    title: "Tomorrow at seven",
    situation: {
      en: "When making plans, confirm tomorrow at seven.",
      de: "Beim Planen bestätigst du morgen um sieben.",
    },
    pedagogicalGoal: "Confirm a simple future plan with day and time language.",
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: "Thank you, goodbye",
      situation: "Du schließt die Szene mit Dank und Abschied ab.",
    },
    vibeVariants: {
      bright: brightLesson009,
      wistful: wistfulLesson009,
      sharp: sharpLesson009,
    },
  },
  {
    id: "english-a1-practical-010-thank-you-goodbye",
    pathId: GUIDED_TODAY_PATH_ONE_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_ONE_METADATA.title,
    level: GUIDED_TODAY_PATH_ONE_METADATA.level,
    lessonNumber: 10,
    baseLanguage: GUIDED_TODAY_PATH_ONE_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_ONE_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_ONE_METADATA,
    lessonMetadata: {
      id: "english-a1-practical-010-thank-you-goodbye",
      sequence: 10,
      title: "Thank you, goodbye",
    },
    title: "Thank you, goodbye",
    situation: {
      en: "Close the scene by thanking someone and saying goodbye.",
      de: "Du schließt die Szene mit Dank und Abschied ab.",
    },
    pedagogicalGoal: "End a practical interaction with a short thank-you and goodbye phrase.",
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: "Guided Today Path Overview V1",
      situation: "Wiederhole die zehn praktischen A1-Szenen und wähle die nächste Lektion.",
    },
    vibeVariants: {
      bright: brightLesson010,
      wistful: wistfulLesson010,
      sharp: sharpLesson010,
    },
  },
  ...a1Practical2Lessons,
  ...a1Practical3Lessons,
  ...a1Practical4Lessons,
  ...a1Practical5Lessons,
  ...a1Practical6Lessons,
  ...a1Practical7Lessons,
  ...a1Practical8Lessons,
  ...a1Practical9Lessons,
  ...a1Practical10Lessons,
  {
    id: 'spanish-a1-practical-001-primer-contacto',
    pathId: GUIDED_TODAY_PATH_SPANISH_ONE_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_SPANISH_ONE_METADATA.title,
    level: GUIDED_TODAY_PATH_SPANISH_ONE_METADATA.level,
    lessonNumber: 1,
    baseLanguage: GUIDED_TODAY_PATH_SPANISH_ONE_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_SPANISH_ONE_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_SPANISH_ONE_METADATA,
    lessonMetadata: {
      id: 'spanish-a1-practical-001-primer-contacto',
      sequence: 1,
      title: 'Erster Kontakt',
    },
    title: 'Erster Kontakt',
    situation: {
      en: 'At a Spanish café counter, ask politely whether the other speaks Spanish.',
      de: 'Im Café fragst du höflich, ob jemand Spanisch spricht.',
    },
    pedagogicalGoal: 'Eine höfliche Einstiegsfrage auf Spanisch stellen, bevor das Gespräch weitergeht.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Höfliche Rückfrage',
      situation: 'Du bittest jemanden, das Gesagte zu wiederholen.',
    },
    vibeVariants: {
      bright: brightSpanishLesson001,
    },
  },
  {
    id: 'spanish-a1-practical-002-pedir-repeticion',
    pathId: GUIDED_TODAY_PATH_SPANISH_ONE_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_SPANISH_ONE_METADATA.title,
    level: GUIDED_TODAY_PATH_SPANISH_ONE_METADATA.level,
    lessonNumber: 2,
    baseLanguage: GUIDED_TODAY_PATH_SPANISH_ONE_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_SPANISH_ONE_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_SPANISH_ONE_METADATA,
    lessonMetadata: {
      id: 'spanish-a1-practical-002-pedir-repeticion',
      sequence: 2,
      title: 'Höfliche Rückfrage',
    },
    title: 'Höfliche Rückfrage',
    situation: {
      en: 'Mid-exchange, politely ask the other to repeat what they said.',
      de: 'Mitten im Gespräch bittest du jemanden, etwas zu wiederholen.',
    },
    pedagogicalGoal: 'Höflich signalisieren, dass etwas wiederholt werden soll, ohne das Gespräch zu blockieren.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Wo ist...?',
      situation: 'Auf der Straße fragst du nach dem Bahnhof.',
    },
    vibeVariants: {
      bright: brightSpanishLesson002,
    },
  },
  {
    id: 'spanish-a1-practical-003-donde-esta',
    pathId: GUIDED_TODAY_PATH_SPANISH_ONE_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_SPANISH_ONE_METADATA.title,
    level: GUIDED_TODAY_PATH_SPANISH_ONE_METADATA.level,
    lessonNumber: 3,
    baseLanguage: GUIDED_TODAY_PATH_SPANISH_ONE_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_SPANISH_ONE_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_SPANISH_ONE_METADATA,
    lessonMetadata: {
      id: 'spanish-a1-practical-003-donde-esta',
      sequence: 3,
      title: 'Wo ist...?',
    },
    title: 'Wo ist...?',
    situation: {
      en: 'On the street, ask politely where the station is.',
      de: 'Auf der Straße fragst du höflich nach dem Bahnhof.',
    },
    pedagogicalGoal: 'Eine einfache Ortsfrage auf Spanisch stellen und ein konkretes Ziel benennen.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Einen Kaffee, bitte',
      situation: 'Am Tresen bestellst du einen Kaffee.',
    },
    vibeVariants: {
      bright: brightSpanishLesson003,
    },
  },
  {
    id: 'spanish-a1-practical-004-un-cafe',
    pathId: GUIDED_TODAY_PATH_SPANISH_ONE_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_SPANISH_ONE_METADATA.title,
    level: GUIDED_TODAY_PATH_SPANISH_ONE_METADATA.level,
    lessonNumber: 4,
    baseLanguage: GUIDED_TODAY_PATH_SPANISH_ONE_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_SPANISH_ONE_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_SPANISH_ONE_METADATA,
    lessonMetadata: {
      id: 'spanish-a1-practical-004-un-cafe',
      sequence: 4,
      title: 'Einen Kaffee, bitte',
    },
    title: 'Einen Kaffee, bitte',
    situation: {
      en: 'At a Spanish café counter, order a coffee politely.',
      de: 'Am Café-Tresen bestellst du einen Kaffee.',
    },
    pedagogicalGoal: 'Eine kurze, klare Bestellung auf Spanisch mit Höflichkeitswort abgeben.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Was kostet das?',
      situation: 'Im Laden fragst du nach dem Preis.',
    },
    vibeVariants: {
      bright: brightSpanishLesson004,
    },
  },
  {
    id: 'spanish-a1-practical-005-cuanto-cuesta',
    pathId: GUIDED_TODAY_PATH_SPANISH_ONE_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_SPANISH_ONE_METADATA.title,
    level: GUIDED_TODAY_PATH_SPANISH_ONE_METADATA.level,
    lessonNumber: 5,
    baseLanguage: GUIDED_TODAY_PATH_SPANISH_ONE_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_SPANISH_ONE_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_SPANISH_ONE_METADATA,
    lessonMetadata: {
      id: 'spanish-a1-practical-005-cuanto-cuesta',
      sequence: 5,
      title: 'Was kostet das?',
    },
    title: 'Was kostet das?',
    situation: {
      en: 'In a small shop, ask the price of an item.',
      de: 'Im kleinen Laden fragst du nach dem Preis eines Gegenstands.',
    },
    pedagogicalGoal: 'Eine direkte Preisfrage auf Spanisch stellen und auf den Gegenstand vor dir beziehen.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Am Bahnhof',
      situation: 'Am Bahnhof fragst du nach der Abfahrtszeit.',
    },
    vibeVariants: {
      bright: brightSpanishLesson005,
    },
  },
  {
    id: 'spanish-a1-practical-006-el-tren',
    pathId: GUIDED_TODAY_PATH_SPANISH_ONE_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_SPANISH_ONE_METADATA.title,
    level: GUIDED_TODAY_PATH_SPANISH_ONE_METADATA.level,
    lessonNumber: 6,
    baseLanguage: GUIDED_TODAY_PATH_SPANISH_ONE_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_SPANISH_ONE_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_SPANISH_ONE_METADATA,
    lessonMetadata: {
      id: 'spanish-a1-practical-006-el-tren',
      sequence: 6,
      title: 'Am Bahnhof',
    },
    title: 'Am Bahnhof',
    situation: {
      en: 'At a station info desk, ask when the train leaves.',
      de: 'Am Bahnhofs-Schalter fragst du nach der Abfahrtszeit.',
    },
    pedagogicalGoal: 'Eine kurze Reisefrage auf Spanisch stellen, mit Uhrzeit- und Verkehrsmittelwortschatz.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Ich brauche Hilfe',
      situation: 'In der Apotheke oder am Schalter bittest du um Hilfe.',
    },
    vibeVariants: {
      bright: brightSpanishLesson006,
    },
  },
  {
    id: 'spanish-a1-practical-007-necesito-ayuda',
    pathId: GUIDED_TODAY_PATH_SPANISH_ONE_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_SPANISH_ONE_METADATA.title,
    level: GUIDED_TODAY_PATH_SPANISH_ONE_METADATA.level,
    lessonNumber: 7,
    baseLanguage: GUIDED_TODAY_PATH_SPANISH_ONE_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_SPANISH_ONE_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_SPANISH_ONE_METADATA,
    lessonMetadata: {
      id: 'spanish-a1-practical-007-necesito-ayuda',
      sequence: 7,
      title: 'Ich brauche Hilfe',
    },
    title: 'Ich brauche Hilfe',
    situation: {
      en: 'At a pharmacy or info desk, ask for help politely.',
      de: 'In der Apotheke oder am Schalter bittest du um Hilfe.',
    },
    pedagogicalGoal: 'Eine kurze, höfliche Bitte um Hilfe auf Spanisch formulieren.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Es gefällt mir',
      situation: 'Beim Small Talk sagst du etwas Nettes über den Ort.',
    },
    vibeVariants: {
      bright: brightSpanishLesson007,
    },
  },
  {
    id: 'spanish-a1-practical-008-me-gusta-este-sitio',
    pathId: GUIDED_TODAY_PATH_SPANISH_ONE_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_SPANISH_ONE_METADATA.title,
    level: GUIDED_TODAY_PATH_SPANISH_ONE_METADATA.level,
    lessonNumber: 8,
    baseLanguage: GUIDED_TODAY_PATH_SPANISH_ONE_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_SPANISH_ONE_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_SPANISH_ONE_METADATA,
    lessonMetadata: {
      id: 'spanish-a1-practical-008-me-gusta-este-sitio',
      sequence: 8,
      title: 'Es gefällt mir',
    },
    title: 'Es gefällt mir',
    situation: {
      en: 'Inside a café, make a short positive remark about the place.',
      de: 'Im Café sagst du locker etwas Nettes über den Ort.',
    },
    pedagogicalGoal: 'Einen kurzen, positiven Small-Talk-Satz auf Spanisch zum aktuellen Ort äußern.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Morgen um sieben',
      situation: 'Beim Planen bestätigst du den Termin für morgen.',
    },
    vibeVariants: {
      bright: brightSpanishLesson008,
    },
  },
  {
    id: 'spanish-a1-practical-009-manana-a-las-siete',
    pathId: GUIDED_TODAY_PATH_SPANISH_ONE_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_SPANISH_ONE_METADATA.title,
    level: GUIDED_TODAY_PATH_SPANISH_ONE_METADATA.level,
    lessonNumber: 9,
    baseLanguage: GUIDED_TODAY_PATH_SPANISH_ONE_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_SPANISH_ONE_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_SPANISH_ONE_METADATA,
    lessonMetadata: {
      id: 'spanish-a1-practical-009-manana-a-las-siete',
      sequence: 9,
      title: 'Morgen um sieben',
    },
    title: 'Morgen um sieben',
    situation: {
      en: 'At the end of an encounter, confirm a plan for tomorrow at seven.',
      de: 'Am Ende der Begegnung bestätigst du den Termin morgen um sieben.',
    },
    pedagogicalGoal: 'Einen einfachen Plan auf Spanisch mit Tag und Uhrzeit bestätigen.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Danke und Auf Wiedersehen',
      situation: 'Du schließt die Szene mit Dank und Abschied ab.',
    },
    vibeVariants: {
      bright: brightSpanishLesson009,
    },
  },
  {
    id: 'spanish-a1-practical-010-gracias-adios',
    pathId: GUIDED_TODAY_PATH_SPANISH_ONE_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_SPANISH_ONE_METADATA.title,
    level: GUIDED_TODAY_PATH_SPANISH_ONE_METADATA.level,
    lessonNumber: 10,
    baseLanguage: GUIDED_TODAY_PATH_SPANISH_ONE_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_SPANISH_ONE_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_SPANISH_ONE_METADATA,
    lessonMetadata: {
      id: 'spanish-a1-practical-010-gracias-adios',
      sequence: 10,
      title: 'Danke und Auf Wiedersehen',
    },
    title: 'Danke und Auf Wiedersehen',
    situation: {
      en: 'Close the scene with thanks and a polite goodbye.',
      de: 'Du schließt die Szene mit Dank und einem freundlichen Abschied ab.',
    },
    pedagogicalGoal: 'Eine kurze Dank-und-Abschied-Wendung auf Spanisch sicher abrufen.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Pfad abgeschlossen',
      situation: 'Du hast Spanish A1 Practical 1 abgeschlossen.',
    },
    vibeVariants: {
      bright: brightSpanishLesson010,
    },
  },
  {
    id: 'italian-a1-practical-001-primo-contatto',
    pathId: GUIDED_TODAY_PATH_ITALIAN_ONE_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_ITALIAN_ONE_METADATA.title,
    level: GUIDED_TODAY_PATH_ITALIAN_ONE_METADATA.level,
    lessonNumber: 1,
    baseLanguage: GUIDED_TODAY_PATH_ITALIAN_ONE_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_ITALIAN_ONE_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_ITALIAN_ONE_METADATA,
    lessonMetadata: {
      id: 'italian-a1-practical-001-primo-contatto',
      sequence: 1,
      title: 'Erster Kontakt',
    },
    title: 'Erster Kontakt',
    situation: {
      en: 'At an Italian café counter, ask politely whether the other speaks Italian.',
      de: 'Im Café fragst du höflich, ob jemand Italienisch spricht.',
    },
    pedagogicalGoal: 'Eine höfliche Einstiegsfrage auf Italienisch stellen, bevor das Gespräch weitergeht.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Höfliche Rückfrage',
      situation: 'Du bittest jemanden, das Gesagte zu wiederholen.',
    },
    vibeVariants: {
      bright: brightItalianLesson001,
    },
  },
  {
    id: 'italian-a1-practical-002-chiedere-ripetere',
    pathId: GUIDED_TODAY_PATH_ITALIAN_ONE_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_ITALIAN_ONE_METADATA.title,
    level: GUIDED_TODAY_PATH_ITALIAN_ONE_METADATA.level,
    lessonNumber: 2,
    baseLanguage: GUIDED_TODAY_PATH_ITALIAN_ONE_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_ITALIAN_ONE_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_ITALIAN_ONE_METADATA,
    lessonMetadata: {
      id: 'italian-a1-practical-002-chiedere-ripetere',
      sequence: 2,
      title: 'Höfliche Rückfrage',
    },
    title: 'Höfliche Rückfrage',
    situation: {
      en: 'Mid-exchange, politely ask the other to repeat what they said.',
      de: 'Mitten im Gespräch bittest du jemanden, etwas zu wiederholen.',
    },
    pedagogicalGoal: 'Höflich signalisieren, dass etwas wiederholt werden soll, ohne das Gespräch zu blockieren.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Wo ist...?',
      situation: 'Auf der Straße fragst du nach dem Bahnhof.',
    },
    vibeVariants: {
      bright: brightItalianLesson002,
    },
  },
  {
    id: 'italian-a1-practical-003-dov-e',
    pathId: GUIDED_TODAY_PATH_ITALIAN_ONE_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_ITALIAN_ONE_METADATA.title,
    level: GUIDED_TODAY_PATH_ITALIAN_ONE_METADATA.level,
    lessonNumber: 3,
    baseLanguage: GUIDED_TODAY_PATH_ITALIAN_ONE_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_ITALIAN_ONE_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_ITALIAN_ONE_METADATA,
    lessonMetadata: {
      id: 'italian-a1-practical-003-dov-e',
      sequence: 3,
      title: 'Wo ist...?',
    },
    title: 'Wo ist...?',
    situation: {
      en: 'On the street, ask politely where the station is.',
      de: 'Auf der Straße fragst du höflich nach dem Bahnhof.',
    },
    pedagogicalGoal: 'Eine einfache Ortsfrage auf Italienisch stellen und ein konkretes Ziel benennen.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Einen Kaffee, bitte',
      situation: 'Am Tresen bestellst du einen Kaffee.',
    },
    vibeVariants: {
      bright: brightItalianLesson003,
    },
  },
  {
    id: 'italian-a1-practical-004-un-caffe',
    pathId: GUIDED_TODAY_PATH_ITALIAN_ONE_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_ITALIAN_ONE_METADATA.title,
    level: GUIDED_TODAY_PATH_ITALIAN_ONE_METADATA.level,
    lessonNumber: 4,
    baseLanguage: GUIDED_TODAY_PATH_ITALIAN_ONE_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_ITALIAN_ONE_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_ITALIAN_ONE_METADATA,
    lessonMetadata: {
      id: 'italian-a1-practical-004-un-caffe',
      sequence: 4,
      title: 'Einen Kaffee, bitte',
    },
    title: 'Einen Kaffee, bitte',
    situation: {
      en: 'At an Italian café counter, order a coffee politely with "vorrei".',
      de: 'Am Café-Tresen bestellst du höflich einen Kaffee mit "vorrei".',
    },
    pedagogicalGoal: 'Eine kurze, klare Bestellung auf Italienisch mit Konditional und Höflichkeitswort abgeben.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Was kostet das?',
      situation: 'Im Laden fragst du nach dem Preis.',
    },
    vibeVariants: {
      bright: brightItalianLesson004,
    },
  },
  {
    id: 'italian-a1-practical-005-quanto-costa',
    pathId: GUIDED_TODAY_PATH_ITALIAN_ONE_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_ITALIAN_ONE_METADATA.title,
    level: GUIDED_TODAY_PATH_ITALIAN_ONE_METADATA.level,
    lessonNumber: 5,
    baseLanguage: GUIDED_TODAY_PATH_ITALIAN_ONE_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_ITALIAN_ONE_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_ITALIAN_ONE_METADATA,
    lessonMetadata: {
      id: 'italian-a1-practical-005-quanto-costa',
      sequence: 5,
      title: 'Was kostet das?',
    },
    title: 'Was kostet das?',
    situation: {
      en: 'In a small shop, ask the price of an item.',
      de: 'Im kleinen Laden fragst du nach dem Preis eines Gegenstands.',
    },
    pedagogicalGoal: 'Eine direkte Preisfrage auf Italienisch stellen und auf den Gegenstand vor dir beziehen.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Am Bahnhof',
      situation: 'Am Bahnhof fragst du nach der Abfahrtszeit.',
    },
    vibeVariants: {
      bright: brightItalianLesson005,
    },
  },
  {
    id: 'italian-a1-practical-006-il-treno',
    pathId: GUIDED_TODAY_PATH_ITALIAN_ONE_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_ITALIAN_ONE_METADATA.title,
    level: GUIDED_TODAY_PATH_ITALIAN_ONE_METADATA.level,
    lessonNumber: 6,
    baseLanguage: GUIDED_TODAY_PATH_ITALIAN_ONE_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_ITALIAN_ONE_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_ITALIAN_ONE_METADATA,
    lessonMetadata: {
      id: 'italian-a1-practical-006-il-treno',
      sequence: 6,
      title: 'Am Bahnhof',
    },
    title: 'Am Bahnhof',
    situation: {
      en: 'At a station info desk, ask when the train leaves.',
      de: 'Am Bahnhofs-Schalter fragst du nach der Abfahrtszeit.',
    },
    pedagogicalGoal: 'Eine kurze Reisefrage auf Italienisch stellen, mit Uhrzeit- und Verkehrsmittelwortschatz.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Ich brauche Hilfe',
      situation: 'In der Apotheke oder am Schalter bittest du um Hilfe.',
    },
    vibeVariants: {
      bright: brightItalianLesson006,
    },
  },
  {
    id: 'italian-a1-practical-007-ho-bisogno-di-aiuto',
    pathId: GUIDED_TODAY_PATH_ITALIAN_ONE_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_ITALIAN_ONE_METADATA.title,
    level: GUIDED_TODAY_PATH_ITALIAN_ONE_METADATA.level,
    lessonNumber: 7,
    baseLanguage: GUIDED_TODAY_PATH_ITALIAN_ONE_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_ITALIAN_ONE_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_ITALIAN_ONE_METADATA,
    lessonMetadata: {
      id: 'italian-a1-practical-007-ho-bisogno-di-aiuto',
      sequence: 7,
      title: 'Ich brauche Hilfe',
    },
    title: 'Ich brauche Hilfe',
    situation: {
      en: 'At a pharmacy or info desk, ask for help politely.',
      de: 'In der Apotheke oder am Schalter bittest du um Hilfe.',
    },
    pedagogicalGoal: 'Eine kurze, höfliche Bitte um Hilfe auf Italienisch formulieren.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Es gefällt mir',
      situation: 'Beim Small Talk sagst du etwas Nettes über den Ort.',
    },
    vibeVariants: {
      bright: brightItalianLesson007,
    },
  },
  {
    id: 'italian-a1-practical-008-mi-piace-questo-posto',
    pathId: GUIDED_TODAY_PATH_ITALIAN_ONE_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_ITALIAN_ONE_METADATA.title,
    level: GUIDED_TODAY_PATH_ITALIAN_ONE_METADATA.level,
    lessonNumber: 8,
    baseLanguage: GUIDED_TODAY_PATH_ITALIAN_ONE_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_ITALIAN_ONE_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_ITALIAN_ONE_METADATA,
    lessonMetadata: {
      id: 'italian-a1-practical-008-mi-piace-questo-posto',
      sequence: 8,
      title: 'Es gefällt mir',
    },
    title: 'Es gefällt mir',
    situation: {
      en: 'Inside a café, make a short positive remark about the place.',
      de: 'Im Café sagst du locker etwas Nettes über den Ort.',
    },
    pedagogicalGoal: 'Einen kurzen, positiven Small-Talk-Satz auf Italienisch zum aktuellen Ort äußern.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Morgen um sieben',
      situation: 'Beim Planen bestätigst du den Termin für morgen.',
    },
    vibeVariants: {
      bright: brightItalianLesson008,
    },
  },
  {
    id: 'italian-a1-practical-009-domani-alle-sette',
    pathId: GUIDED_TODAY_PATH_ITALIAN_ONE_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_ITALIAN_ONE_METADATA.title,
    level: GUIDED_TODAY_PATH_ITALIAN_ONE_METADATA.level,
    lessonNumber: 9,
    baseLanguage: GUIDED_TODAY_PATH_ITALIAN_ONE_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_ITALIAN_ONE_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_ITALIAN_ONE_METADATA,
    lessonMetadata: {
      id: 'italian-a1-practical-009-domani-alle-sette',
      sequence: 9,
      title: 'Morgen um sieben',
    },
    title: 'Morgen um sieben',
    situation: {
      en: 'At the end of an encounter, confirm a plan for tomorrow at seven.',
      de: 'Am Ende der Begegnung bestätigst du den Termin morgen um sieben.',
    },
    pedagogicalGoal: 'Einen einfachen Plan auf Italienisch mit Tag und Uhrzeit bestätigen.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Danke und Auf Wiedersehen',
      situation: 'Du schließt die Szene mit Dank und Abschied ab.',
    },
    vibeVariants: {
      bright: brightItalianLesson009,
    },
  },
  {
    id: 'italian-a1-practical-010-grazie-arrivederci',
    pathId: GUIDED_TODAY_PATH_ITALIAN_ONE_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_ITALIAN_ONE_METADATA.title,
    level: GUIDED_TODAY_PATH_ITALIAN_ONE_METADATA.level,
    lessonNumber: 10,
    baseLanguage: GUIDED_TODAY_PATH_ITALIAN_ONE_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_ITALIAN_ONE_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_ITALIAN_ONE_METADATA,
    lessonMetadata: {
      id: 'italian-a1-practical-010-grazie-arrivederci',
      sequence: 10,
      title: 'Danke und Auf Wiedersehen',
    },
    title: 'Danke und Auf Wiedersehen',
    situation: {
      en: 'Close the scene with thanks and a polite goodbye.',
      de: 'Du schließt die Szene mit Dank und einem freundlichen Abschied ab.',
    },
    pedagogicalGoal: 'Eine kurze Dank-und-Abschied-Wendung auf Italienisch sicher abrufen.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Pfad abgeschlossen',
      situation: 'Du hast Italian A1 Practical 1 abgeschlossen.',
    },
    vibeVariants: {
      bright: brightItalianLesson010,
    },
  },
  {
    id: 'italian-a1-practical-2-lesson-1-non-capisco',
    pathId: GUIDED_TODAY_PATH_ITALIAN_TWO_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_ITALIAN_TWO_METADATA.title,
    level: GUIDED_TODAY_PATH_ITALIAN_TWO_METADATA.level,
    lessonNumber: 1,
    baseLanguage: GUIDED_TODAY_PATH_ITALIAN_TWO_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_ITALIAN_TWO_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_ITALIAN_TWO_METADATA,
    lessonMetadata: {
      id: 'italian-a1-practical-2-lesson-1-non-capisco',
      sequence: 1,
      title: 'Ich verstehe nicht',
    },
    title: 'Ich verstehe nicht',
    situation: {
      en: 'Mid-exchange, admit you do not understand and ask for help.',
      de: 'Mitten im Gespräch gibst du zu, dass du etwas nicht verstanden hast, und bittest um Hilfe.',
    },
    pedagogicalGoal: 'Höflich Verständnis-Schwierigkeit zugeben und eine offene Bitte um Hilfe formulieren.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Bitte aufschreiben',
      situation: 'Du bittest, etwas aufzuschreiben.',
    },
    vibeVariants: {
      bright: brightItalianP2Lesson001,
    },
  },
  {
    id: 'italian-a1-practical-2-lesson-2-scriverlo',
    pathId: GUIDED_TODAY_PATH_ITALIAN_TWO_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_ITALIAN_TWO_METADATA.title,
    level: GUIDED_TODAY_PATH_ITALIAN_TWO_METADATA.level,
    lessonNumber: 2,
    baseLanguage: GUIDED_TODAY_PATH_ITALIAN_TWO_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_ITALIAN_TWO_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_ITALIAN_TWO_METADATA,
    lessonMetadata: {
      id: 'italian-a1-practical-2-lesson-2-scriverlo',
      sequence: 2,
      title: 'Bitte aufschreiben',
    },
    title: 'Bitte aufschreiben',
    situation: {
      en: 'Ask politely that the information be written down.',
      de: 'Du bittest höflich, eine Information aufzuschreiben.',
    },
    pedagogicalGoal: 'Eine konkrete Schreib-Bitte auf Italienisch sicher äußern.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Auf der Karte zeigen',
      situation: 'Du bittest, einen Ort auf der Karte zu zeigen.',
    },
    vibeVariants: {
      bright: brightItalianP2Lesson002,
    },
  },
  {
    id: 'italian-a1-practical-2-lesson-3-sulla-mappa',
    pathId: GUIDED_TODAY_PATH_ITALIAN_TWO_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_ITALIAN_TWO_METADATA.title,
    level: GUIDED_TODAY_PATH_ITALIAN_TWO_METADATA.level,
    lessonNumber: 3,
    baseLanguage: GUIDED_TODAY_PATH_ITALIAN_TWO_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_ITALIAN_TWO_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_ITALIAN_TWO_METADATA,
    lessonMetadata: {
      id: 'italian-a1-practical-2-lesson-3-sulla-mappa',
      sequence: 3,
      title: 'Auf der Karte zeigen',
    },
    title: 'Auf der Karte zeigen',
    situation: {
      en: 'Ask someone to show a location on a map or phone.',
      de: 'Du bittest, einen Ort auf der Karte oder dem Handy zu zeigen.',
    },
    pedagogicalGoal: 'Eine Zeige-Bitte auf Italienisch mit konkretem Hilfsmittel formulieren.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Dies oder das?',
      situation: 'Du fragst, welche von zwei sichtbaren Möglichkeiten es sein soll.',
    },
    vibeVariants: {
      bright: brightItalianP2Lesson003,
    },
  },
  {
    id: 'italian-a1-practical-2-lesson-4-questo-o-quello',
    pathId: GUIDED_TODAY_PATH_ITALIAN_TWO_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_ITALIAN_TWO_METADATA.title,
    level: GUIDED_TODAY_PATH_ITALIAN_TWO_METADATA.level,
    lessonNumber: 4,
    baseLanguage: GUIDED_TODAY_PATH_ITALIAN_TWO_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_ITALIAN_TWO_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_ITALIAN_TWO_METADATA,
    lessonMetadata: {
      id: 'italian-a1-practical-2-lesson-4-questo-o-quello',
      sequence: 4,
      title: 'Dies oder das?',
    },
    title: 'Dies oder das?',
    situation: {
      en: 'At a counter, ask which of two visible items is meant.',
      de: 'Am Tresen fragst du, welches von zwei sichtbaren Stücken gemeint ist.',
    },
    pedagogicalGoal: 'Eine binäre Wahlfrage mit italienischen Demonstrativen sicher stellen.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Ist es verfügbar?',
      situation: 'Du fragst, ob etwas noch zu haben ist.',
    },
    vibeVariants: {
      bright: brightItalianP2Lesson004,
    },
  },
  {
    id: 'italian-a1-practical-2-lesson-5-disponibile',
    pathId: GUIDED_TODAY_PATH_ITALIAN_TWO_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_ITALIAN_TWO_METADATA.title,
    level: GUIDED_TODAY_PATH_ITALIAN_TWO_METADATA.level,
    lessonNumber: 5,
    baseLanguage: GUIDED_TODAY_PATH_ITALIAN_TWO_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_ITALIAN_TWO_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_ITALIAN_TWO_METADATA,
    lessonMetadata: {
      id: 'italian-a1-practical-2-lesson-5-disponibile',
      sequence: 5,
      title: 'Ist es verfügbar?',
    },
    title: 'Ist es verfügbar?',
    situation: {
      en: 'In a small shop, ask whether an item is available.',
      de: 'Im kleinen Laden fragst du, ob etwas noch zu haben ist.',
    },
    pedagogicalGoal: 'Eine konkrete Verfügbarkeitsfrage auf Italienisch sicher äußern.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Mit Karte zahlen',
      situation: 'An der Kasse fragst du, ob du mit Karte zahlen kannst.',
    },
    vibeVariants: {
      bright: brightItalianP2Lesson005,
    },
  },
  {
    id: 'italian-a1-practical-2-lesson-6-pagare-carta',
    pathId: GUIDED_TODAY_PATH_ITALIAN_TWO_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_ITALIAN_TWO_METADATA.title,
    level: GUIDED_TODAY_PATH_ITALIAN_TWO_METADATA.level,
    lessonNumber: 6,
    baseLanguage: GUIDED_TODAY_PATH_ITALIAN_TWO_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_ITALIAN_TWO_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_ITALIAN_TWO_METADATA,
    lessonMetadata: {
      id: 'italian-a1-practical-2-lesson-6-pagare-carta',
      sequence: 6,
      title: 'Mit Karte zahlen',
    },
    title: 'Mit Karte zahlen',
    situation: {
      en: 'At the till, ask whether you can pay by card.',
      de: 'An der Kasse fragst du, ob du mit Karte zahlen kannst.',
    },
    pedagogicalGoal: 'Die Standard-Frage nach Kartenzahlung auf Italienisch sicher stellen.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Der Beleg',
      situation: 'Du bittest um Kassenbon und Tüte.',
    },
    vibeVariants: {
      bright: brightItalianP2Lesson006,
    },
  },
  {
    id: 'italian-a1-practical-2-lesson-7-scontrino-busta',
    pathId: GUIDED_TODAY_PATH_ITALIAN_TWO_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_ITALIAN_TWO_METADATA.title,
    level: GUIDED_TODAY_PATH_ITALIAN_TWO_METADATA.level,
    lessonNumber: 7,
    baseLanguage: GUIDED_TODAY_PATH_ITALIAN_TWO_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_ITALIAN_TWO_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_ITALIAN_TWO_METADATA,
    lessonMetadata: {
      id: 'italian-a1-practical-2-lesson-7-scontrino-busta',
      sequence: 7,
      title: 'Der Beleg',
    },
    title: 'Der Beleg',
    situation: {
      en: 'At the till, ask for the receipt and a bag.',
      de: 'An der Kasse bittest du um Beleg und eine Tüte.',
    },
    pedagogicalGoal: 'Zwei kleine Bitten am Kassenende auf Italienisch zusammenfassen.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Ich habe eine Reservierung',
      situation: 'Am Empfang nennst du deine Reservierung.',
    },
    vibeVariants: {
      bright: brightItalianP2Lesson007,
    },
  },
  {
    id: 'italian-a1-practical-2-lesson-8-prenotazione',
    pathId: GUIDED_TODAY_PATH_ITALIAN_TWO_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_ITALIAN_TWO_METADATA.title,
    level: GUIDED_TODAY_PATH_ITALIAN_TWO_METADATA.level,
    lessonNumber: 8,
    baseLanguage: GUIDED_TODAY_PATH_ITALIAN_TWO_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_ITALIAN_TWO_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_ITALIAN_TWO_METADATA,
    lessonMetadata: {
      id: 'italian-a1-practical-2-lesson-8-prenotazione',
      sequence: 8,
      title: 'Ich habe eine Reservierung',
    },
    title: 'Ich habe eine Reservierung',
    situation: {
      en: 'At a service counter, announce an existing reservation.',
      de: 'Am Empfang öffnest du die Szene mit deiner Reservierung.',
    },
    pedagogicalGoal: 'Eine bestehende Reservierung auf Italienisch knapp und sicher ankündigen.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Ist es das richtige?',
      situation: 'Du vergewisserst dich, bevor du dich festlegst.',
    },
    vibeVariants: {
      bright: brightItalianP2Lesson008,
    },
  },
  {
    id: 'italian-a1-practical-2-lesson-9-questo-e-giusto',
    pathId: GUIDED_TODAY_PATH_ITALIAN_TWO_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_ITALIAN_TWO_METADATA.title,
    level: GUIDED_TODAY_PATH_ITALIAN_TWO_METADATA.level,
    lessonNumber: 9,
    baseLanguage: GUIDED_TODAY_PATH_ITALIAN_TWO_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_ITALIAN_TWO_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_ITALIAN_TWO_METADATA,
    lessonMetadata: {
      id: 'italian-a1-practical-2-lesson-9-questo-e-giusto',
      sequence: 9,
      title: 'Ist es das richtige?',
    },
    title: 'Ist es das richtige?',
    situation: {
      en: 'Confirm an item or place is the correct one before committing.',
      de: 'Du vergewisserst dich kurz, bevor du dich festlegst.',
    },
    pedagogicalGoal: 'Eine kurze Bestätigungsfrage vor dem Festlegen auf Italienisch sicher stellen.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Einen Moment, bitte',
      situation: 'Du bittest um einen kurzen Moment Zeit.',
    },
    vibeVariants: {
      bright: brightItalianP2Lesson009,
    },
  },
  {
    id: 'italian-a1-practical-2-lesson-10-un-momento',
    pathId: GUIDED_TODAY_PATH_ITALIAN_TWO_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_ITALIAN_TWO_METADATA.title,
    level: GUIDED_TODAY_PATH_ITALIAN_TWO_METADATA.level,
    lessonNumber: 10,
    baseLanguage: GUIDED_TODAY_PATH_ITALIAN_TWO_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_ITALIAN_TWO_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_ITALIAN_TWO_METADATA,
    lessonMetadata: {
      id: 'italian-a1-practical-2-lesson-10-un-momento',
      sequence: 10,
      title: 'Einen Moment, bitte',
    },
    title: 'Einen Moment, bitte',
    situation: {
      en: 'Ask someone to wait briefly while you handle a small task.',
      de: 'Du bittest um einen kurzen Moment, während du etwas erledigst.',
    },
    pedagogicalGoal: 'Eine ruhige Pausen-Bitte auf Italienisch sicher abrufen.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Pfad abgeschlossen',
      situation: 'Du hast Italian A1 Practical 2 abgeschlossen.',
    },
    vibeVariants: {
      bright: brightItalianP2Lesson010,
    },
  },
  {
    id: 'italian-a1-practical-3-lesson-1-destra-sinistra',
    pathId: GUIDED_TODAY_PATH_ITALIAN_THREE_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_ITALIAN_THREE_METADATA.title,
    level: GUIDED_TODAY_PATH_ITALIAN_THREE_METADATA.level,
    lessonNumber: 1,
    baseLanguage: GUIDED_TODAY_PATH_ITALIAN_THREE_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_ITALIAN_THREE_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_ITALIAN_THREE_METADATA,
    lessonMetadata: {
      id: 'italian-a1-practical-3-lesson-1-destra-sinistra',
      sequence: 1,
      title: 'Rechts oder links?',
    },
    title: 'Rechts oder links?',
    situation: {
      en: 'On the sidewalk, ask whether to turn right or left.',
      de: 'Auf dem Gehweg fragst du, ob es rechts oder links weitergeht.',
    },
    pedagogicalGoal: 'Eine kurze Richtungsfrage mit dem italienischen Paar destra/sinistra stellen.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Ist es weit?',
      situation: 'Auf dem Gehweg fragst du, wie weit das Ziel ist.',
    },
    vibeVariants: {
      bright: brightItalianP3Lesson001,
    },
  },
  {
    id: 'italian-a1-practical-3-lesson-2-lontano',
    pathId: GUIDED_TODAY_PATH_ITALIAN_THREE_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_ITALIAN_THREE_METADATA.title,
    level: GUIDED_TODAY_PATH_ITALIAN_THREE_METADATA.level,
    lessonNumber: 2,
    baseLanguage: GUIDED_TODAY_PATH_ITALIAN_THREE_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_ITALIAN_THREE_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_ITALIAN_THREE_METADATA,
    lessonMetadata: {
      id: 'italian-a1-practical-3-lesson-2-lontano',
      sequence: 2,
      title: 'Ist es weit?',
    },
    title: 'Ist es weit?',
    situation: {
      en: 'On the sidewalk, ask how far the destination is.',
      de: 'Du fragst, wie weit das Ziel von hier ist.',
    },
    pedagogicalGoal: 'Eine kurze Entfernungsfrage auf Italienisch sicher stellen.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Ist es geöffnet?',
      situation: 'Vor dem Laden fragst du, ob jetzt geöffnet ist.',
    },
    vibeVariants: {
      bright: brightItalianP3Lesson002,
    },
  },
  {
    id: 'italian-a1-practical-3-lesson-3-aperto',
    pathId: GUIDED_TODAY_PATH_ITALIAN_THREE_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_ITALIAN_THREE_METADATA.title,
    level: GUIDED_TODAY_PATH_ITALIAN_THREE_METADATA.level,
    lessonNumber: 3,
    baseLanguage: GUIDED_TODAY_PATH_ITALIAN_THREE_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_ITALIAN_THREE_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_ITALIAN_THREE_METADATA,
    lessonMetadata: {
      id: 'italian-a1-practical-3-lesson-3-aperto',
      sequence: 3,
      title: 'Ist es geöffnet?',
    },
    title: 'Ist es geöffnet?',
    situation: {
      en: 'In front of a shop, ask whether it is open.',
      de: 'Vor dem Laden fragst du, ob jetzt geöffnet ist.',
    },
    pedagogicalGoal: 'Eine kurze Zustandsfrage mit dem italienischen "essere + Adjektiv" stellen.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Welcher Bus?',
      situation: 'An der Haltestelle fragst du nach der richtigen Linie.',
    },
    vibeVariants: {
      bright: brightItalianP3Lesson003,
    },
  },
  {
    id: 'italian-a1-practical-3-lesson-4-autobus',
    pathId: GUIDED_TODAY_PATH_ITALIAN_THREE_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_ITALIAN_THREE_METADATA.title,
    level: GUIDED_TODAY_PATH_ITALIAN_THREE_METADATA.level,
    lessonNumber: 4,
    baseLanguage: GUIDED_TODAY_PATH_ITALIAN_THREE_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_ITALIAN_THREE_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_ITALIAN_THREE_METADATA,
    lessonMetadata: {
      id: 'italian-a1-practical-3-lesson-4-autobus',
      sequence: 4,
      title: 'Welcher Bus?',
    },
    title: 'Welcher Bus?',
    situation: {
      en: 'At a bus stop, ask which bus goes downtown.',
      de: 'An der Haltestelle fragst du, welcher Bus ins Zentrum fährt.',
    },
    pedagogicalGoal: 'Eine konkrete Routenfrage auf Italienisch sicher stellen.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Die nächste Haltestelle',
      situation: 'Im fahrenden Bus vergewisserst du dich über die nächste Haltestelle.',
    },
    vibeVariants: {
      bright: brightItalianP3Lesson004,
    },
  },
  {
    id: 'italian-a1-practical-3-lesson-5-prossima-fermata',
    pathId: GUIDED_TODAY_PATH_ITALIAN_THREE_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_ITALIAN_THREE_METADATA.title,
    level: GUIDED_TODAY_PATH_ITALIAN_THREE_METADATA.level,
    lessonNumber: 5,
    baseLanguage: GUIDED_TODAY_PATH_ITALIAN_THREE_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_ITALIAN_THREE_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_ITALIAN_THREE_METADATA,
    lessonMetadata: {
      id: 'italian-a1-practical-3-lesson-5-prossima-fermata',
      sequence: 5,
      title: 'Die nächste Haltestelle',
    },
    title: 'Die nächste Haltestelle',
    situation: {
      en: 'On a moving bus, confirm whether the next stop is yours.',
      de: 'Im fahrenden Bus vergewisserst du dich über die nächste Haltestelle.',
    },
    pedagogicalGoal: 'Eine kurze Vergewisserungsfrage im Bus auf Italienisch sicher stellen.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Eine Fahrkarte, bitte',
      situation: 'Am Schalter kaufst du eine Fahrkarte.',
    },
    vibeVariants: {
      bright: brightItalianP3Lesson005,
    },
  },
  {
    id: 'italian-a1-practical-3-lesson-6-biglietto',
    pathId: GUIDED_TODAY_PATH_ITALIAN_THREE_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_ITALIAN_THREE_METADATA.title,
    level: GUIDED_TODAY_PATH_ITALIAN_THREE_METADATA.level,
    lessonNumber: 6,
    baseLanguage: GUIDED_TODAY_PATH_ITALIAN_THREE_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_ITALIAN_THREE_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_ITALIAN_THREE_METADATA,
    lessonMetadata: {
      id: 'italian-a1-practical-3-lesson-6-biglietto',
      sequence: 6,
      title: 'Eine Fahrkarte, bitte',
    },
    title: 'Eine Fahrkarte, bitte',
    situation: {
      en: 'At a ticket window, buy a simple ticket.',
      de: 'Am Schalter kaufst du eine einfache Fahrkarte.',
    },
    pedagogicalGoal: 'Die Standard-Bestellung am Fahrkartenschalter auf Italienisch abrufen.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Wann schließt es?',
      situation: 'Vor dem Museum fragst du nach der Schließzeit.',
    },
    vibeVariants: {
      bright: brightItalianP3Lesson006,
    },
  },
  {
    id: 'italian-a1-practical-3-lesson-7-chiude',
    pathId: GUIDED_TODAY_PATH_ITALIAN_THREE_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_ITALIAN_THREE_METADATA.title,
    level: GUIDED_TODAY_PATH_ITALIAN_THREE_METADATA.level,
    lessonNumber: 7,
    baseLanguage: GUIDED_TODAY_PATH_ITALIAN_THREE_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_ITALIAN_THREE_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_ITALIAN_THREE_METADATA,
    lessonMetadata: {
      id: 'italian-a1-practical-3-lesson-7-chiude',
      sequence: 7,
      title: 'Wann schließt es?',
    },
    title: 'Wann schließt es?',
    situation: {
      en: 'Outside a museum, ask the closing time.',
      de: 'Vor dem Museum fragst du nach der Schließzeit.',
    },
    pedagogicalGoal: 'Eine kurze Schließzeitfrage auf Italienisch sicher stellen.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'An der Ecke',
      situation: 'Du fragst, ob die Ecke der Abbiegepunkt ist.',
    },
    vibeVariants: {
      bright: brightItalianP3Lesson007,
    },
  },
  {
    id: 'italian-a1-practical-3-lesson-8-angolo',
    pathId: GUIDED_TODAY_PATH_ITALIAN_THREE_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_ITALIAN_THREE_METADATA.title,
    level: GUIDED_TODAY_PATH_ITALIAN_THREE_METADATA.level,
    lessonNumber: 8,
    baseLanguage: GUIDED_TODAY_PATH_ITALIAN_THREE_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_ITALIAN_THREE_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_ITALIAN_THREE_METADATA,
    lessonMetadata: {
      id: 'italian-a1-practical-3-lesson-8-angolo',
      sequence: 8,
      title: 'An der Ecke',
    },
    title: 'An der Ecke',
    situation: {
      en: 'On the sidewalk, ask whether to turn at the corner.',
      de: 'Du fragst, ob du an der Ecke abbiegen musst.',
    },
    pedagogicalGoal: 'Die Ecke als Wegmarkierung in einer Richtungsfrage nutzen.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Zu Fuß oder mit dem Taxi?',
      situation: 'Du wählst zwischen Gehen und Taxi.',
    },
    vibeVariants: {
      bright: brightItalianP3Lesson008,
    },
  },
  {
    id: 'italian-a1-practical-3-lesson-9-piedi-o-taxi',
    pathId: GUIDED_TODAY_PATH_ITALIAN_THREE_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_ITALIAN_THREE_METADATA.title,
    level: GUIDED_TODAY_PATH_ITALIAN_THREE_METADATA.level,
    lessonNumber: 9,
    baseLanguage: GUIDED_TODAY_PATH_ITALIAN_THREE_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_ITALIAN_THREE_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_ITALIAN_THREE_METADATA,
    lessonMetadata: {
      id: 'italian-a1-practical-3-lesson-9-piedi-o-taxi',
      sequence: 9,
      title: 'Zu Fuß oder mit dem Taxi?',
    },
    title: 'Zu Fuß oder mit dem Taxi?',
    situation: {
      en: 'On the sidewalk, choose between walking and a taxi.',
      de: 'Auf dem Gehsteig wählst du locker zwischen Gehen und Taxi.',
    },
    pedagogicalGoal: 'Eine binäre Wahlfrage mit "a piedi / in taxi" sicher stellen.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Ich habe die Haltestelle verpasst',
      situation: 'Du bittest jemanden auf der Straße um Hilfe.',
    },
    vibeVariants: {
      bright: brightItalianP3Lesson009,
    },
  },
  {
    id: 'italian-a1-practical-3-lesson-10-ho-perso',
    pathId: GUIDED_TODAY_PATH_ITALIAN_THREE_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_ITALIAN_THREE_METADATA.title,
    level: GUIDED_TODAY_PATH_ITALIAN_THREE_METADATA.level,
    lessonNumber: 10,
    baseLanguage: GUIDED_TODAY_PATH_ITALIAN_THREE_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_ITALIAN_THREE_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_ITALIAN_THREE_METADATA,
    lessonMetadata: {
      id: 'italian-a1-practical-3-lesson-10-ho-perso',
      sequence: 10,
      title: 'Ich habe die Haltestelle verpasst',
    },
    title: 'Ich habe die Haltestelle verpasst',
    situation: {
      en: 'You got off late and ask for help recovering.',
      de: 'Du steigst zu spät aus und bittest um Hilfe.',
    },
    pedagogicalGoal: 'Eine kurze Hilfsbitte nach verpasster Haltestelle auf Italienisch formulieren.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Pfad abgeschlossen',
      situation: 'Du hast Italian A1 Practical 3 abgeschlossen.',
    },
    vibeVariants: {
      bright: brightItalianP3Lesson010,
    },
  },
  {
    id: 'french-a1-practical-1-lesson-1-bonjour-francais',
    pathId: GUIDED_TODAY_PATH_FRENCH_ONE_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_FRENCH_ONE_METADATA.title,
    level: GUIDED_TODAY_PATH_FRENCH_ONE_METADATA.level,
    lessonNumber: 1,
    baseLanguage: GUIDED_TODAY_PATH_FRENCH_ONE_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_FRENCH_ONE_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_FRENCH_ONE_METADATA,
    lessonMetadata: {
      id: 'french-a1-practical-1-lesson-1-bonjour-francais',
      sequence: 1,
      title: 'Sprechen Sie Französisch?',
    },
    title: 'Sprechen Sie Französisch?',
    situation: {
      en: 'At a cafe counter, ask whether someone speaks French.',
      de: 'Im Café fragst du höflich, ob jemand Französisch spricht.',
    },
    pedagogicalGoal: 'Eine höfliche französische Eröffnungsfrage im Servicekontext sicher abrufen.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Bitte wiederholen',
      situation: 'Du bittest höflich darum, etwas zu wiederholen.',
    },
    vibeVariants: {
      bright: brightFrenchLesson001,
    },
  },
  {
    id: 'french-a1-practical-1-lesson-2-repeter',
    pathId: GUIDED_TODAY_PATH_FRENCH_ONE_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_FRENCH_ONE_METADATA.title,
    level: GUIDED_TODAY_PATH_FRENCH_ONE_METADATA.level,
    lessonNumber: 2,
    baseLanguage: GUIDED_TODAY_PATH_FRENCH_ONE_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_FRENCH_ONE_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_FRENCH_ONE_METADATA,
    lessonMetadata: {
      id: 'french-a1-practical-1-lesson-2-repeter',
      sequence: 2,
      title: 'Bitte wiederholen',
    },
    title: 'Bitte wiederholen',
    situation: {
      en: 'Mid-exchange, ask politely for repetition.',
      de: 'Mitten im Gespräch bittest du höflich um eine Wiederholung.',
    },
    pedagogicalGoal: 'Eine Reparaturbitte mit höflichem vous und s’il vous plaît formulieren.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Wo ist der Bahnhof?',
      situation: 'Du fragst auf der Straße nach dem Bahnhof.',
    },
    vibeVariants: {
      bright: brightFrenchLesson002,
    },
  },
  {
    id: 'french-a1-practical-1-lesson-3-ou-est-la-gare',
    pathId: GUIDED_TODAY_PATH_FRENCH_ONE_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_FRENCH_ONE_METADATA.title,
    level: GUIDED_TODAY_PATH_FRENCH_ONE_METADATA.level,
    lessonNumber: 3,
    baseLanguage: GUIDED_TODAY_PATH_FRENCH_ONE_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_FRENCH_ONE_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_FRENCH_ONE_METADATA,
    lessonMetadata: {
      id: 'french-a1-practical-1-lesson-3-ou-est-la-gare',
      sequence: 3,
      title: 'Wo ist der Bahnhof?',
    },
    title: 'Wo ist der Bahnhof?',
    situation: {
      en: 'On the sidewalk, ask a passerby where the station is.',
      de: 'Auf dem Gehweg fragst du eine fremde Person nach dem Bahnhof.',
    },
    pedagogicalGoal: 'Eine höfliche Ortsfrage mit où est sicher stellen.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Einen Kaffee bestellen',
      situation: 'Du bestellst höflich einen Kaffee.',
    },
    vibeVariants: {
      bright: brightFrenchLesson003,
    },
  },
  {
    id: 'french-a1-practical-1-lesson-4-cafe',
    pathId: GUIDED_TODAY_PATH_FRENCH_ONE_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_FRENCH_ONE_METADATA.title,
    level: GUIDED_TODAY_PATH_FRENCH_ONE_METADATA.level,
    lessonNumber: 4,
    baseLanguage: GUIDED_TODAY_PATH_FRENCH_ONE_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_FRENCH_ONE_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_FRENCH_ONE_METADATA,
    lessonMetadata: {
      id: 'french-a1-practical-1-lesson-4-cafe',
      sequence: 4,
      title: 'Einen Kaffee bestellen',
    },
    title: 'Einen Kaffee bestellen',
    situation: {
      en: 'At a cafe counter, order a coffee politely.',
      de: 'Am Café-Tresen bestellst du höflich einen Kaffee.',
    },
    pedagogicalGoal: 'Eine Servicebestellung mit je voudrais statt je veux abrufen.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Nach dem Preis fragen',
      situation: 'Du fragst, wie viel etwas kostet.',
    },
    vibeVariants: {
      bright: brightFrenchLesson004,
    },
  },
  {
    id: 'french-a1-practical-1-lesson-5-combien-ca-coute',
    pathId: GUIDED_TODAY_PATH_FRENCH_ONE_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_FRENCH_ONE_METADATA.title,
    level: GUIDED_TODAY_PATH_FRENCH_ONE_METADATA.level,
    lessonNumber: 5,
    baseLanguage: GUIDED_TODAY_PATH_FRENCH_ONE_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_FRENCH_ONE_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_FRENCH_ONE_METADATA,
    lessonMetadata: {
      id: 'french-a1-practical-1-lesson-5-combien-ca-coute',
      sequence: 5,
      title: 'Nach dem Preis fragen',
    },
    title: 'Nach dem Preis fragen',
    situation: {
      en: 'In a small shop, ask how much a visible item costs.',
      de: 'Im kleinen Laden fragst du nach dem Preis eines sichtbaren Gegenstands.',
    },
    pedagogicalGoal: 'Eine einfache Preisfrage mit combien ça coûte stellen.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Wann fährt der Zug?',
      situation: 'Du fragst im Bahnhof nach der Abfahrtszeit.',
    },
    vibeVariants: {
      bright: brightFrenchLesson005,
    },
  },
  {
    id: 'french-a1-practical-1-lesson-6-train',
    pathId: GUIDED_TODAY_PATH_FRENCH_ONE_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_FRENCH_ONE_METADATA.title,
    level: GUIDED_TODAY_PATH_FRENCH_ONE_METADATA.level,
    lessonNumber: 6,
    baseLanguage: GUIDED_TODAY_PATH_FRENCH_ONE_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_FRENCH_ONE_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_FRENCH_ONE_METADATA,
    lessonMetadata: {
      id: 'french-a1-practical-1-lesson-6-train',
      sequence: 6,
      title: 'Wann fährt der Zug?',
    },
    title: 'Wann fährt der Zug?',
    situation: {
      en: 'At a train station, ask what time the train leaves.',
      de: 'Im Bahnhof fragst du, um wie viel Uhr der Zug fährt.',
    },
    pedagogicalGoal: 'Eine einfache Zeitfrage im Bahnhof mit à quelle heure formulieren.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Ich brauche Hilfe',
      situation: 'Du sagst höflich, dass du Hilfe brauchst.',
    },
    vibeVariants: {
      bright: brightFrenchLesson006,
    },
  },
  {
    id: 'french-a1-practical-1-lesson-7-aide',
    pathId: GUIDED_TODAY_PATH_FRENCH_ONE_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_FRENCH_ONE_METADATA.title,
    level: GUIDED_TODAY_PATH_FRENCH_ONE_METADATA.level,
    lessonNumber: 7,
    baseLanguage: GUIDED_TODAY_PATH_FRENCH_ONE_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_FRENCH_ONE_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_FRENCH_ONE_METADATA,
    lessonMetadata: {
      id: 'french-a1-practical-1-lesson-7-aide',
      sequence: 7,
      title: 'Ich brauche Hilfe',
    },
    title: 'Ich brauche Hilfe',
    situation: {
      en: 'At a counter, state that you need help.',
      de: 'Am Schalter sagst du höflich, dass du Hilfe brauchst.',
    },
    pedagogicalGoal: 'Eine knappe Hilfe-Bitte mit j’ai besoin d’aide äußern.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Es ist schön hier',
      situation: 'Du machst einen kurzen positiven Kommentar über den Ort.',
    },
    vibeVariants: {
      bright: brightFrenchLesson007,
    },
  },
  {
    id: 'french-a1-practical-1-lesson-8-joli-ici',
    pathId: GUIDED_TODAY_PATH_FRENCH_ONE_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_FRENCH_ONE_METADATA.title,
    level: GUIDED_TODAY_PATH_FRENCH_ONE_METADATA.level,
    lessonNumber: 8,
    baseLanguage: GUIDED_TODAY_PATH_FRENCH_ONE_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_FRENCH_ONE_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_FRENCH_ONE_METADATA,
    lessonMetadata: {
      id: 'french-a1-practical-1-lesson-8-joli-ici',
      sequence: 8,
      title: 'Es ist schön hier',
    },
    title: 'Es ist schön hier',
    situation: {
      en: 'Inside a cafe or shop, make a short positive comment about the place.',
      de: 'In einem Café oder Laden sagst du etwas Nettes über den Ort.',
    },
    pedagogicalGoal: 'Einen einfachen positiven Ortskommentar mit c’est und ici bilden.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Morgen um sieben',
      situation: 'Du bestätigst einen Plan für morgen.',
    },
    vibeVariants: {
      bright: brightFrenchLesson008,
    },
  },
  {
    id: 'french-a1-practical-1-lesson-9-demain-sept-heures',
    pathId: GUIDED_TODAY_PATH_FRENCH_ONE_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_FRENCH_ONE_METADATA.title,
    level: GUIDED_TODAY_PATH_FRENCH_ONE_METADATA.level,
    lessonNumber: 9,
    baseLanguage: GUIDED_TODAY_PATH_FRENCH_ONE_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_FRENCH_ONE_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_FRENCH_ONE_METADATA,
    lessonMetadata: {
      id: 'french-a1-practical-1-lesson-9-demain-sept-heures',
      sequence: 9,
      title: 'Morgen um sieben',
    },
    title: 'Morgen um sieben',
    situation: {
      en: 'Confirm a plan for tomorrow at seven.',
      de: 'Du bestätigst locker einen Termin für morgen um sieben.',
    },
    pedagogicalGoal: 'Einen einfachen Plan mit Morgen- und Uhrzeitanker bestätigen.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Danke und Auf Wiedersehen',
      situation: 'Du schließt die Szene mit Dank und Abschied ab.',
    },
    vibeVariants: {
      bright: brightFrenchLesson009,
    },
  },
  {
    id: 'french-a1-practical-1-lesson-10-merci-au-revoir',
    pathId: GUIDED_TODAY_PATH_FRENCH_ONE_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_FRENCH_ONE_METADATA.title,
    level: GUIDED_TODAY_PATH_FRENCH_ONE_METADATA.level,
    lessonNumber: 10,
    baseLanguage: GUIDED_TODAY_PATH_FRENCH_ONE_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_FRENCH_ONE_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_FRENCH_ONE_METADATA,
    lessonMetadata: {
      id: 'french-a1-practical-1-lesson-10-merci-au-revoir',
      sequence: 10,
      title: 'Danke und Auf Wiedersehen',
    },
    title: 'Danke und Auf Wiedersehen',
    situation: {
      en: 'Close the scene with thanks and a polite goodbye.',
      de: 'Du schließt die Szene mit Dank und höflichem Abschied ab.',
    },
    pedagogicalGoal: 'Eine kurze Dank-und-Abschied-Wendung auf Französisch sicher abrufen.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Pfad abgeschlossen',
      situation: 'Du hast French A1 Practical 1 abgeschlossen.',
    },
    vibeVariants: {
      bright: brightFrenchLesson010,
    },
  },
  {
    id: 'french-a1-practical-2-lesson-1-je-ne-comprends-pas',
    pathId: GUIDED_TODAY_PATH_FRENCH_TWO_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_FRENCH_TWO_METADATA.title,
    level: GUIDED_TODAY_PATH_FRENCH_TWO_METADATA.level,
    lessonNumber: 1,
    baseLanguage: GUIDED_TODAY_PATH_FRENCH_TWO_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_FRENCH_TWO_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_FRENCH_TWO_METADATA,
    lessonMetadata: {
      id: 'french-a1-practical-2-lesson-1-je-ne-comprends-pas',
      sequence: 1,
      title: 'Ich verstehe nicht',
    },
    title: 'Ich verstehe nicht',
    situation: {
      en: 'At a counter, admit non-understanding and ask politely for simple help.',
      de: 'Am Schalter sagst du höflich, dass du nicht verstehst, und bittest um Hilfe.',
    },
    pedagogicalGoal: 'Eine höfliche Klärungsbitte mit vollständiger französischer Negation und vous abrufen.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Bitte aufschreiben',
      situation: 'Du bittest darum, eine Information aufzuschreiben.',
    },
    vibeVariants: {
      bright: brightFrenchP2Lesson001,
    },
  },
  {
    id: 'french-a1-practical-2-lesson-2-lecrire',
    pathId: GUIDED_TODAY_PATH_FRENCH_TWO_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_FRENCH_TWO_METADATA.title,
    level: GUIDED_TODAY_PATH_FRENCH_TWO_METADATA.level,
    lessonNumber: 2,
    baseLanguage: GUIDED_TODAY_PATH_FRENCH_TWO_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_FRENCH_TWO_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_FRENCH_TWO_METADATA,
    lessonMetadata: {
      id: 'french-a1-practical-2-lesson-2-lecrire',
      sequence: 2,
      title: 'Bitte aufschreiben',
    },
    title: 'Bitte aufschreiben',
    situation: {
      en: 'At a desk or counter, ask for important information to be written down.',
      de: 'Am Schalter bittest du darum, eine wichtige Information aufzuschreiben.',
    },
    pedagogicalGoal: 'Eine schriftliche Klärungsbitte mit l’écrire und s’il vous plaît formulieren.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Auf dem Plan zeigen',
      situation: 'Du bittest darum, einen Ort auf dem Plan zu zeigen.',
    },
    vibeVariants: {
      bright: brightFrenchP2Lesson002,
    },
  },
  {
    id: 'french-a1-practical-2-lesson-3-sur-le-plan',
    pathId: GUIDED_TODAY_PATH_FRENCH_TWO_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_FRENCH_TWO_METADATA.title,
    level: GUIDED_TODAY_PATH_FRENCH_TWO_METADATA.level,
    lessonNumber: 3,
    baseLanguage: GUIDED_TODAY_PATH_FRENCH_TWO_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_FRENCH_TWO_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_FRENCH_TWO_METADATA,
    lessonMetadata: {
      id: 'french-a1-practical-2-lesson-3-sur-le-plan',
      sequence: 3,
      title: 'Auf dem Plan zeigen',
    },
    title: 'Auf dem Plan zeigen',
    situation: {
      en: 'Ask someone to show a location on a map, phone, or visible surface.',
      de: 'Du bittest eine fremde Person, dir einen Ort auf dem Plan zu zeigen.',
    },
    pedagogicalGoal: 'Eine konkrete Zeigebitte mit montrer und sur le plan abrufen.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Dieses oder jenes?',
      situation: 'Du fragst zwischen zwei sichtbaren Optionen.',
    },
    vibeVariants: {
      bright: brightFrenchP2Lesson003,
    },
  },
  {
    id: 'french-a1-practical-2-lesson-4-ca-ou-ca',
    pathId: GUIDED_TODAY_PATH_FRENCH_TWO_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_FRENCH_TWO_METADATA.title,
    level: GUIDED_TODAY_PATH_FRENCH_TWO_METADATA.level,
    lessonNumber: 4,
    baseLanguage: GUIDED_TODAY_PATH_FRENCH_TWO_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_FRENCH_TWO_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_FRENCH_TWO_METADATA,
    lessonMetadata: {
      id: 'french-a1-practical-2-lesson-4-ca-ou-ca',
      sequence: 4,
      title: 'Dieses oder jenes?',
    },
    title: 'Dieses oder jenes?',
    situation: {
      en: 'In a bakery or shop, ask a binary choice between two visible options.',
      de: 'In Bäckerei oder Laden fragst du zwischen zwei sichtbaren Optionen.',
    },
    pedagogicalGoal: 'Eine kurze Wahlfrage mit ça und höflichem s’il vous plaît stellen.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Haben Sie das?',
      situation: 'Du fragst, ob ein Artikel verfügbar ist.',
    },
    vibeVariants: {
      bright: brightFrenchP2Lesson004,
    },
  },
  {
    id: 'french-a1-practical-2-lesson-5-vous-avez-ca',
    pathId: GUIDED_TODAY_PATH_FRENCH_TWO_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_FRENCH_TWO_METADATA.title,
    level: GUIDED_TODAY_PATH_FRENCH_TWO_METADATA.level,
    lessonNumber: 5,
    baseLanguage: GUIDED_TODAY_PATH_FRENCH_TWO_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_FRENCH_TWO_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_FRENCH_TWO_METADATA,
    lessonMetadata: {
      id: 'french-a1-practical-2-lesson-5-vous-avez-ca',
      sequence: 5,
      title: 'Haben Sie das?',
    },
    title: 'Haben Sie das?',
    situation: {
      en: 'In a shop, ask whether a visible or pictured item is available.',
      de: 'Im Laden fragst du, ob ein sichtbarer oder gezeigter Artikel verfügbar ist.',
    },
    pedagogicalGoal: 'Eine natürliche Verfügbarkeitsfrage mit vous avez ça bilden.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Mit Karte bezahlen',
      situation: 'Du fragst an der Kasse, ob Kartenzahlung möglich ist.',
    },
    vibeVariants: {
      bright: brightFrenchP2Lesson005,
    },
  },
  {
    id: 'french-a1-practical-2-lesson-6-payer-par-carte',
    pathId: GUIDED_TODAY_PATH_FRENCH_TWO_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_FRENCH_TWO_METADATA.title,
    level: GUIDED_TODAY_PATH_FRENCH_TWO_METADATA.level,
    lessonNumber: 6,
    baseLanguage: GUIDED_TODAY_PATH_FRENCH_TWO_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_FRENCH_TWO_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_FRENCH_TWO_METADATA,
    lessonMetadata: {
      id: 'french-a1-practical-2-lesson-6-payer-par-carte',
      sequence: 6,
      title: 'Mit Karte bezahlen',
    },
    title: 'Mit Karte bezahlen',
    situation: {
      en: 'At a cafe or shop till, ask whether card payment is accepted.',
      de: 'An der Kasse fragst du, ob du mit Karte zahlen kannst.',
    },
    pedagogicalGoal: 'Die französische Standardfrage für Kartenzahlung mit payer par carte abrufen.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Beleg und Tüte',
      situation: 'Du bittest am Kassenende um Bon und Tüte.',
    },
    vibeVariants: {
      bright: brightFrenchP2Lesson006,
    },
  },
  {
    id: 'french-a1-practical-2-lesson-7-ticket-et-sac',
    pathId: GUIDED_TODAY_PATH_FRENCH_TWO_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_FRENCH_TWO_METADATA.title,
    level: GUIDED_TODAY_PATH_FRENCH_TWO_METADATA.level,
    lessonNumber: 7,
    baseLanguage: GUIDED_TODAY_PATH_FRENCH_TWO_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_FRENCH_TWO_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_FRENCH_TWO_METADATA,
    lessonMetadata: {
      id: 'french-a1-practical-2-lesson-7-ticket-et-sac',
      sequence: 7,
      title: 'Beleg und Tüte',
    },
    title: 'Beleg und Tüte',
    situation: {
      en: 'At the till, ask for a receipt and optionally a bag.',
      de: 'An der Kasse bittest du um einen Beleg und eine Tüte.',
    },
    pedagogicalGoal: 'Zwei kleine Kassenbitten in einer höflichen französischen Phrase verbinden.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Ich habe eine Reservierung',
      situation: 'Du meldest dich am Empfang mit einer Reservierung.',
    },
    vibeVariants: {
      bright: brightFrenchP2Lesson007,
    },
  },
  {
    id: 'french-a1-practical-2-lesson-8-reservation',
    pathId: GUIDED_TODAY_PATH_FRENCH_TWO_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_FRENCH_TWO_METADATA.title,
    level: GUIDED_TODAY_PATH_FRENCH_TWO_METADATA.level,
    lessonNumber: 8,
    baseLanguage: GUIDED_TODAY_PATH_FRENCH_TWO_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_FRENCH_TWO_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_FRENCH_TWO_METADATA,
    lessonMetadata: {
      id: 'french-a1-practical-2-lesson-8-reservation',
      sequence: 8,
      title: 'Ich habe eine Reservierung',
    },
    title: 'Ich habe eine Reservierung',
    situation: {
      en: 'At a restaurant host stand, announce that you have a reservation.',
      de: 'Am Restaurantempfang sagst du, dass du eine Reservierung hast.',
    },
    pedagogicalGoal: 'Eine Ankunftszeile mit j’ai, réservation und au nom de formulieren.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Ist das der richtige Bus?',
      situation: 'Du prüfst vor dem Einsteigen, ob es der richtige Bus ist.',
    },
    vibeVariants: {
      bright: brightFrenchP2Lesson008,
    },
  },
  {
    id: 'french-a1-practical-2-lesson-9-bon-bus',
    pathId: GUIDED_TODAY_PATH_FRENCH_TWO_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_FRENCH_TWO_METADATA.title,
    level: GUIDED_TODAY_PATH_FRENCH_TWO_METADATA.level,
    lessonNumber: 9,
    baseLanguage: GUIDED_TODAY_PATH_FRENCH_TWO_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_FRENCH_TWO_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_FRENCH_TWO_METADATA,
    lessonMetadata: {
      id: 'french-a1-practical-2-lesson-9-bon-bus',
      sequence: 9,
      title: 'Ist das der richtige Bus?',
    },
    title: 'Ist das der richtige Bus?',
    situation: {
      en: 'At a bus stop, confirm that this is the correct bus.',
      de: 'An der Haltestelle prüfst du, ob das der richtige Bus ist.',
    },
    pedagogicalGoal: 'Eine kurze Bestätigungsfrage mit c’est le bon bus stellen.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Einen Augenblick',
      situation: 'Du bittest höflich um einen kurzen Moment.',
    },
    vibeVariants: {
      bright: brightFrenchP2Lesson009,
    },
  },
  {
    id: 'french-a1-practical-2-lesson-10-un-instant',
    pathId: GUIDED_TODAY_PATH_FRENCH_TWO_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_FRENCH_TWO_METADATA.title,
    level: GUIDED_TODAY_PATH_FRENCH_TWO_METADATA.level,
    lessonNumber: 10,
    baseLanguage: GUIDED_TODAY_PATH_FRENCH_TWO_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_FRENCH_TWO_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_FRENCH_TWO_METADATA,
    lessonMetadata: {
      id: 'french-a1-practical-2-lesson-10-un-instant',
      sequence: 10,
      title: 'Einen Augenblick',
    },
    title: 'Einen Augenblick',
    situation: {
      en: 'Ask someone to wait briefly while you handle a small task.',
      de: 'Du bittest höflich um einen kurzen Moment, während du etwas erledigst.',
    },
    pedagogicalGoal: 'Eine knappe höfliche Wartebitte mit un instant und s’il vous plaît abrufen.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Pfad abgeschlossen',
      situation: 'Du hast French A1 Practical 2 abgeschlossen.',
    },
    vibeVariants: {
      bright: brightFrenchP2Lesson010,
    },
  },
  {
    id: 'french-a1-practical-3-lesson-1-droite-ou-gauche',
    pathId: GUIDED_TODAY_PATH_FRENCH_THREE_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_FRENCH_THREE_METADATA.title,
    level: GUIDED_TODAY_PATH_FRENCH_THREE_METADATA.level,
    lessonNumber: 1,
    baseLanguage: GUIDED_TODAY_PATH_FRENCH_THREE_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_FRENCH_THREE_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_FRENCH_THREE_METADATA,
    lessonMetadata: {
      id: 'french-a1-practical-3-lesson-1-droite-ou-gauche',
      sequence: 1,
      title: 'Rechts oder links?',
    },
    title: 'Rechts oder links?',
    situation: {
      en: 'At a sidewalk intersection, ask politely whether to turn right or left.',
      de: 'An einer Kreuzung fragst du höflich, ob du rechts oder links abbiegen sollst.',
    },
    pedagogicalGoal: 'Eine einfache Richtungsfrage mit à droite und à gauche abrufen.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Ist es weit?',
      situation: 'Du fragst, ob ein Ziel zu Fuß weit ist.',
    },
    vibeVariants: {
      bright: brightFrenchP3Lesson001,
    },
  },
  {
    id: 'french-a1-practical-3-lesson-2-loin-a-pied',
    pathId: GUIDED_TODAY_PATH_FRENCH_THREE_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_FRENCH_THREE_METADATA.title,
    level: GUIDED_TODAY_PATH_FRENCH_THREE_METADATA.level,
    lessonNumber: 2,
    baseLanguage: GUIDED_TODAY_PATH_FRENCH_THREE_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_FRENCH_THREE_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_FRENCH_THREE_METADATA,
    lessonMetadata: {
      id: 'french-a1-practical-3-lesson-2-loin-a-pied',
      sequence: 2,
      title: 'Ist es weit?',
    },
    title: 'Ist es weit?',
    situation: {
      en: 'Mid-navigation, ask whether the destination is far on foot.',
      de: 'Unterwegs fragst du, ob das Ziel zu Fuß weit ist.',
    },
    pedagogicalGoal: 'Die natürliche kurze Entfernungsfrage mit c’est loin und à pied bilden.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Jetzt geöffnet?',
      situation: 'Du prüfst vor dem Eingang, ob ein Ort offen ist.',
    },
    vibeVariants: {
      bright: brightFrenchP3Lesson002,
    },
  },
  {
    id: 'french-a1-practical-3-lesson-3-ouvert-maintenant',
    pathId: GUIDED_TODAY_PATH_FRENCH_THREE_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_FRENCH_THREE_METADATA.title,
    level: GUIDED_TODAY_PATH_FRENCH_THREE_METADATA.level,
    lessonNumber: 3,
    baseLanguage: GUIDED_TODAY_PATH_FRENCH_THREE_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_FRENCH_THREE_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_FRENCH_THREE_METADATA,
    lessonMetadata: {
      id: 'french-a1-practical-3-lesson-3-ouvert-maintenant',
      sequence: 3,
      title: 'Jetzt geöffnet?',
    },
    title: 'Jetzt geöffnet?',
    situation: {
      en: 'In front of a shop, cafe, or office, ask whether it is open now.',
      de: 'Vor Laden, Café oder Büro fragst du, ob jetzt geöffnet ist.',
    },
    pedagogicalGoal: 'Eine Zustandsfrage mit c’est ouvert und maintenant abrufen.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Welcher Bus?',
      situation: 'Du fragst nach der passenden Buslinie zu einem Ziel.',
    },
    vibeVariants: {
      bright: brightFrenchP3Lesson003,
    },
  },
  {
    id: 'french-a1-practical-3-lesson-4-bus-au-musee',
    pathId: GUIDED_TODAY_PATH_FRENCH_THREE_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_FRENCH_THREE_METADATA.title,
    level: GUIDED_TODAY_PATH_FRENCH_THREE_METADATA.level,
    lessonNumber: 4,
    baseLanguage: GUIDED_TODAY_PATH_FRENCH_THREE_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_FRENCH_THREE_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_FRENCH_THREE_METADATA,
    lessonMetadata: {
      id: 'french-a1-practical-3-lesson-4-bus-au-musee',
      sequence: 4,
      title: 'Welcher Bus?',
    },
    title: 'Welcher Bus?',
    situation: {
      en: 'At a bus stop, ask which bus goes to a specific destination.',
      de: 'An der Haltestelle fragst du, welcher Bus zum Ziel fährt.',
    },
    pedagogicalGoal: 'Eine höfliche Linienfrage mit quel bus und au musée stellen.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Nächste Haltestelle?',
      situation: 'Du prüfst im Bus, ob dein Halt als Nächstes kommt.',
    },
    vibeVariants: {
      bright: brightFrenchP3Lesson004,
    },
  },
  {
    id: 'french-a1-practical-3-lesson-5-prochain-arret',
    pathId: GUIDED_TODAY_PATH_FRENCH_THREE_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_FRENCH_THREE_METADATA.title,
    level: GUIDED_TODAY_PATH_FRENCH_THREE_METADATA.level,
    lessonNumber: 5,
    baseLanguage: GUIDED_TODAY_PATH_FRENCH_THREE_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_FRENCH_THREE_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_FRENCH_THREE_METADATA,
    lessonMetadata: {
      id: 'french-a1-practical-3-lesson-5-prochain-arret',
      sequence: 5,
      title: 'Nächste Haltestelle?',
    },
    title: 'Nächste Haltestelle?',
    situation: {
      en: 'On a moving bus or tram, confirm whether the next stop is yours.',
      de: 'Im Bus oder in der Tram prüfst du, ob die nächste Haltestelle deine ist.',
    },
    pedagogicalGoal: 'Eine kurze Kontrollfrage mit le prochain arrêt formulieren.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Eine Fahrkarte',
      situation: 'Du kaufst eine einfache Fahrkarte.',
    },
    vibeVariants: {
      bright: brightFrenchP3Lesson005,
    },
  },
  {
    id: 'french-a1-practical-3-lesson-6-un-billet',
    pathId: GUIDED_TODAY_PATH_FRENCH_THREE_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_FRENCH_THREE_METADATA.title,
    level: GUIDED_TODAY_PATH_FRENCH_THREE_METADATA.level,
    lessonNumber: 6,
    baseLanguage: GUIDED_TODAY_PATH_FRENCH_THREE_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_FRENCH_THREE_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_FRENCH_THREE_METADATA,
    lessonMetadata: {
      id: 'french-a1-practical-3-lesson-6-un-billet',
      sequence: 6,
      title: 'Eine Fahrkarte',
    },
    title: 'Eine Fahrkarte',
    situation: {
      en: 'At a transit counter or kiosk, buy a simple single ticket.',
      de: 'Am Verkehrsschalter oder Automaten kaufst du eine einfache Fahrkarte.',
    },
    pedagogicalGoal: 'Eine höfliche Ticketbitte mit un billet und s’il vous plaît abrufen.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Wann schließt es?',
      situation: 'Du fragst nach der Schließzeit eines Ortes.',
    },
    vibeVariants: {
      bright: brightFrenchP3Lesson006,
    },
  },
  {
    id: 'french-a1-practical-3-lesson-7-quelle-heure-ferme',
    pathId: GUIDED_TODAY_PATH_FRENCH_THREE_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_FRENCH_THREE_METADATA.title,
    level: GUIDED_TODAY_PATH_FRENCH_THREE_METADATA.level,
    lessonNumber: 7,
    baseLanguage: GUIDED_TODAY_PATH_FRENCH_THREE_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_FRENCH_THREE_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_FRENCH_THREE_METADATA,
    lessonMetadata: {
      id: 'french-a1-practical-3-lesson-7-quelle-heure-ferme',
      sequence: 7,
      title: 'Wann schließt es?',
    },
    title: 'Wann schließt es?',
    situation: {
      en: 'Outside a shop or museum, ask the closing time to plan a visit.',
      de: 'Vor Laden oder Museum fragst du nach der Schließzeit.',
    },
    pedagogicalGoal: 'Eine Uhrzeitfrage mit à quelle heure und ça ferme bilden.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'An der Ecke',
      situation: 'Du nutzt eine Straßenecke als Orientierungspunkt.',
    },
    vibeVariants: {
      bright: brightFrenchP3Lesson007,
    },
  },
  {
    id: 'french-a1-practical-3-lesson-8-au-coin',
    pathId: GUIDED_TODAY_PATH_FRENCH_THREE_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_FRENCH_THREE_METADATA.title,
    level: GUIDED_TODAY_PATH_FRENCH_THREE_METADATA.level,
    lessonNumber: 8,
    baseLanguage: GUIDED_TODAY_PATH_FRENCH_THREE_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_FRENCH_THREE_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_FRENCH_THREE_METADATA,
    lessonMetadata: {
      id: 'french-a1-practical-3-lesson-8-au-coin',
      sequence: 8,
      title: 'An der Ecke',
    },
    title: 'An der Ecke',
    situation: {
      en: 'At an intersection, use a street corner as a navigation landmark.',
      de: 'An einer Kreuzung nutzt du die Straßenecke als Orientierungspunkt.',
    },
    pedagogicalGoal: 'Eine Ortsfrage mit au coin de la rue formulieren.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Zu Fuß oder Taxi?',
      situation: 'Du wählst zwischen Gehen und Taxi.',
    },
    vibeVariants: {
      bright: brightFrenchP3Lesson008,
    },
  },
  {
    id: 'french-a1-practical-3-lesson-9-pied-ou-taxi',
    pathId: GUIDED_TODAY_PATH_FRENCH_THREE_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_FRENCH_THREE_METADATA.title,
    level: GUIDED_TODAY_PATH_FRENCH_THREE_METADATA.level,
    lessonNumber: 9,
    baseLanguage: GUIDED_TODAY_PATH_FRENCH_THREE_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_FRENCH_THREE_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_FRENCH_THREE_METADATA,
    lessonMetadata: {
      id: 'french-a1-practical-3-lesson-9-pied-ou-taxi',
      sequence: 9,
      title: 'Zu Fuß oder Taxi?',
    },
    title: 'Zu Fuß oder Taxi?',
    situation: {
      en: 'Choose between walking and taking a taxi as transport options.',
      de: 'Du entscheidest neutral zwischen zu Fuß gehen und Taxi fahren.',
    },
    pedagogicalGoal: 'Die Transportwahl à pied ou en taxi natürlich abrufen.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Haltestelle verpasst',
      situation: 'Du sagst, dass du deinen Halt verpasst hast.',
    },
    vibeVariants: {
      bright: brightFrenchP3Lesson009,
    },
  },
  {
    id: 'french-a1-practical-3-lesson-10-rate-mon-arret',
    pathId: GUIDED_TODAY_PATH_FRENCH_THREE_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_FRENCH_THREE_METADATA.title,
    level: GUIDED_TODAY_PATH_FRENCH_THREE_METADATA.level,
    lessonNumber: 10,
    baseLanguage: GUIDED_TODAY_PATH_FRENCH_THREE_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_FRENCH_THREE_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_FRENCH_THREE_METADATA,
    lessonMetadata: {
      id: 'french-a1-practical-3-lesson-10-rate-mon-arret',
      sequence: 10,
      title: 'Haltestelle verpasst',
    },
    title: 'Haltestelle verpasst',
    situation: {
      en: 'On a bus or tram, say you missed your stop and ask for help recovering.',
      de: 'Im Bus oder in der Tram sagst du, dass du deine Haltestelle verpasst hast, und bittest um Hilfe.',
    },
    pedagogicalGoal: 'Eine kleine Verkehrspanne mit j’ai raté mon arrêt und höflichem vous erklären.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Pfad abgeschlossen',
      situation: 'Du hast French A1 Practical 3 abgeschlossen.',
    },
    vibeVariants: {
      bright: brightFrenchP3Lesson010,
    },
  },
  {
    id: 'french-a1-practical-4-lesson-1-table-pour-deux',
    pathId: GUIDED_TODAY_PATH_FRENCH_FOUR_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_FRENCH_FOUR_METADATA.title,
    level: GUIDED_TODAY_PATH_FRENCH_FOUR_METADATA.level,
    lessonNumber: 1,
    baseLanguage: GUIDED_TODAY_PATH_FRENCH_FOUR_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_FRENCH_FOUR_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_FRENCH_FOUR_METADATA,
    lessonMetadata: {
      id: 'french-a1-practical-4-lesson-1-table-pour-deux',
      sequence: 1,
      title: 'Ein Tisch für zwei',
    },
    title: 'Ein Tisch für zwei',
    situation: {
      en: 'At a restaurant entrance, ask the host for a table for two.',
      de: 'Am Restauranteingang bittest du um einen Tisch für zwei Personen.',
    },
    pedagogicalGoal: 'Eine höfliche Tischbitte mit une table pour deux abrufen.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Die Speisekarte',
      situation: 'Du bittest am Tisch um die Karte.',
    },
    vibeVariants: {
      bright: brightFrenchP4Lesson001,
    },
  },
  {
    id: 'french-a1-practical-4-lesson-2-la-carte',
    pathId: GUIDED_TODAY_PATH_FRENCH_FOUR_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_FRENCH_FOUR_METADATA.title,
    level: GUIDED_TODAY_PATH_FRENCH_FOUR_METADATA.level,
    lessonNumber: 2,
    baseLanguage: GUIDED_TODAY_PATH_FRENCH_FOUR_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_FRENCH_FOUR_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_FRENCH_FOUR_METADATA,
    lessonMetadata: {
      id: 'french-a1-practical-4-lesson-2-la-carte',
      sequence: 2,
      title: 'Die Speisekarte',
    },
    title: 'Die Speisekarte',
    situation: {
      en: 'Seated at a table, ask politely to see the restaurant menu.',
      de: 'Am Tisch bittest du höflich um die Speisekarte.',
    },
    pedagogicalGoal: 'Die natürliche Restaurantbitte la carte, s’il vous plaît verwenden.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Einen Tee bestellen',
      situation: 'Du bestellst ein anderes Getränk als Kaffee.',
    },
    vibeVariants: {
      bright: brightFrenchP4Lesson002,
    },
  },
  {
    id: 'french-a1-practical-4-lesson-3-un-the',
    pathId: GUIDED_TODAY_PATH_FRENCH_FOUR_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_FRENCH_FOUR_METADATA.title,
    level: GUIDED_TODAY_PATH_FRENCH_FOUR_METADATA.level,
    lessonNumber: 3,
    baseLanguage: GUIDED_TODAY_PATH_FRENCH_FOUR_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_FRENCH_FOUR_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_FRENCH_FOUR_METADATA,
    lessonMetadata: {
      id: 'french-a1-practical-4-lesson-3-un-the',
      sequence: 3,
      title: 'Einen Tee bestellen',
    },
    title: 'Einen Tee bestellen',
    situation: {
      en: 'At a cafe table, order a simple non-coffee drink politely.',
      de: 'Am Cafétisch bestellst du höflich einen Tee.',
    },
    pedagogicalGoal: 'Eine Servicebestellung mit je voudrais und un thé bilden.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Ohne Zucker',
      situation: 'Du sagst beim Getränk, dass du keinen Zucker möchtest.',
    },
    vibeVariants: {
      bright: brightFrenchP4Lesson003,
    },
  },
  {
    id: 'french-a1-practical-4-lesson-4-sans-sucre',
    pathId: GUIDED_TODAY_PATH_FRENCH_FOUR_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_FRENCH_FOUR_METADATA.title,
    level: GUIDED_TODAY_PATH_FRENCH_FOUR_METADATA.level,
    lessonNumber: 4,
    baseLanguage: GUIDED_TODAY_PATH_FRENCH_FOUR_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_FRENCH_FOUR_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_FRENCH_FOUR_METADATA,
    lessonMetadata: {
      id: 'french-a1-practical-4-lesson-4-sans-sucre',
      sequence: 4,
      title: 'Ohne Zucker',
    },
    title: 'Ohne Zucker',
    situation: {
      en: 'At a counter or table, specify that you want the drink without sugar.',
      de: 'Am Tresen oder Tisch sagst du, dass du das Getränk ohne Zucker möchtest.',
    },
    pedagogicalGoal: 'Die kurze Vorliebe sans sucre in höflichem Servicekontext abrufen.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Ist das frisch?',
      situation: 'Du fragst an der Auslage, ob etwas frisch ist.',
    },
    vibeVariants: {
      bright: brightFrenchP4Lesson004,
    },
  },
  {
    id: 'french-a1-practical-4-lesson-5-cest-frais',
    pathId: GUIDED_TODAY_PATH_FRENCH_FOUR_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_FRENCH_FOUR_METADATA.title,
    level: GUIDED_TODAY_PATH_FRENCH_FOUR_METADATA.level,
    lessonNumber: 5,
    baseLanguage: GUIDED_TODAY_PATH_FRENCH_FOUR_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_FRENCH_FOUR_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_FRENCH_FOUR_METADATA,
    lessonMetadata: {
      id: 'french-a1-practical-4-lesson-5-cest-frais',
      sequence: 5,
      title: 'Ist das frisch?',
    },
    title: 'Ist das frisch?',
    situation: {
      en: 'At a bakery or market counter, ask whether a visible food item is fresh.',
      de: 'An Bäckerei- oder Marktstand fragst du, ob ein sichtbares Lebensmittel frisch ist.',
    },
    pedagogicalGoal: 'Eine kurze Zustandsfrage mit c’est frais stellen.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Das ist alles',
      situation: 'Du beendest eine Bestellung nach der Nachfrage des Personals.',
    },
    vibeVariants: {
      bright: brightFrenchP4Lesson005,
    },
  },
  {
    id: 'french-a1-practical-4-lesson-6-cest-tout',
    pathId: GUIDED_TODAY_PATH_FRENCH_FOUR_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_FRENCH_FOUR_METADATA.title,
    level: GUIDED_TODAY_PATH_FRENCH_FOUR_METADATA.level,
    lessonNumber: 6,
    baseLanguage: GUIDED_TODAY_PATH_FRENCH_FOUR_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_FRENCH_FOUR_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_FRENCH_FOUR_METADATA,
    lessonMetadata: {
      id: 'french-a1-practical-4-lesson-6-cest-tout',
      sequence: 6,
      title: 'Das ist alles',
    },
    title: 'Das ist alles',
    situation: {
      en: 'At a cafe or shop counter, close the order after being asked if you want anything else.',
      de: 'Am Café- oder Ladentresen beendest du die Bestellung nach der Nachfrage des Personals.',
    },
    pedagogicalGoal: 'Eine höfliche Abschlussantwort mit non merci und c’est tout abrufen.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Zum Mitnehmen',
      situation: 'Du sagst, dass die Bestellung zum Mitnehmen ist.',
    },
    vibeVariants: {
      bright: brightFrenchP4Lesson006,
    },
  },
  {
    id: 'french-a1-practical-4-lesson-7-a-emporter',
    pathId: GUIDED_TODAY_PATH_FRENCH_FOUR_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_FRENCH_FOUR_METADATA.title,
    level: GUIDED_TODAY_PATH_FRENCH_FOUR_METADATA.level,
    lessonNumber: 7,
    baseLanguage: GUIDED_TODAY_PATH_FRENCH_FOUR_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_FRENCH_FOUR_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_FRENCH_FOUR_METADATA,
    lessonMetadata: {
      id: 'french-a1-practical-4-lesson-7-a-emporter',
      sequence: 7,
      title: 'Zum Mitnehmen',
    },
    title: 'Zum Mitnehmen',
    situation: {
      en: 'At a cafe counter, ask for the order to be takeaway rather than dine-in.',
      de: 'Am Cafétresen sagst du, dass die Bestellung zum Mitnehmen sein soll.',
    },
    pedagogicalGoal: 'Die feste Serviceformel à emporter korrekt einsetzen.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Es war sehr gut',
      situation: 'Du gibst nach dem Essen eine kurze positive Rückmeldung.',
    },
    vibeVariants: {
      bright: brightFrenchP4Lesson007,
    },
  },
  {
    id: 'french-a1-practical-4-lesson-8-cetait-bon',
    pathId: GUIDED_TODAY_PATH_FRENCH_FOUR_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_FRENCH_FOUR_METADATA.title,
    level: GUIDED_TODAY_PATH_FRENCH_FOUR_METADATA.level,
    lessonNumber: 8,
    baseLanguage: GUIDED_TODAY_PATH_FRENCH_FOUR_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_FRENCH_FOUR_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_FRENCH_FOUR_METADATA,
    lessonMetadata: {
      id: 'french-a1-practical-4-lesson-8-cetait-bon',
      sequence: 8,
      title: 'Es war sehr gut',
    },
    title: 'Es war sehr gut',
    situation: {
      en: 'After eating or drinking, give a brief positive verdict.',
      de: 'Nach Essen oder Getränk gibst du eine kurze positive Rückmeldung.',
    },
    pedagogicalGoal: 'Ein einfaches positives Urteil mit c’était très bon formulieren.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Schönes Wetter',
      situation: 'Du machst eine kurze Small-Talk-Zeile über das Wetter.',
    },
    vibeVariants: {
      bright: brightFrenchP4Lesson008,
    },
  },
  {
    id: 'french-a1-practical-4-lesson-9-il-fait-beau',
    pathId: GUIDED_TODAY_PATH_FRENCH_FOUR_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_FRENCH_FOUR_METADATA.title,
    level: GUIDED_TODAY_PATH_FRENCH_FOUR_METADATA.level,
    lessonNumber: 9,
    baseLanguage: GUIDED_TODAY_PATH_FRENCH_FOUR_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_FRENCH_FOUR_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_FRENCH_FOUR_METADATA,
    lessonMetadata: {
      id: 'french-a1-practical-4-lesson-9-il-fait-beau',
      sequence: 9,
      title: 'Schönes Wetter',
    },
    title: 'Schönes Wetter',
    situation: {
      en: 'At a cafe or shop counter, make one light small-talk line about the weather.',
      de: 'Am Café- oder Ladentresen machst du eine leichte Small-Talk-Bemerkung über das Wetter.',
    },
    pedagogicalGoal: 'Eine kurze Wetterbemerkung mit il fait beau abrufen.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Die Rechnung',
      situation: 'Du bittest am Ende des Essens um die Rechnung.',
    },
    vibeVariants: {
      bright: brightFrenchP4Lesson009,
    },
  },
  {
    id: 'french-a1-practical-4-lesson-10-laddition',
    pathId: GUIDED_TODAY_PATH_FRENCH_FOUR_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_FRENCH_FOUR_METADATA.title,
    level: GUIDED_TODAY_PATH_FRENCH_FOUR_METADATA.level,
    lessonNumber: 10,
    baseLanguage: GUIDED_TODAY_PATH_FRENCH_FOUR_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_FRENCH_FOUR_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_FRENCH_FOUR_METADATA,
    lessonMetadata: {
      id: 'french-a1-practical-4-lesson-10-laddition',
      sequence: 10,
      title: 'Die Rechnung',
    },
    title: 'Die Rechnung',
    situation: {
      en: 'At the end of a meal, ask politely for the bill.',
      de: 'Am Ende des Essens bittest du höflich um die Rechnung.',
    },
    pedagogicalGoal: 'Die französische Restaurantformel l’addition, s’il vous plaît abrufen.',
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: 'Pfad abgeschlossen',
      situation: 'Du hast French A1 Practical 4 abgeschlossen.',
    },
    vibeVariants: {
      bright: brightFrenchP4Lesson010,
    },
  },
]

export function getCurrentGuidedLesson(vibeId?: GuidedVibeId | string | null) {
  const lesson = getGuidedPathLessons(GUIDED_TODAY_PATH_ONE_METADATA.id)[0]
  if (!lesson) {
    throw new Error('No Guided Today lesson is configured.')
  }
  return resolveGuidedLessonVariant(lesson, vibeId)
}

export function getGuidedTodayPathOptions(): GuidedPathMetadata[] {
  return [
    GUIDED_TODAY_PATH_ONE_METADATA,
    GUIDED_TODAY_PATH_TWO_METADATA,
    GUIDED_TODAY_PATH_THREE_METADATA,
    GUIDED_TODAY_PATH_FOUR_METADATA,
    GUIDED_TODAY_PATH_FIVE_METADATA,
    GUIDED_TODAY_PATH_SIX_METADATA,
    GUIDED_TODAY_PATH_SEVEN_METADATA,
    GUIDED_TODAY_PATH_EIGHT_METADATA,
    GUIDED_TODAY_PATH_NINE_METADATA,
    GUIDED_TODAY_PATH_TEN_METADATA,
    GUIDED_TODAY_PATH_SPANISH_ONE_METADATA,
    GUIDED_TODAY_PATH_ITALIAN_ONE_METADATA,
    GUIDED_TODAY_PATH_ITALIAN_TWO_METADATA,
    GUIDED_TODAY_PATH_ITALIAN_THREE_METADATA,
    GUIDED_TODAY_PATH_FRENCH_ONE_METADATA,
    GUIDED_TODAY_PATH_FRENCH_TWO_METADATA,
    GUIDED_TODAY_PATH_FRENCH_THREE_METADATA,
    GUIDED_TODAY_PATH_FRENCH_FOUR_METADATA,
  ]
}

export function getGuidedPathLessons(pathId: string) {
  return GUIDED_LESSONS
    .filter((lesson) => lesson.pathId === pathId)
    .sort((a, b) => a.lessonNumber - b.lessonNumber)
}

export function getPathVibesAvailable(pathId: string): ActiveGuidedVibeId[] {
  const lessons = getGuidedPathLessons(pathId)
  if (lessons.length === 0) return []
  const union = new Set<ActiveGuidedVibeId>()
  for (const lesson of lessons) {
    for (const vibeId of Object.keys(lesson.vibeVariants)) {
      if (isActiveGuidedVibeId(vibeId)) union.add(vibeId)
    }
  }
  return ACTIVE_GUIDED_VIBE_IDS.filter((vibeId) => union.has(vibeId))
}

export const GUIDED_TARGET_LANGUAGE_SPEAK_LOCALES: Record<GuidedTargetLanguage, GuidedSpeakLocale[]> = {
  English: ['en-US', 'en-GB'],
  Spanish: ['es-ES'],
  Italian: ['it-IT'],
  French: ['fr-FR'],
}

export function getGuidedPathOverview(
  pathId: string,
  progress: TodayProgressState,
  vibeId?: GuidedVibeId | string | null,
  selectedLessonId?: string,
): GuidedPathOverview {
  const lessonDefinitions = getGuidedPathLessons(pathId)
  const completedLessonIds = new Set(progress.courses[pathId]?.completedLessonIds ?? [])
  const recommendedDefinition = lessonDefinitions.find((lesson) => !completedLessonIds.has(lesson.id))
  const selectedDefinition = lessonDefinitions.find((lesson) => lesson.id === selectedLessonId)
  const isComplete = lessonDefinitions.length > 0 && recommendedDefinition === undefined
  const effectiveSelectedDefinition = selectedDefinition
    ?? recommendedDefinition
    ?? lessonDefinitions[lessonDefinitions.length - 1]

  const lessons = lessonDefinitions.map((definition) => {
    const isCompleteLesson = completedLessonIds.has(definition.id)
    const isRecommended = !isComplete && definition.id === recommendedDefinition?.id
    const isSelected = definition.id === effectiveSelectedDefinition?.id
    const status: GuidedPathLessonCardStatus = isCompleteLesson
      ? 'complete'
      : isRecommended
        ? 'current'
        : 'not-started'

    return {
      lesson: resolveGuidedLessonVariant(definition, vibeId),
      status,
      isRecommended,
      isSelected,
      completedVibeIds: getCompletedGuidedLessonVibeIds(progress, pathId, definition.id),
    }
  })

  return {
    pathMetadata: lessonDefinitions[0]?.pathMetadata,
    lessons,
    recommendedLesson: recommendedDefinition
      ? resolveGuidedLessonVariant(recommendedDefinition, vibeId)
      : undefined,
    selectedLesson: effectiveSelectedDefinition
      ? resolveGuidedLessonVariant(effectiveSelectedDefinition, vibeId)
      : undefined,
    completedCount: lessonDefinitions.filter((lesson) => completedLessonIds.has(lesson.id)).length,
    totalLessons: lessonDefinitions.length,
    isComplete,
  }
}

export function getFirstIncompleteGuidedLesson(
  pathId: string,
  progress: TodayProgressState,
): GuidedLessonDefinition | undefined {
  const lessons = getGuidedPathLessons(pathId)
  const completedLessonIds = new Set(progress.courses[pathId]?.completedLessonIds ?? [])
  return lessons.find((lesson) => !completedLessonIds.has(lesson.id)) ?? lessons[0]
}

export function getNextGuidedLesson(
  pathId: string,
  currentLessonId: string,
): GuidedLessonDefinition | undefined {
  const lessons = getGuidedPathLessons(pathId)
  const currentIndex = lessons.findIndex((lesson) => lesson.id === currentLessonId)
  if (currentIndex < 0) return undefined
  return lessons[currentIndex + 1]
}

export function resolveGuidedLessonVariant(
  lesson: GuidedLessonDefinition,
  vibeId?: GuidedVibeId | string | null,
): GuidedLesson {
  const requestedVibeId = isActiveGuidedVibeId(vibeId) ? vibeId : DEFAULT_GUIDED_VIBE_ID
  const resolvedVibeId = lesson.vibeVariants[requestedVibeId]
    ? requestedVibeId
    : lesson.fallbackVibeId
  const variant = lesson.vibeVariants[resolvedVibeId] ?? lesson.vibeVariants[DEFAULT_GUIDED_VIBE_ID]

  if (!variant) {
    throw new Error(`Guided lesson ${lesson.id} has no selectable vibe variant.`)
  }

  return {
    ...lesson,
    courseId: lesson.pathId,
    sequence: lesson.lessonNumber,
    pathMetadata: {
      ...lesson.pathMetadata,
      estimatedMinutes: lesson.estimatedMinutes,
    },
    lessonMetadata: {
      ...lesson.lessonMetadata,
      sequence: lesson.lessonNumber,
    },
    vibeId: resolvedVibeId,
    variantContentStatus: variant.contentStatus,
    variantVisualNotes: variant.visualNotes,
    corePhrase: variant.corePhrase,
    phraseChunks: variant.chunks,
    lessonItems: variant.lessonItems,
    lessonMedia: materializeLessonMedia(variant),
    build: variant.build,
    typeRecall: variant.typeRecall,
    speak: variant.speakTarget,
    trophyWord: variant.trophyWord,
    sceneCaption: variant.sceneCaption,
    songSeed: variant.songSeed,
  }
}

export function normalizeGuidedAnswer(answer: string) {
  return answer.trim().replace(/\s+/g, ' ').toLowerCase()
}

export function guidedAnswerMatches(input: string, acceptedAnswers: string[]) {
  const normalizedInput = normalizeGuidedAnswer(input)
  if (!normalizedInput) return false
  return acceptedAnswers.some((answer) => normalizeGuidedAnswer(answer) === normalizedInput)
}

export function getGuidedMatchPairs(lesson: GuidedLesson): GuidedMatchPair[] {
  return lesson.phraseChunks.map((chunk) => ({
    id: chunk.id,
    targetText: chunk.targetText,
    baseText: chunk.baseText,
  }))
}

export function getDeterministicMatchColumns(lesson: GuidedLesson) {
  const pairs = getGuidedMatchPairs(lesson)
  const english = stableShufflePairs(pairs, `${lesson.id}:${lesson.vibeId}:match:english`)
  const germanCandidates = stableShufflePairs(pairs, `${lesson.id}:${lesson.vibeId}:match:german`)
  let german = createDerangedMatchColumn(english, germanCandidates)

  if (german.length === 0) {
    german = germanCandidates
  }

  return { english, german }
}

export function getDeterministicBuildChips(lesson: GuidedLesson) {
  const seed = `${lesson.id}:${lesson.vibeId}:build`
  let shuffled = lesson.build.chips
    .map((chip, index) => ({
      chip,
      index,
      sortKey: stableHash(`${seed}:${chip}:${index}`),
    }))
    .sort((left, right) => left.sortKey - right.sortKey)
    .map(({ chip, index }) => ({ chip, index }))

  if (shuffled.length < 2) return shuffled

  const unchangedPositions = shuffled.filter((entry, position) => entry.index === position).length
  const targetChipIndexes = getTargetBuildChipIndexes(lesson)
  const startsWithTargetOrder = hasTargetBuildOrderPrefix(shuffled, targetChipIndexes)

  if (unchangedPositions <= shuffled.length - 2 && !startsWithTargetOrder) return shuffled

  const offset = (stableHash(seed) % (shuffled.length - 1)) + 1
  shuffled = [...shuffled.slice(offset), ...shuffled.slice(0, offset)]
  if (!hasTargetBuildOrderPrefix(shuffled, targetChipIndexes)) {
    return shuffled
  }

  return [...shuffled.slice(offset), ...shuffled.slice(0, offset)]
}

export function getGuidedReviewItems(
  lesson: GuidedLesson,
  knownItemIds: Iterable<string>,
) {
  const knownIds = new Set(knownItemIds)
  return lesson.lessonItems.filter((item) => !knownIds.has(item.id))
}

export function getGuidedReviewChoices(
  lesson: GuidedLesson,
  item: LessonItem,
): GuidedReviewChoice[] {
  const itemById = new Map(lesson.lessonItems.map((lessonItem) => [lessonItem.id, lessonItem]))
  const explicitDistractors = item.reviewDistractorIds
    ?.map((id) => itemById.get(id))
    .filter((lessonItem): lessonItem is LessonItem => Boolean(lessonItem)) ?? []
  const fallbackDistractors = lesson.lessonItems.filter((lessonItem) => lessonItem.id !== item.id)
  const distractors = uniqueLessonItems([...explicitDistractors, ...fallbackDistractors])
    .filter((lessonItem) => lessonItem.id !== item.id)
    .slice(0, 2)

  return [
    { id: item.id, targetText: item.targetText, isCorrect: true },
    ...distractors.map((lessonItem) => ({
      id: lessonItem.id,
      targetText: lessonItem.targetText,
      isCorrect: false,
    })),
  ]
}

export function getGuidedTypeFallbackChoices(
  lesson: GuidedLesson,
): GuidedTypeFallbackChoice[] {
  return lesson.typeRecall.fallbackChoices.map((choice) => ({
    targetText: choice,
    isCorrect: guidedAnswerMatches(choice, lesson.typeRecall.acceptedAnswers),
  }))
}

function materializeLessonMedia(variant: GuidedLessonVibeVariant): GuidedLessonMedia {
  return {
    type: variant.placeholderMedia?.type ?? 'video',
    url: variant.videoUrl ?? variant.placeholderMedia?.url ?? '',
    posterUrl: variant.placeholderMedia?.posterUrl,
    caption: variant.placeholderMedia?.caption ?? variant.sceneCaption,
  }
}

function getCompletedGuidedLessonVibeIds(
  progress: TodayProgressState,
  pathId: string,
  lessonId: string,
): ActiveGuidedVibeId[] {
  const vibeCompletions = progress.courses[pathId]?.lessons[lessonId]?.vibeCompletions
  if (!vibeCompletions) return []

  return ACTIVE_GUIDED_VIBE_IDS.filter((vibeId) => Boolean(vibeCompletions[vibeId]?.completedAt))
}

function uniqueLessonItems(items: LessonItem[]) {
  const seen = new Set<string>()
  return items.filter((item) => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}

function stableShufflePairs(pairs: GuidedMatchPair[], seed: string) {
  return pairs
    .map((pair, index) => ({
      pair,
      sortKey: stableHash(`${seed}:${pair.id}:${index}`),
    }))
    .sort((left, right) => left.sortKey - right.sortKey)
    .map(({ pair }) => pair)
}

function createDerangedMatchColumn(
  english: GuidedMatchPair[],
  germanCandidates: GuidedMatchPair[],
) {
  const usedIds = new Set<string>()
  const result: GuidedMatchPair[] = []

  function place(position: number): boolean {
    if (position >= english.length) return true

    for (const candidate of germanCandidates) {
      if (usedIds.has(candidate.id) || candidate.id === english[position]?.id) continue
      usedIds.add(candidate.id)
      result[position] = candidate
      if (place(position + 1)) return true
      usedIds.delete(candidate.id)
      result.splice(position, 1)
    }

    return false
  }

  return place(0) ? result : []
}

function getTargetBuildChipIndexes(lesson: GuidedLesson) {
  const targetIndexes: number[] = []
  for (let index = 0; index < lesson.build.chips.length; index += 1) {
    targetIndexes.push(index)
    const candidate = targetIndexes.map((chipIndex) => lesson.build.chips[chipIndex]).join(' ')
    if (candidate === lesson.build.targetText) return targetIndexes
  }
  return []
}

function hasTargetBuildOrderPrefix(
  shuffled: Array<{ index: number }>,
  targetChipIndexes: number[],
) {
  return targetChipIndexes.length > 1
    && targetChipIndexes.every((chipIndex, position) => shuffled[position]?.index === chipIndex)
}

function stableHash(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}
