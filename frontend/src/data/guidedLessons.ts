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

export type GuidedPathMetadata = {
  id: string
  title: string
  shortTitle: string
  subtitle: string
  level: 'A1'
  baseLanguage: 'German'
  targetLanguage: 'English'
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
    germanPrompt?: string
    targetAnswer?: string
    acceptedAnswers?: string[]
    requiredTokens?: string[]
    optionalTokens?: string[]
    maxRecordingSeconds?: number
    language: 'en-US' | 'en-GB'
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
  baseLanguage: 'German'
  targetLanguage: 'English'
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

const GUIDED_TODAY_STEPS: GuidedLessonStep[] = ['scene', 'matchPairs', 'build', 'type', 'speak', 'complete']

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
    word: "ready",
    meaning: "bereit",
    example: "Ready for the train.",
    whyThisWord: "Ready passt zu Brights Vorwärtsgefühl: die Reise kann gleich weitergehen.",
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
    word: "quick",
    meaning: "schnell",
    example: "Quick reset.",
    whyThisWord: "Quick hält die Lektion im Sharp-Rhythmus: kurz stoppen, neu hören, weiter.",
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
    word: "straight",
    meaning: "gerade",
    example: "Straight ahead.",
    whyThisWord: "Straight ist Richtung und Haltung zugleich: keine Schleife, keine Ausschmückung.",
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
        trophyWord: trophy('maybe', 'vielleicht', 'Maybe, thank you.', 'Maybe trägt Wistfuls vorsichtige Hoffnung in der Hilfebitte.'),
        mediaCaption: "Ruhige Theke, gedimmtes Licht, ein kurzer Moment bevor die Bitte kommt.",
        songSeed: { genre: 'shoegaze pulse', mood: 'gentle repair' },
        visualNotes: 'Muted blue-gray, slow pause before understand, gentle replay pulse.',
      }),
      sharp: createA1P2VariantInput({
        targetText: "I don't understand. Help me, please.",
        baseText: "Ich verstehe das nicht. Helfen Sie mir bitte.",
        meaning: "Eine klare, kurze Aussage: Problem nennen, Hilfe holen.",
        chunks: [
          chunk('i-dont-understand', "I don't understand", 'ich verstehe das nicht'),
          chunk('help-me', 'Help me', 'helfen Sie mir'),
          chunk('please', 'please', 'bitte'),
        ],
        targetChips: ["I don't understand.", 'Help me,', 'please.'],
        distractors: ['quick', 'again'],
        typeRecall: recall('I don\'t ', 'understand', '. Help me, please.', ['understand', 'help me', 'quick', 'repeat']),
        sceneCaption: "Sharp verliert keine Zeit: Nicht verstanden, Hilfe gebraucht, bitte.",
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
        trophyWord: trophy('right', 'richtig', 'Right, thank you!', 'Right ist Brights helle, klare Bestätigung, wenn die Stelle gezeigt wird.'),
        mediaCaption: "Offene Karte auf einem Tisch, ein Finger zeigt den richtigen Ort.",
        songSeed: { genre: 'garage-pop handshake', mood: 'visible answer' },
        visualNotes: 'Map pin glow, friendly yellow path, warm confirmation beat.',
      }),
      wistful: createA1P2VariantInput({
        targetText: "Could you show me here, please?",
        baseText: "Könnten Sie es mir hier bitte zeigen?",
        meaning: "Eine vorsichtige Bitte, direkt auf dem Ding vor dir zu zeigen.",
        chunks: [
          chunk('could-you', 'Could you', 'könnten Sie'),
          chunk('show-me', 'show me', 'mir zeigen'),
          chunk('here-please', 'here, please', 'hier bitte'),
        ],
        targetChips: ['Could you', 'show me', 'here, please?'],
        distractors: ['somewhere', 'write'],
        typeRecall: recall('Could you ', 'show me', ' here, please?', ['show me', 'write down', 'here', 'again']),
        sceneCaption: "Wistful hält das Handy hin und bittet leise um den sichtbaren Punkt.",
        trophyWord: trophy('somewhere', 'irgendwo', 'Somewhere here?', 'Somewhere passt zum vorsichtigen Zeigen ohne sichere Stelle.'),
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
        trophyWord: trophy('easy', 'einfach', 'Easy, thank you.', 'Easy ist die kleine Erleichterung, wenn Bezahlen klappt.'),
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
        trophyWord: trophy('now', 'jetzt', 'Now, please.', 'Now ist Sharps klarer Zeitmarker im Zahlungsmoment.'),
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
        trophyWord: trophy('near', 'nah', 'Near the door.', 'Near bleibt einfach und passt zum fast abgeschlossenen Moment.'),
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
        trophyWord: trophy('straight', 'geradeaus', 'Straight, then left.', 'Straight ist ein klares Richtungswort für schnelle Wegkorrekturen.'),
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
        trophyWord: trophy('nearby', 'in der Nähe', 'Is it nearby?', 'Nearby ist ein sofort nützliches Wort für kurze Wege.'),
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
        trophyWord: trophy('slowly', 'langsam', 'Slowly is okay.', 'Slowly hält die Frage ruhig und körperlich realistisch.'),
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
        trophyWord: trophy('open', 'offen', 'Open now, thank you.', 'Open ist kurz, klar und im Alltag ständig nützlich.'),
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
        trophyWord: trophy('direct', 'direkt', 'Direct hours check.', 'Direct beschreibt den klaren Zugriff auf die Information.'),
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
        trophyWord: trophy('simple', 'einfach', 'Simple route, please.', 'Simple hält die Busfrage freundlich und machbar.'),
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
        targetText: "Is it just by the corner?",
        baseText: "Ist es gleich an der Ecke?",
        meaning: "Eine vorsichtige Frage nach der Ecke als Ziel.",
        chunks: [
          chunk('is-it', 'Is it', 'ist es'),
          chunk('just-by-the-corner', 'just by the corner', 'gleich an der Ecke'),
        ],
        targetChips: ['Is it', 'just by', 'the corner?'],
        distractors: ['quiet', 'station'],
        typeRecall: recall('Is it ', 'just by the corner', '?', ['just by the corner', 'near the station', 'quiet', 'street']),
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
        trophyWord: trophy('taxi', 'Taxi', 'Taxi now.', 'Taxi ist ein direktes Transportwort für schnelle Entscheidungen.'),
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
        trophyWord: trophy('clear', 'klar', 'Clear table request.', 'Clear passt zur schnellen, eindeutigen Tischfrage.'),
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
        trophyWord: trophy('quick', 'schnell', 'Quick scan.', 'Quick passt zum kurzen Blick über die Karte.'),
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
        trophyWord: trophy('careful', 'vorsichtig', 'Careful check.', 'Careful passt zur kleinen Nachfrage vor dem Kauf.'),
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
        trophyWord: trophy('today', 'heute', 'Fresh today.', 'Today ist hier die entscheidende Zeitangabe.'),
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
        trophyWord: trophy('done', 'erledigt', 'Done, thanks.', 'Done passt zum abgeschlossenen Bestellmoment.'),
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
        trophyWord: trophy('ready', 'bereit', 'Ready to go.', 'Ready passt zur verpackten Bestellung auf dem Tresen.'),
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
        trophyWord: trophy('kind', 'freundlich', 'That was kind.', 'Kind passt zur leisen Wertschätzung nach dem Service.'),
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
        trophyWord: trophy('brief', 'kurz', 'Brief note.', 'Brief passt zu Sharps Small Talk ohne Umwege.'),
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
        trophyWord: trophy('direct', 'direkt', 'Direct question.', 'Direct passt zur klaren Namensfrage ohne Umweg.'),
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
        trophyWord: trophy('delighted', 'erfreut', 'Delighted to meet you.', 'Delighted trägt die warme Freude beim Kennenlernen.'),
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
        trophyWord: trophy('gentle', 'sanft', 'Gentle question.', 'Gentle hält die lokale Frage freundlich und unaufdringlich.'),
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
        trophyWord: trophy('eager', 'gespannt', 'Eager invite.', 'Eager gibt der Einladung Wärme, ohne kindlich zu wirken.'),
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
        trophyWord: trophy('plan', 'Plan', 'Warm plan.', 'Plan ist das einfache Ziel dieser freundlichen Verabredung.'),
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
        trophyWord: trophy('careful', 'vorsichtig', 'I am careful now.', 'Careful hält die Situation ruhig und sicher.'),
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
        trophyWord: trophy('clear', 'klar', 'Clear words help.', 'Clear passt zur knappen, verständlichen Aussage.'),
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
        trophyWord: trophy('here', 'hier', 'Here is close.', 'Here hält die kurze Frage räumlich klar.'),
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
        trophyWord: trophy('careful', 'vorsichtig', 'Careful words help.', 'Careful passt zur knappen, respektvollen Bitte.'),
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
        trophyWord: trophy('slowly', 'langsam', 'Say it slowly.', 'Slowly passt, wenn du vorsichtig erklärst, wo etwas weh tut.'),
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
        trophyWord: trophy('wait', 'warten', 'Please wait a moment.', 'Wait passt zu einem ruhigen Moment am Tresen.'),
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
        trophyWord: trophy('rest', 'Ruhe', 'A short rest helps.', 'Rest ergänzt die kurze Bitte ohne Anweisung.'),
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
        trophyWord: trophy('nearby', 'in der Nähe', 'Is a doctor nearby?', 'Nearby hält die Frage praktisch und ortsbezogen.'),
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
        trophyWord: trophy('calm', 'ruhig', 'Stay calm.', 'Calm passt zu einer ruhigen Hilfe-Frage.'),
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
        trophyWord: trophy('clear', 'klar', 'Be clear.', 'Clear passt zu einer wichtigen, einfachen Information.'),
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
        trophyWord: trophy('safe', 'sicher', 'Keep it safe.', 'Safe erinnert daran, die wichtige Information ruhig zu nennen.'),
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
        trophyWord: trophy('calm', 'ruhig', 'Stay calm and ask.', 'Calm hält die Bitte ruhig und praktisch.'),
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
        trophyWord: trophy('urgent', 'dringend', 'It feels urgent.', 'Urgent beschreibt die Lage knapp, ohne sie auszuschmücken.'),
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
        trophyWord: trophy('helped', 'geholfen', 'You helped me.', 'Helped bleibt ein vertrautes Wort für Hilfe-Situationen.'),
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
        trophyWord: trophy('ready', 'bereit', 'I am ready now.', 'Ready passt zum ruhigen Abschluss der Situation.'),
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
        trophyWord: trophy('calm', 'ruhig', 'Calm now.', 'Calm passt zum kontrollierten Schluss.'),
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
        trophyWord: trophy('ready', 'bereit', 'Ready for the ticket.', 'Ready hält den kurzen Satz praktisch.'),
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
        trophyWord: trophy('nearby', 'in der Nähe', 'Is the bus nearby?', 'Nearby hilft bei kurzen Ortsfragen.'),
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
        trophyWord: trophy('time', 'Uhrzeit', 'What time does it leave?', 'Time passt zur einfachen Abfahrtsfrage.'),
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
        trophyWord: trophy('clear', 'klar', 'Clear time, please.', 'Clear passt zur direkten Zeitfrage.'),
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
        targetText: 'Am I on the right train?',
        baseText: 'Bin ich im richtigen Zug?',
        meaning: 'Eine vorsichtige Frage, ob du richtig bist.',
        chunks: [
          chunk('am-i-on', 'Am I on', 'bin ich in'),
          chunk('the-right', 'the right', 'dem richtigen'),
          chunk('train', 'train', 'Zug'),
        ],
        extraLessonItems: [
          chunk('right', 'right', 'richtig'),
          chunk('careful', 'careful', 'vorsichtig'),
          chunk('wait', 'wait', 'warten'),
          chunk('help', 'help', 'Hilfe'),
        ],
        targetChips: ['Am I on', 'the right', 'train?'],
        distractors: ['wrong bus?', 'good café?'],
        typeRecall: recall('Am I on the right ', 'train', '?', ['train', 'bus', 'taxi', 'street']),
        sceneCaption: 'Wistful fragt vorsichtig, ob der Zug stimmt.',
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
        trophyWord: trophy('careful', 'vorsichtig', 'Be careful with the train.', 'Careful passt zur kurzen Kontrolle vor dem Einstieg.'),
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
        trophyWord: trophy('careful', 'vorsichtig', 'Careful travel is good.', 'Careful passt zur ruhigen Taxi-Bitte.'),
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
        targetText: 'Could we go there, please?',
        baseText: 'Könnten wir bitte dorthin fahren?',
        meaning: 'Eine sanfte Bitte zum Ziel.',
        chunks: [
          chunk('could-we-go', 'Could we go', 'könnten wir fahren'),
          chunk('there', 'there', 'dorthin'),
          chunk('please', 'please', 'bitte'),
        ],
        extraLessonItems: [
          chunk('please', 'please', 'bitte'),
          chunk('there', 'there', 'dorthin'),
          chunk('slowly', 'slowly', 'langsam'),
          chunk('careful', 'careful', 'vorsichtig'),
        ],
        targetChips: ['Could we go', 'there,', 'please?'],
        distractors: ['tomorrow', 'by train'],
        typeRecall: recall('Could we go ', 'there', ', please?', ['there', 'nearby', 'home', 'slowly']),
        sceneCaption: 'Wistful bittet ruhig darum, dorthin zu fahren.',
        trophyWord: trophy('please', 'bitte', 'Could we go there, please?', 'Please macht die Frage weich und höflich.'),
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
        trophyWord: trophy('here', 'hier', 'Could we stop here?', 'Here macht den Ort kurz und klar.'),
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
        trophyWord: trophy('wait', 'warten', 'Wait here, please.', 'Wait bleibt ein vertrauter ruhiger Bewegungsanker.'),
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
        targetText: 'I need to go to the station.',
        baseText: 'Ich muss zum Bahnhof.',
        meaning: 'Eine vorsichtige Aussage über das Ziel.',
        chunks: [
          chunk('i-need-to-go', 'I need to go', 'ich muss gehen'),
          chunk('to-the-station', 'to the station', 'zum Bahnhof'),
        ],
        extraLessonItems: [
          chunk('slowly', 'slowly', 'langsam'),
          chunk('station', 'station', 'Bahnhof'),
          chunk('wait', 'wait', 'warten'),
          chunk('help', 'help', 'Hilfe'),
        ],
        targetChips: ['I need to go', 'to the station.'],
        distractors: ['to the menu', 'for water'],
        typeRecall: recall('I need to go to the ', 'station', '.', ['station', 'shop', 'taxi', 'table']),
        sceneCaption: 'Wistful sagt leise, dass er zum Bahnhof muss.',
        trophyWord: trophy('slowly', 'langsam', 'Please go slowly.', 'Slowly passt zur vorsichtigen Fahrt zum Bahnhof.'),
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
        trophyWord: trophy('there', 'dorthin', 'Take me there.', 'There bleibt der kurze Zielanker.'),
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
        trophyWord: trophy('take', 'dauern', 'How long does it take?', 'Take ist der Kern dieser Dauerfrage.'),
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
        trophyWord: trophy('clear', 'klar', 'A clear time helps.', 'Clear passt zur ruhigen Frage nach der Dauer.'),
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
        trophyWord: trophy('time', 'Zeit', 'How much time?', 'Time ist der einfache Anker für Dauer.'),
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
        trophyWord: trophy('better', 'besser', 'I feel better now.', 'Better passt zum ruhigen Abschluss nach der Ankunft.'),
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
        trophyWord: trophy('safe', 'sicher', 'I have arrived safe.', 'Safe hält den Abschluss ruhig, ohne mehr zu behaupten.'),
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
        targetText: 'I think I have a reservation.',
        baseText: 'Ich glaube, ich habe eine Reservierung.',
        meaning: 'Ein vorsichtiger Check-in-Satz, wenn du unsicher bist.',
        chunks: [
          chunk('i-think', 'I think', 'ich glaube'),
          chunk('i-have', 'I have', 'ich habe'),
          chunk('a-reservation', 'a reservation', 'eine Reservierung'),
        ],
        extraLessonItems: [
          chunk('careful', 'careful', 'vorsichtig'),
          chunk('reservation', 'reservation', 'Reservierung'),
          chunk('help', 'help', 'Hilfe'),
          chunk('night', 'night', 'Nacht'),
        ],
        targetChips: ['I think', 'I have', 'a reservation.'],
        distractors: ['a taxi', 'breakfast'],
        typeRecall: recall('I think I have a ', 'reservation', '.', ['reservation', 'ticket', 'key', 'towel']),
        sceneCaption: 'Wistful fragt vorsichtig nach der Reservierung.',
        trophyWord: trophy('careful', 'vorsichtig', 'Careful check-in is fine.', 'Careful passt zum ruhigen Start an der Rezeption.'),
        mediaCaption: 'Ruhige Hotelrezeption, vorsichtige Frage nach der Reservierung.',
        songSeed: { genre: 'soft indie folk', mood: 'careful hotel check-in' },
        visualNotes: 'Soft lobby light, small pause, reservation cue.',
      }),
      sharp: createA1P8VariantInput({
        targetText: 'I have a reservation here.',
        baseText: 'Ich habe hier eine Reservierung.',
        meaning: 'Ein klarer Satz an der Rezeption.',
        chunks: [
          chunk('i-have', 'I have', 'ich habe'),
          chunk('a-reservation', 'a reservation', 'eine Reservierung'),
          chunk('here', 'here', 'hier'),
        ],
        extraLessonItems: [
          chunk('ready', 'ready', 'bereit'),
          chunk('hotel', 'hotel', 'Hotel'),
          chunk('clear', 'clear', 'klar'),
          chunk('reservation', 'reservation', 'Reservierung'),
        ],
        targetChips: ['I have', 'a reservation', 'here.'],
        distractors: ['a taxi', 'there'],
        typeRecall: recall('I have a ', 'reservation', ' here.', ['reservation', 'ticket', 'room', 'bus']),
        sceneCaption: 'Sharp bleibt klar und sachlich beim Check-in.',
        trophyWord: trophy('ready', 'bereit', 'I am ready to check in.', 'Ready hält den Check-in praktisch und ruhig.'),
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
        trophyWord: trophy('night', 'Nacht', 'A quiet night helps.', 'Night passt zur vorsichtigen Zimmerfrage.'),
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
        trophyWord: trophy('hotel', 'Hotel', 'Where is my hotel room?', 'Hotel bleibt der klare Ort der Szene.'),
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
        trophyWord: trophy('where', 'wo', 'Where is my room?', 'Where hilft bei kurzen Ortsfragen im Hotel.'),
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
        trophyWord: trophy('right', 'richtig', 'Show me the right room.', 'Right passt zur klaren Orientierung im Hotel.'),
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
        trophyWord: trophy('help', 'Hilfe', 'Help with the key, please.', 'Help passt zur vorsichtigen Frage an der Rezeption.'),
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
        trophyWord: trophy('clear', 'klar', 'The key, please.', 'Clear passt zur kurzen Schlüsselbitte.'),
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
        trophyWord: trophy('clear', 'klar', 'Clear Wi-Fi helps.', 'Clear passt zur kurzen Frage nach Zugang.'),
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
        trophyWord: trophy('direct', 'direkt', 'Can I use the Wi-Fi?', 'Direct passt zur klaren Nutzungsfrage.'),
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
        trophyWord: trophy('here', 'hier', 'Is the bathroom here?', 'Here hilft bei kurzen Ortsfragen.'),
        mediaCaption: 'Gedämpfter Flur, ruhige Frage nach dem Bad.',
        songSeed: { genre: 'soft indie folk', mood: 'careful bathroom ask' },
        visualNotes: 'Soft hallway, bathroom icon, small question.',
      }),
      sharp: createA1P8VariantInput({
        targetText: 'Please show me the bathroom.',
        baseText: 'Bitte zeigen Sie mir das Bad.',
        meaning: 'Eine direkte, höfliche Bitte.',
        chunks: [
          chunk('please-show-me', 'Please show me', 'bitte zeigen Sie mir'),
          chunk('the-bathroom', 'the bathroom', 'das Bad'),
        ],
        extraLessonItems: [
          chunk('straight', 'straight', 'geradeaus'),
          chunk('bathroom', 'bathroom', 'Bad'),
          chunk('where', 'where', 'wo'),
          chunk('clear', 'clear', 'klar'),
        ],
        targetChips: ['Please show me', 'the bathroom.'],
        distractors: ['the taxi', 'the ticket'],
        typeRecall: recall('Please show me the ', 'bathroom', '.', ['bathroom', 'train', 'room', 'menu']),
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
        trophyWord: trophy('wait', 'warten', 'I can wait for a towel.', 'Wait passt zur ruhigen Bitte im Zimmer.'),
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
        trophyWord: trophy('ready', 'bereit', 'I am ready to sleep.', 'Ready passt zum ruhigen Abschluss des Tages.'),
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
        trophyWord: trophy('night', 'Nacht', 'I need sleep tonight.', 'Night hält den Satz praktisch und menschlich.'),
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
        trophyWord: trophy('time', 'Zeit', 'Breakfast time, please.', 'Time ist der kurze Anker für diese Frage.'),
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
        trophyWord: trophy('arrived', 'angekommen', 'I arrived, and now I leave.', 'Arrived knüpft an den ruhigen Reiseabschluss an.'),
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
        trophyWord: trophy('done', 'fertig', 'I am done here.', 'Done passt zum knappen Abschluss beim Checkout.'),
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
  ]
}

export function getGuidedPathLessons(pathId: string) {
  return GUIDED_LESSONS
    .filter((lesson) => lesson.pathId === pathId)
    .sort((a, b) => a.lessonNumber - b.lessonNumber)
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
