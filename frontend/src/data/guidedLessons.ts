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
    { id: "nice", targetText: "nice", baseText: "schÃ¶n / nett", acceptedAnswers: ["nice"] },
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
        baseText: "Hallo, ich verstehe das nicht. Koennten Sie mir helfen?",
        meaning: "Eine warme, ehrliche Bitte um Hilfe, wenn der Sinn noch nicht klar ist.",
        chunks: [
          chunk('hi-there', 'Hi there', 'Hallo'),
          chunk('i-dont-understand', "I don't understand", 'ich verstehe das nicht'),
          chunk('could-you-help-me', 'Could you help me', 'koennten Sie mir helfen'),
        ],
        targetChips: ['Hi there,', "I don't understand.", 'Could you help me?'],
        distractors: ['again', 'lovely'],
        typeRecall: recall('Hi there, I don\'t ', 'understand', '. Could you help me?', ['understand', 'help me', 'again', 'English']),
        sceneCaption: "Im kleinen Laden bleibt Bright offen: erst ehrlich sein, dann freundlich um Hilfe bitten.",
        trophyWord: trophy('lovely', 'nett', 'Lovely, thank you.', 'Lovely macht die Hilfe warm, ohne kindlich zu werden.'),
        mediaCaption: "Heller Laden, kurzer Blick auf ein Schild, dann die freundliche Bitte um Hilfe.",
        songSeed: { genre: 'light acoustic pop', mood: 'open and helped' },
        visualNotes: 'Warm daylight, open hand cue, soft yellow focus on help me.',
      }),
      wistful: createA1P2VariantInput({
        targetText: "Sorry, I don't understand. Could you help me?",
        baseText: "Entschuldigung, ich verstehe das nicht. Koennten Sie mir helfen?",
        meaning: "Eine leise, ehrliche Bitte, wenn du den Sinn nicht greifen kannst.",
        chunks: [
          chunk('sorry', 'Sorry', 'Entschuldigung'),
          chunk('i-dont-understand', "I don't understand", 'ich verstehe das nicht'),
          chunk('could-you-help-me', 'Could you help me', 'koennten Sie mir helfen'),
        ],
        targetChips: ['Sorry,', "I don't understand.", 'Could you help me?'],
        distractors: ['slowly', 'quiet'],
        typeRecall: recall('Sorry, I don\'t ', 'understand', '. Could you help me?', ['understand', 'again', 'slowly', 'please']),
        sceneCaption: "Wistful gibt kurz zu, dass der Sinn fehlt, und laesst die Bitte ruhig stehen.",
        trophyWord: trophy('gently', 'sanft', 'Gently, please.', 'Gently haelt die Bitte weich und trotzdem praktisch.'),
        mediaCaption: "Ruhige Theke, gedimmtes Licht, ein kurzer Moment bevor die Bitte kommt.",
        songSeed: { genre: 'soft indie folk', mood: 'gentle repair' },
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
        trophyWord: trophy('clear', 'klar', 'Clear, thank you.', 'Clear passt zu Sharps Ziel: die Lage schnell klar machen.'),
        mediaCaption: "Klares Schild, kurze Rueckfrage, direkter Blick zur Person am Schalter.",
        songSeed: { genre: 'minimal synth pulse', mood: 'clear repair' },
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
        baseText: "Koennten Sie es bitte aufschreiben?",
        meaning: "Eine freundliche Bitte, eine wichtige Information schriftlich zu bekommen.",
        chunks: [
          chunk('could-you', 'Could you', 'koennten Sie'),
          chunk('write-it-down', 'write it down', 'es aufschreiben'),
          chunk('please', 'please', 'bitte'),
        ],
        targetChips: ['Could you', 'write it down,', 'please?'],
        distractors: ['glad', 'show me'],
        typeRecall: recall('Could you ', 'write it down', ', please?', ['write it down', 'write', 'down', 'show me']),
        sceneCaption: "Bright laesst die Info nicht verschwinden und bittet freundlich um Schrift.",
        trophyWord: trophy('glad', 'froh', "I'm glad, thank you.", 'Glad passt zu Brights erleichtertem Dank nach der Hilfe.'),
        mediaCaption: "Notizblock am Tresen, Stift in der Hand, die Information wird festgehalten.",
        songSeed: { genre: 'sunny indie pop', mood: 'helpful and light' },
        visualNotes: 'Paper cue, warm pen stroke, compact written-word highlight.',
      }),
      wistful: createA1P2VariantInput({
        targetText: "Could you write it down for me?",
        baseText: "Koennten Sie es fuer mich aufschreiben?",
        meaning: "Eine weichere Bitte, weil Gesprochenes zu schnell wieder weg ist.",
        chunks: [
          chunk('could-you', 'Could you', 'koennten Sie'),
          chunk('write-it-down', 'write it down', 'es aufschreiben'),
          chunk('for-me', 'for me', 'fuer mich'),
        ],
        targetChips: ['Could you', 'write it down', 'for me?'],
        distractors: ['perhaps', 'again'],
        typeRecall: recall('Could you ', 'write it down', ' for me?', ['write it down', 'again', 'for me', 'say it']),
        sceneCaption: "Wistful bittet um eine kleine Spur auf Papier, damit der Moment bleibt.",
        trophyWord: trophy('slowly', 'langsam', 'Slowly, please.', 'Slowly erinnert daran, dass Tempo Teil der Hilfe ist.'),
        mediaCaption: "Ein ruhiger Stift ueber Papier, die Adresse wird langsam lesbar.",
        songSeed: { genre: 'soft indie folk', mood: 'quiet written help' },
        visualNotes: 'Soft paper texture, slower motion, blue-gray ink line.',
      }),
      sharp: createA1P2VariantInput({
        targetText: "Write it down, please.",
        baseText: "Schreiben Sie es bitte auf.",
        meaning: "Eine knappe, hoefliche Anweisung, wenn die Information genau sein muss.",
        chunks: [
          chunk('write', 'Write', 'schreiben Sie'),
          chunk('it-down', 'it down', 'es auf'),
          chunk('please', 'please', 'bitte'),
        ],
        targetChips: ['Write', 'it down,', 'please.'],
        distractors: ['quick', 'show'],
        typeRecall: recall('', 'Write it down', ', please.', ['Write it down', 'write', 'quick', 'show me']),
        sceneCaption: "Sharp macht aus der Bitte einen klaren naechsten Schritt: aufschreiben.",
        trophyWord: trophy('quick', 'schnell', 'Quick note, please.', 'Quick haelt den Moment kurz und zielgerichtet.'),
        mediaCaption: "Schalterkante, Stift, kurze Notiz, keine Umwege.",
        songSeed: { genre: 'minimal synth pulse', mood: 'quick note' },
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
        baseText: "Koennten Sie es mir auf der Karte zeigen?",
        meaning: "Eine freundliche Bitte, etwas sichtbar zu machen.",
        chunks: [
          chunk('could-you', 'Could you', 'koennten Sie'),
          chunk('show-me', 'show me', 'mir zeigen'),
          chunk('on-the-map', 'on the map', 'auf der Karte'),
        ],
        targetChips: ['Could you', 'show me', 'on the map?'],
        distractors: ['brilliant', 'write'],
        typeRecall: recall('Could you ', 'show me', ' on the map?', ['show me', 'write it', 'map', 'help me']),
        sceneCaption: "Bright macht die Hilfe sichtbar: ein Finger auf der Karte reicht.",
        trophyWord: trophy('brilliant', 'prima', 'Brilliant, thank you.', 'Brilliant ist Brights kurzer, warmer Erfolgston.'),
        mediaCaption: "Offene Karte auf einem Tisch, ein Finger zeigt den richtigen Ort.",
        songSeed: { genre: 'light acoustic pop', mood: 'visible answer' },
        visualNotes: 'Map pin glow, friendly yellow path, warm confirmation beat.',
      }),
      wistful: createA1P2VariantInput({
        targetText: "Could you show me here, please?",
        baseText: "Koennten Sie es mir hier bitte zeigen?",
        meaning: "Eine vorsichtige Bitte, direkt auf dem Ding vor dir zu zeigen.",
        chunks: [
          chunk('could-you', 'Could you', 'koennten Sie'),
          chunk('show-me', 'show me', 'mir zeigen'),
          chunk('here-please', 'here, please', 'hier bitte'),
        ],
        targetChips: ['Could you', 'show me', 'here, please?'],
        distractors: ['perhaps', 'write'],
        typeRecall: recall('Could you ', 'show me', ' here, please?', ['show me', 'write down', 'here', 'again']),
        sceneCaption: "Wistful haelt das Handy hin und bittet leise um den sichtbaren Punkt.",
        trophyWord: trophy('perhaps', 'vielleicht', 'Perhaps here?', 'Perhaps gibt Wistful eine vorsichtige, echte Frageform.'),
        mediaCaption: "Handybildschirm im Halbdunkel, ein vorsichtiger Finger zeigt auf die Stelle.",
        songSeed: { genre: 'soft indie folk', mood: 'soft pointing' },
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
        distractors: ['exactly', 'write'],
        typeRecall: recall('', 'Show me', ' on the map, please.', ['Show me', 'write it', 'map', 'again']),
        sceneCaption: "Sharp will den Punkt sehen, nicht darueber reden.",
        trophyWord: trophy('exactly', 'genau', 'Exactly there.', 'Exactly passt, wenn die Stelle klar gezeigt ist.'),
        mediaCaption: "Karte, Zielpunkt, klare Linie vom Finger zum Ort.",
        songSeed: { genre: 'minimal synth pulse', mood: 'exact location' },
        visualNotes: 'Crisp pointer line, hard map crop, exact target dot.',
      }),
    },
  },
  {
    slug: 'which-one',
    title: 'Which one?',
    situation: {
      en: "You choose between two visible options.",
      de: "Du waehlst zwischen zwei sichtbaren Optionen.",
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
        distractors: ['ready', 'where'],
        typeRecall: recall('Which one is better, ', 'this one', ' or that one?', ['this one', 'that one', 'better', 'ready']),
        sceneCaption: "Bright macht die Wahl leicht: zwei Dinge, eine freundliche Frage.",
        trophyWord: trophy('ready', 'bereit', "I'm ready.", 'Ready zeigt, dass Bright nach der Wahl direkt weiter kann.'),
        mediaCaption: "Zwei Gebaeckstuecke im Schaufenster, die Wahl liegt sichtbar da.",
        songSeed: { genre: 'sunny indie pop', mood: 'friendly choice' },
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
        distractors: ['quiet', 'better'],
        typeRecall: recall('Perhaps ', 'this one', ' or that one?', ['this one', 'that one', 'perhaps', 'again']),
        sceneCaption: "Wistful laesst die Wahl offen, ohne die Situation schwer zu machen.",
        trophyWord: trophy('quiet', 'ruhig', 'A quiet choice.', 'Quiet passt zu Wistfuls leiser Entscheidungsenergie.'),
        mediaCaption: "Zwei kleine Optionen im weichen Licht, ein kurzer unsicherer Blick.",
        songSeed: { genre: 'soft indie folk', mood: 'quiet choice' },
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
        distractors: ['ready', 'please'],
        typeRecall: recall('', 'Which one', ': this or that?', ['Which one', 'this or that', 'ready', 'please']),
        sceneCaption: "Sharp reduziert die Auswahl auf zwei Punkte: dieses oder jenes.",
        trophyWord: trophy('ready', 'bereit', 'Ready to choose.', 'Ready haelt die Wahl kurz und handlungsnah.'),
        mediaCaption: "Zwei klare Produktkanten, kurzer Blick, schnelle Entscheidung.",
        songSeed: { genre: 'minimal synth pulse', mood: 'binary choice' },
        visualNotes: 'Hard A/B framing, crisp cursor, no decoration.',
      }),
    },
  },
  {
    slug: 'do-you-have',
    title: 'Do you have...?',
    situation: {
      en: "You ask whether a shop, cafe, or desk has the thing you need.",
      de: "Du fragst, ob ein Laden, Cafe oder Schalter das hat, was du brauchst.",
    },
    pedagogicalGoal: "Ask if something is available.",
    variants: {
      bright: createA1P2VariantInput({
        targetText: "Hi, do you have this?",
        baseText: "Hallo, haben Sie das hier?",
        meaning: "Eine freundliche Verfuegbarkeitsfrage mit dem Ding direkt vor dir.",
        chunks: [
          chunk('hi', 'Hi', 'Hallo'),
          chunk('do-you-have', 'do you have', 'haben Sie'),
          chunk('this', 'this', 'das hier'),
        ],
        targetChips: ['Hi,', 'do you have', 'this?'],
        distractors: ['charming', 'where'],
        typeRecall: recall('Hi, do you ', 'have this', '?', ['have this', 'show this', 'this', 'where']),
        sceneCaption: "Bright fragt offen und zeigt auf das, was gebraucht wird.",
        trophyWord: trophy('charming', 'nett', 'Charming, thanks.', 'Charming gibt Bright eine warme Laden-Note ohne Uebertreibung.'),
        mediaCaption: "Kleiner Laden, Artikel in der Hand, offene Frage an die Theke.",
        songSeed: { genre: 'light acoustic pop', mood: 'warm availability' },
        visualNotes: 'Shelf highlight, friendly hand cue, soft coral item outline.',
      }),
      wistful: createA1P2VariantInput({
        targetText: "Do you have this, perhaps?",
        baseText: "Haben Sie das hier vielleicht?",
        meaning: "Eine vorsichtige Frage, ob etwas verfuegbar ist.",
        chunks: [
          chunk('do-you-have', 'Do you have', 'haben Sie'),
          chunk('this', 'this', 'das hier'),
          chunk('perhaps', 'perhaps', 'vielleicht'),
        ],
        targetChips: ['Do you have', 'this,', 'perhaps?'],
        distractors: ['soft', 'where'],
        typeRecall: recall('Do you ', 'have this', ', perhaps?', ['have this', 'this', 'perhaps', 'show me']),
        sceneCaption: "Wistful fragt behutsam, als koennte die Antwort auch nein sein.",
        trophyWord: trophy('soft', 'sanft', 'Soft answer, thank you.', 'Soft haelt die Frage vorsichtig, aber nutzbar.'),
        mediaCaption: "Regallicht, ein Gegenstand in der Hand, die Frage bleibt klein.",
        songSeed: { genre: 'soft indie folk', mood: 'soft availability' },
        visualNotes: 'Muted shelf, small maybe cue, gentle item glow.',
      }),
      sharp: createA1P2VariantInput({
        targetText: "Do you have this?",
        baseText: "Haben Sie das hier?",
        meaning: "Eine direkte Verfuegbarkeitsfrage.",
        chunks: [
          chunk('do-you-have', 'Do you have', 'haben Sie'),
          chunk('this', 'this', 'das hier'),
        ],
        targetChips: ['Do you have', 'this?'],
        distractors: ['certain', 'please'],
        typeRecall: recall('Do you ', 'have this', '?', ['have this', 'this', 'certain', 'where']),
        sceneCaption: "Sharp fragt genau nach dem Gegenstand, ohne Zusatz.",
        trophyWord: trophy('certain', 'sicher', 'Certain, thanks.', 'Certain passt zu Sharps Wunsch nach einer eindeutigen Antwort.'),
        mediaCaption: "Produkt in der Hand, Blick zur Kasse, klare Ja-oder-nein-Frage.",
        songSeed: { genre: 'minimal synth pulse', mood: 'available or not' },
        visualNotes: 'Clean product crop, yes/no contrast, hard edge around this.',
      }),
    },
  },
  {
    slug: 'by-card',
    title: 'By card',
    situation: {
      en: "You reach the payment moment and need card or cash language.",
      de: "Du bist beim Bezahlen und brauchst Sprache fuer Karte oder Bargeld.",
    },
    pedagogicalGoal: "Ask to pay by card or cash.",
    variants: {
      bright: createA1P2VariantInput({
        targetText: "Could I pay by card, please?",
        baseText: "Koennte ich bitte mit Karte bezahlen?",
        meaning: "Eine freundliche Zahlungsfrage an der Kasse.",
        chunks: [
          chunk('could-i-pay', 'Could I pay', 'koennte ich bezahlen'),
          chunk('by-card', 'by card', 'mit Karte'),
          chunk('please', 'please', 'bitte'),
        ],
        targetChips: ['Could I pay', 'by card,', 'please?'],
        distractors: ['easy', 'cash'],
        typeRecall: recall('Could I ', 'pay by card', ', please?', ['pay by card', 'pay cash', 'card', 'easy']),
        sceneCaption: "Bright erreicht die Kasse und fragt freundlich nach Karte.",
        trophyWord: trophy('easy', 'einfach', 'Easy, thank you.', 'Easy ist die kleine Erleichterung, wenn Bezahlen klappt.'),
        mediaCaption: "Kontaktloses Kartenlesegeraet, heller Tresen, kurzer Zahlungsblick.",
        songSeed: { genre: 'sunny indie pop', mood: 'easy payment' },
        visualNotes: 'Card tap glow, warm receipt edge, bright payment confirmation.',
      }),
      wistful: createA1P2VariantInput({
        targetText: "Could I pay by card, perhaps?",
        baseText: "Koennte ich vielleicht mit Karte bezahlen?",
        meaning: "Eine ruhige Frage, ob Karte in Ordnung ist.",
        chunks: [
          chunk('could-i-pay', 'Could I pay', 'koennte ich bezahlen'),
          chunk('by-card', 'by card', 'mit Karte'),
          chunk('perhaps', 'perhaps', 'vielleicht'),
        ],
        targetChips: ['Could I pay', 'by card,', 'perhaps?'],
        distractors: ['again', 'cash'],
        typeRecall: recall('Could I ', 'pay by card', ', perhaps?', ['pay by card', 'card', 'cash', 'again']),
        sceneCaption: "Wistful fragt leise, bevor die Karte den Leser beruehrt.",
        trophyWord: trophy('again', 'noch einmal', 'Again, please.', 'Again bleibt ein nuetzliches Reparaturwort im Bezahlmoment.'),
        mediaCaption: "Kartenleser im weichen Licht, ein kurzer fragender Blick.",
        songSeed: { genre: 'soft indie folk', mood: 'careful payment' },
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
        distractors: ['straight', 'cash'],
        typeRecall: recall('', 'Card', ', please.', ['Card', 'cash', 'receipt', 'straight']),
        sceneCaption: "Sharp klaert die Zahlungsart, bevor Zeit verloren geht.",
        trophyWord: trophy('straight', 'direkt', 'Straight to payment.', 'Straight beschreibt die direkte Zahlungsloesung.'),
        mediaCaption: "Kartenleser, klare Handbewegung, direkte Zahlungsfrage.",
        songSeed: { genre: 'minimal synth pulse', mood: 'straight payment' },
        visualNotes: 'Crisp terminal crop, straight line to card, no soft extras.',
      }),
    },
  },
  {
    slug: 'a-receipt-please',
    title: 'A receipt, please',
    situation: {
      en: "You need a receipt, a bag, or both before leaving.",
      de: "Du brauchst vor dem Gehen eine Quittung, eine Tuete oder beides.",
    },
    pedagogicalGoal: "Ask for a receipt or bag.",
    variants: {
      bright: createA1P2VariantInput({
        targetText: "A receipt, please, and a bag.",
        baseText: "Eine Quittung bitte, und eine Tuete.",
        meaning: "Eine freundliche Zusatzbitte kurz vor dem Gehen.",
        chunks: [
          chunk('a-receipt', 'A receipt', 'eine Quittung'),
          chunk('please', 'please', 'bitte'),
          chunk('and-a-bag', 'and a bag', 'und eine Tuete'),
        ],
        targetChips: ['A receipt,', 'please,', 'and a bag.'],
        distractors: ['splendid', 'card'],
        typeRecall: recall('A ', 'receipt', ', please, and a bag.', ['receipt', 'bag', 'card', 'splendid']),
        sceneCaption: "Bright erinnert sich rechtzeitig und fragt warm nach Quittung und Tuete.",
        trophyWord: trophy('splendid', 'prima', 'Splendid, thank you.', 'Splendid gibt dem kleinen Zusatz einen hellen Abschluss.'),
        mediaCaption: "Kasse, Quittungsrolle, kleine Tuete am Rand des Tresens.",
        songSeed: { genre: 'light acoustic pop', mood: 'small extra' },
        visualNotes: 'Receipt curl, bag outline, warm thank-you beat.',
      }),
      wistful: createA1P2VariantInput({
        targetText: "A receipt, please. And a bag?",
        baseText: "Eine Quittung bitte. Und eine Tuete?",
        meaning: "Eine kleine Zusatzfrage, fast schon beim Weggehen.",
        chunks: [
          chunk('a-receipt', 'A receipt', 'eine Quittung'),
          chunk('please', 'please', 'bitte'),
          chunk('and-a-bag', 'And a bag', 'und eine Tuete'),
        ],
        targetChips: ['A receipt,', 'please.', 'And a bag?'],
        distractors: ['near', 'card'],
        typeRecall: recall('A ', 'receipt', ', please. And a bag?', ['receipt', 'bag', 'card', 'again']),
        sceneCaption: "Wistful haelt kurz inne und fuegt die Tuete vorsichtig hinzu.",
        trophyWord: trophy('near', 'nah', 'Near the door.', 'Near bleibt einfach und passt zum fast abgeschlossenen Moment.'),
        mediaCaption: "Die Hand schon nahe an der Tuere, die Quittung kommt noch dazu.",
        songSeed: { genre: 'soft indie folk', mood: 'small afterthought' },
        visualNotes: 'Door-side pause, soft receipt paper, low warm edge.',
      }),
      sharp: createA1P2VariantInput({
        targetText: "Receipt and bag, please.",
        baseText: "Quittung und Tuete, bitte.",
        meaning: "Eine knappe, klare Zusatzbitte an der Kasse.",
        chunks: [
          chunk('receipt', 'Receipt', 'Quittung'),
          chunk('and-bag', 'and bag', 'und Tuete'),
          chunk('please', 'please', 'bitte'),
        ],
        targetChips: ['Receipt', 'and bag,', 'please.'],
        distractors: ['focused', 'card'],
        typeRecall: recall('', 'Receipt', ' and bag, please.', ['Receipt', 'bag', 'card', 'cash']),
        sceneCaption: "Sharp nennt beide Dinge in einem Zug.",
        trophyWord: trophy('focused', 'konzentriert', 'Focused and done.', 'Focused passt zu Sharps kurzer Kassenliste.'),
        mediaCaption: "Quittung, Tuete, kurzer Blick zur Kasse, fertig.",
        songSeed: { genre: 'minimal synth pulse', mood: 'focused checkout' },
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
        targetText: "Hi, I have a reservation.",
        baseText: "Hallo, ich habe eine Reservierung.",
        meaning: "Ein freundlicher Start fuer einen gebuchten Platz oder Termin.",
        chunks: [
          chunk('hi', 'Hi', 'Hallo'),
          chunk('i-have', 'I have', 'ich habe'),
          chunk('a-reservation', 'a reservation', 'eine Reservierung'),
        ],
        targetChips: ['Hi,', 'I have', 'a reservation.'],
        distractors: ['kind', 'table'],
        typeRecall: recall('Hi, I have a ', 'reservation', '.', ['reservation', 'table', 'booking', 'kind']),
        sceneCaption: "Bright kommt an und macht den gebuchten Moment freundlich klar.",
        trophyWord: trophy('kind', 'freundlich', 'Kind of you, thanks.', 'Kind passt zum warmen Empfang am Anfang.'),
        mediaCaption: "Restaurantpult, Reservierungsliste, offener erster Satz.",
        songSeed: { genre: 'sunny indie pop', mood: 'friendly arrival' },
        visualNotes: 'Reservation book glow, warm host stand, soft name-line highlight.',
      }),
      wistful: createA1P2VariantInput({
        targetText: "I have a reservation, I think.",
        baseText: "Ich glaube, ich habe eine Reservierung.",
        meaning: "Eine vorsichtige Buchungsphrase, wenn du noch pruefst.",
        chunks: [
          chunk('i-have', 'I have', 'ich habe'),
          chunk('a-reservation', 'a reservation', 'eine Reservierung'),
          chunk('i-think', 'I think', 'ich glaube'),
        ],
        targetChips: ['I have', 'a reservation,', 'I think.'],
        distractors: ['calm', 'table'],
        typeRecall: recall('I have a ', 'reservation', ', I think.', ['reservation', 'table', 'name', 'again']),
        sceneCaption: "Wistful gibt die Reservierung an, mit einem kleinen unsicheren Rand.",
        trophyWord: trophy('calm', 'ruhig', 'Calm, thank you.', 'Calm haelt die Ankunft leise und kontrolliert.'),
        mediaCaption: "Leiser Empfangstisch, Name auf einer Liste, kurzer pruefender Blick.",
        songSeed: { genre: 'soft indie folk', mood: 'quiet arrival' },
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
        mediaCaption: "Hoststand, Name wird geprueft, direkter Satz ohne Small Talk.",
        songSeed: { genre: 'minimal synth pulse', mood: 'direct arrival' },
        visualNotes: 'Clean reservation line, hard white label, efficient framing.',
      }),
    },
  },
  {
    slug: 'is-this-right',
    title: 'Is this right?',
    situation: {
      en: "You confirm a bus, train, place, or item before committing.",
      de: "Du bestaetigst Bus, Zug, Ort oder Gegenstand, bevor du weitermachst.",
    },
    pedagogicalGoal: "Confirm bus, train, place, or item.",
    variants: {
      bright: createA1P2VariantInput({
        targetText: "Is this the right bus?",
        baseText: "Ist das der richtige Bus?",
        meaning: "Eine klare, freundliche Bestaetigung vor dem Einsteigen.",
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
        songSeed: { genre: 'light acoustic pop', mood: 'sure before moving' },
        visualNotes: 'Bus number highlight, warm yes cue, open boarding frame.',
      }),
      wistful: createA1P2VariantInput({
        targetText: "Is this right, please?",
        baseText: "Ist das bitte richtig?",
        meaning: "Eine vorsichtige Bestaetigungsfrage, bevor du dich festlegst.",
        chunks: [
          chunk('is-this', 'Is this', 'ist das'),
          chunk('right', 'right', 'richtig'),
          chunk('please', 'please', 'bitte'),
        ],
        targetChips: ['Is this', 'right,', 'please?'],
        distractors: ['simple', 'bus'],
        typeRecall: recall('Is this ', 'right', ', please?', ['right', 'bus', 'train', 'again']),
        sceneCaption: "Wistful prueft den Moment leise, bevor er weitergeht.",
        trophyWord: trophy('simple', 'einfach', 'Simple question.', 'Simple haelt die Bestaetigung klein und machbar.'),
        mediaCaption: "Haltestellenschild im weichen Licht, die Frage bleibt vorsichtig.",
        songSeed: { genre: 'soft indie folk', mood: 'careful check' },
        visualNotes: 'Soft sign focus, small question mark pulse, subdued confirmation.',
      }),
      sharp: createA1P2VariantInput({
        targetText: "Is this the right train?",
        baseText: "Ist das der richtige Zug?",
        meaning: "Eine direkte Bestaetigung fuer den richtigen Zug.",
        chunks: [
          chunk('is-this', 'Is this', 'ist das'),
          chunk('the-right', 'the right', 'der richtige'),
          chunk('train', 'train', 'Zug'),
        ],
        targetChips: ['Is this', 'the right', 'train?'],
        distractors: ['settled', 'bus'],
        typeRecall: recall('Is this the ', 'right train', '?', ['right train', 'right', 'bus', 'settled']),
        sceneCaption: "Sharp klaert Zug und Richtung, bevor die Tuer schliesst.",
        trophyWord: trophy('settled', 'geklaert', 'Settled, thanks.', 'Settled ist der Zustand nach der schnellen Bestaetigung.'),
        mediaCaption: "Bahnsteigkante, Zuganzeige, klare Frage vor dem Einstieg.",
        songSeed: { genre: 'minimal synth pulse', mood: 'settled route' },
        visualNotes: 'Train display crop, sharp green check, directional grid.',
      }),
    },
  },
  {
    slug: 'one-moment',
    title: 'One moment',
    situation: {
      en: "You need someone to wait while you find a card, word, or answer.",
      de: "Jemand soll kurz warten, waehrend du Karte, Wort oder Antwort suchst.",
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
        sceneCaption: "Bright braucht kurz Zeit und laesst trotzdem gute Energie im Raum.",
        trophyWord: trophy('cheerful', 'heiter', 'Cheerful, thank you.', 'Cheerful passt zum hellen Warten ohne Druck.'),
        mediaCaption: "Kartenetui offen, kleiner Blick zur Kasse, ein kurzer freundlicher Moment.",
        songSeed: { genre: 'sunny indie pop', mood: 'brief pause' },
        visualNotes: 'Warm pause icon, open wallet cue, almost-ready yellow pulse.',
      }),
      wistful: createA1P2VariantInput({
        targetText: "Sorry — one moment. I need a second.",
        baseText: "Entschuldigung, einen Moment. Ich brauche eine Sekunde.",
        meaning: "Eine ruhige Bitte, kurz suchen oder denken zu duerfen.",
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
        songSeed: { genre: 'soft indie folk', mood: 'patient pause' },
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
        distractors: ['done', 'please'],
        typeRecall: recall('', 'One moment', '. Ready soon.', ['One moment', 'ready soon', 'done', 'wait']),
        sceneCaption: "Sharp stoppt kurz, setzt aber sofort das Ende der Pause.",
        trophyWord: trophy('done', 'fertig', 'Done. Thanks.', 'Done schliesst die kurze Pause klar ab.'),
        mediaCaption: "Kurzer Stopp an der Kasse, Karte fast bereit, weiter in einem Schlag.",
        songSeed: { genre: 'minimal synth pulse', mood: 'brief hold' },
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
      de: "Du fragst nach einer einfachen Abbiegung und bestaetigst die Richtung.",
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
        sceneCaption: "Bright fragt offen an der Kreuzung und macht die Richtung leicht bestaetigbar.",
        trophyWord: trophy('friendly', 'freundlich', 'Friendly direction, thanks.', 'Friendly passt zur warmen Nachfrage, ohne die Richtung zu verwischen.'),
        mediaCaption: "Sonnige Kreuzung, zwei Pfeile auf einem Stadtplan, kurzer Blick zur linken Strasse.",
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
        sceneCaption: "Wistful haelt kurz inne und fragt leise nach der richtigen Seite.",
        trophyWord: trophy('softly', 'leise', 'Softly, I ask again.', 'Softly beschreibt den vorsichtigen Ton der Wegfrage.'),
        mediaCaption: "Ruhige Ecke, gedimmtes Schaufensterlicht, ein kleiner Pfeil nach rechts.",
        songSeed: { genre: 'soft indie folk', mood: 'careful turn' },
        visualNotes: 'Muted right-arrow glow, slow pause at the crossing, blue-gray street light.',
      }),
      sharp: createA1P3VariantInput({
        targetText: "Turn left here, correct?",
        baseText: "Hier links abbiegen, richtig, bitte?",
        meaning: "Eine knappe Bestaetigung fuer die naechste Abbiegung.",
        chunks: [
          chunk('turn-left', 'Turn left', 'links abbiegen'),
          chunk('here', 'here', 'hier'),
          chunk('correct', 'correct', 'richtig'),
        ],
        targetChips: ['Turn left', 'here,', 'correct?'],
        distractors: ['straight', 'right'],
        typeRecall: recall('', 'Turn left', ' here, correct?', ['Turn left', 'Turn right', 'straight', 'correct']),
        sceneCaption: "Sharp prueft die Abbiegung in einem kurzen Satz und geht weiter.",
        trophyWord: trophy('straight', 'geradeaus', 'Straight, then left.', 'Straight ist ein klares Richtungswort fuer schnelle Wegkorrekturen.'),
        mediaCaption: "Kontrastreiche Strassenecke, linker Pfeil, harte Markierung auf dem Asphalt.",
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
        baseText: "Könnten Sie mir bitte sagen, ist es fünf Minuten entfernt?",
        meaning: "Eine warme Frage nach einer kleinen, machbaren Entfernung.",
        chunks: [
          chunk('could-you-tell-me', 'Could you tell me', 'koennten Sie mir sagen'),
          chunk('is-it-five-minutes', 'is it five minutes', 'sind es fuenf Minuten'),
          chunk('away', 'away', 'entfernt'),
        ],
        targetChips: ['Could you tell me,', 'is it five minutes', 'away?'],
        distractors: ['nearby', 'bus'],
        typeRecall: recall('Could you tell me, is it ', 'five minutes', ' away?', ['five minutes', 'ten minutes', 'nearby', 'far']),
        sceneCaption: "Bright fragt nach der Dauer und macht die Strecke ueberschaubar.",
        trophyWord: trophy('nearby', 'in der Naehe', 'Is it nearby?', 'Nearby ist ein sofort nuetzliches Wort fuer kurze Wege.'),
        mediaCaption: "Heller Gehweg, Telefonkarte mit kurzer Route, Zielpunkt nur wenige Blocks entfernt.",
        songSeed: { genre: 'sunny indie pop', mood: 'nearby walk' },
        visualNotes: 'Warm route dots, five-minute badge, open walking lane.',
      }),
      wistful: createA1P3VariantInput({
        targetText: "Is it a long walk from here, please?",
        baseText: "Ist es von hier bitte ein langer Weg zu Fuß?",
        meaning: "Eine vorsichtige Frage, ob der Weg zu Fuss zu weit ist.",
        chunks: [
          chunk('is-it-a-long-walk', 'is it a long walk', 'ist es ein langer Weg zu Fuss'),
          chunk('from-here', 'from here', 'von hier'),
        ],
        targetChips: ['Is it a long walk', 'from here,', 'please?'],
        distractors: ['slowly', 'near'],
        typeRecall: recall('Is it ', 'a long walk', ' from here, please?', ['a long walk', 'a short walk', 'slowly', 'near']),
        sceneCaption: "Wistful klaert die Strecke behutsam, bevor die Beine entscheiden.",
        trophyWord: trophy('slowly', 'langsam', 'Slowly is okay.', 'Slowly haelt die Frage ruhig und koerperlich realistisch.'),
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
      de: "Du pruefst, ob ein Laden, Schalter oder Ort gerade offen ist.",
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
        trophyWord: trophy('open', 'offen', 'Open now, thank you.', 'Open ist kurz, klar und im Alltag staendig nuetzlich.'),
        mediaCaption: "Ladentuer mit hellem Open-Schild, Hand kurz vor dem Griff.",
        songSeed: { genre: 'light acoustic pop', mood: 'open doorway' },
        visualNotes: 'Warm door sign, soft open glow, simple entrance framing.',
      }),
      wistful: createA1P3VariantInput({
        targetText: "Is the desk still open, please?",
        baseText: "Ist der Schalter bitte noch offen?",
        meaning: "Eine vorsichtige Frage, ob der Schalter noch nicht geschlossen hat.",
        chunks: [
          chunk('is-the-desk', 'is the desk', 'ist der Schalter'),
          chunk('still-open', 'still open', 'noch offen'),
        ],
        targetChips: ['Is the desk', 'still open,', 'please?'],
        distractors: ['careful', 'closed'],
        typeRecall: recall('Is the desk ', 'still open', ', please?', ['still open', 'already closed', 'careful', 'desk']),
        sceneCaption: "Wistful fragt leise nach, bevor aus Hoffnung ein Umweg wird.",
        trophyWord: trophy('careful', 'vorsichtig', 'Careful question.', 'Careful haelt den Ton pruefend und freundlich.'),
        mediaCaption: "Ruhiger Infoschalter, Licht noch an, Uhr nahe am Rand der Oeffnungszeit.",
        songSeed: { genre: 'soft indie folk', mood: 'careful opening check' },
        visualNotes: 'Soft desk lamp, quiet clock cue, subdued open sign.',
      }),
      sharp: createA1P3VariantInput({
        targetText: "Is this place open?",
        baseText: "Ist dieser Ort bitte offen?",
        meaning: "Eine kurze Statusfrage vor dem Eingang.",
        chunks: [
          chunk('is-this-place', 'Is this place', 'ist dieser Ort'),
          chunk('open', 'open', 'offen'),
        ],
        targetChips: ['Is this place', 'open?'],
        distractors: ['direct', 'closed'],
        typeRecall: recall('Is this place ', 'open', '?', ['open', 'closed', 'direct', 'place']),
        sceneCaption: "Sharp prueft den Status ohne Umweg.",
        trophyWord: trophy('direct', 'direkt', 'Direct question.', 'Direct beschreibt den klaren Zugriff auf die Information.'),
        mediaCaption: "Kontrastreiches Schild am Eingang, Tuerlinie, klare Ja-nein-Situation.",
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
      de: "Du fragst, welcher Bus zu deinem Ziel faehrt.",
    },
    pedagogicalGoal: "Ask for the right bus using a destination or route cue.",
    variants: {
      bright: createA1P3VariantInput({
        targetText: "Which bus goes to the museum, please?",
        baseText: "Welcher Bus faehrt bitte zum Museum?",
        meaning: "Eine freundliche Frage nach der passenden Linie zum Ziel.",
        chunks: [
          chunk('which-bus', 'Which bus', 'welcher Bus'),
          chunk('goes-to', 'goes to', 'faehrt zu'),
          chunk('the-museum', 'the museum', 'dem Museum'),
        ],
        targetChips: ['Which bus', 'goes to', 'the museum,', 'please?'],
        distractors: ['simple', 'train'],
        typeRecall: recall('Which bus goes to ', 'the museum', ', please?', ['the museum', 'the station', 'simple', 'train']),
        sceneCaption: "Bright verbindet die Busfrage mit einem klaren Ziel.",
        trophyWord: trophy('simple', 'einfach', 'Simple route, please.', 'Simple haelt die Busfrage freundlich und machbar.'),
        mediaCaption: "Bushaltestelle im Tageslicht, Linienplan, Museum als Zielpunkt markiert.",
        songSeed: { genre: 'sunny indie pop', mood: 'simple route' },
        visualNotes: 'Warm bus-line highlight, destination dot, open transit board.',
      }),
      wistful: createA1P3VariantInput({
        targetText: "Sorry, which bus goes near the old town?",
        baseText: "Entschuldigung, welcher Bus faehrt bitte in die Naehe der Altstadt?",
        meaning: "Eine vorsichtige Frage nach einer Linie, die dich nah genug bringt.",
        chunks: [
          chunk('sorry', 'Sorry', 'Entschuldigung'),
          chunk('which-bus', 'which bus', 'welcher Bus'),
          chunk('near-the-old-town', 'near the old town', 'in die Naehe der Altstadt'),
        ],
        targetChips: ['Sorry,', 'which bus goes', 'near the old town?'],
        distractors: ['nearer', 'station'],
        typeRecall: recall('Sorry, which bus goes ', 'near the old town', '?', ['near the old town', 'to the station', 'nearer', 'walk']),
        sceneCaption: "Wistful sucht nicht die perfekte Antwort, sondern einen nahen Ankunftspunkt.",
        trophyWord: trophy('nearer', 'naeher', 'Nearer is better.', 'Nearer passt zu vorsichtiger Orientierung in einer fremden Stadt.'),
        mediaCaption: "Abendliche Haltestelle, Altstadt auf der Karte, Buslinie endet ein Stueck davor.",
        songSeed: { genre: 'soft indie folk', mood: 'near old town' },
        visualNotes: 'Muted old-town marker, soft route end, gentle distance halo.',
      }),
      sharp: createA1P3VariantInput({
        targetText: "Which bus number goes downtown?",
        baseText: "Welche Busnummer faehrt bitte ins Zentrum?",
        meaning: "Eine direkte Frage nach der Busnummer zum Zentrum.",
        chunks: [
          chunk('which-bus-number', 'Which bus number', 'welche Busnummer'),
          chunk('goes-downtown', 'goes downtown', 'faehrt ins Zentrum'),
        ],
        targetChips: ['Which bus number', 'goes downtown?'],
        distractors: ['route', 'platform'],
        typeRecall: recall('Which ', 'bus number', ' goes downtown?', ['bus number', 'train number', 'route', 'platform']),
        sceneCaption: "Sharp will die Nummer und dann los.",
        trophyWord: trophy('route', 'Route', 'Route confirmed.', 'Route ist das knappe Wort fuer die richtige Verbindung.'),
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
      de: "Du pruefst, ob deine Haltestelle als Naechstes kommt.",
    },
    pedagogicalGoal: "Ask or confirm the next stop while riding.",
    variants: {
      bright: createA1P3VariantInput({
        targetText: "Is the next stop Central Park, please?",
        baseText: "Ist die naechste Haltestelle bitte Central Park?",
        meaning: "Eine warme Bestaetigung, ob der naechste Halt dein Ziel ist.",
        chunks: [
          chunk('is-the-next-stop', 'Is the next stop', 'ist die naechste Haltestelle'),
          chunk('central-park', 'Central Park', 'Central Park'),
          chunk('please', 'please', 'bitte'),
        ],
        targetChips: ['Is the next stop', 'Central Park,', 'please?'],
        distractors: ['steady', 'station'],
        typeRecall: recall('Is the ', 'next stop', ' Central Park, please?', ['next stop', 'last stop', 'steady', 'station']),
        sceneCaption: "Bright prueft den Halt freundlich, solange noch Zeit zum Aufstehen ist.",
        trophyWord: trophy('steady', 'ruhig', 'Steady, next stop.', 'Steady gibt dem Moment Ruhe, ohne ihn schwer zu machen.'),
        mediaCaption: "Heller Businnenraum, Haltestellenanzeige, Hand nahe am Halteknopf.",
        songSeed: { genre: 'light acoustic pop', mood: 'steady arrival' },
        visualNotes: 'Warm next-stop banner, gentle stop-button glow, easy arrival cue.',
      }),
      wistful: createA1P3VariantInput({
        targetText: "Could you tell me if this stop is coming soon?",
        baseText: "Koennten Sie mir bitte sagen, ob diese Haltestelle bald kommt?",
        meaning: "Eine vorsichtige Frage, ob du dich schon bereitmachen sollst.",
        chunks: [
          chunk('could-you-tell-me', 'Could you tell me', 'koennten Sie mir sagen'),
          chunk('if-this-stop-is', 'if this stop is', 'ob diese Haltestelle'),
          chunk('coming-soon', 'coming soon', 'bald'),
        ],
        targetChips: ['Could you tell me', 'if this stop is', 'coming soon?'],
        distractors: ['calmly', 'late'],
        typeRecall: recall('Could you tell me if this stop is ', 'coming soon', '?', ['coming soon', 'coming later', 'calmly', 'late']),
        sceneCaption: "Wistful fragt frueh genug, damit Aussteigen nicht hektisch wird.",
        trophyWord: trophy('calmly', 'ruhig', 'Calmly, I get ready.', 'Calmly macht den Haltestellenmoment vorsichtig statt hektisch.'),
        mediaCaption: "Leiser Waggon, Anzeige im Fensterlicht, Tasche schon locker in der Hand.",
        songSeed: { genre: 'soft indie folk', mood: 'calm next stop' },
        visualNotes: 'Soft stop display, slow readiness motion, muted aisle light.',
      }),
      sharp: createA1P3VariantInput({
        targetText: "Next stop is mine, correct?",
        baseText: "Die naechste Haltestelle ist meine, richtig, bitte?",
        meaning: "Eine schnelle Bestaetigung vor dem Aussteigen.",
        chunks: [
          chunk('next-stop', 'Next stop', 'naechste Haltestelle'),
          chunk('is-mine', 'is mine', 'ist meine'),
          chunk('correct', 'correct', 'richtig'),
        ],
        targetChips: ['Next stop', 'is mine,', 'correct?'],
        distractors: ['next', 'later'],
        typeRecall: recall('Next stop ', 'is mine', ', correct?', ['is mine', 'is later', 'next', 'later']),
        sceneCaption: "Sharp bestaetigt und bewegt sich zur Tuer.",
        trophyWord: trophy('next', 'naechste', 'Next stop.', 'Next ist knapp, haeufig und perfekt fuer Verkehrsmomente.'),
        mediaCaption: "Tuerbereich, naechster Halt auf der Anzeige, direkter Blick zum Ausgang.",
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
      de: "Du kaufst ein einfaches Ticket fuer eine Fahrt oder einen Ort.",
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
        trophyWord: trophy('valid', 'gueltig', 'Valid ticket.', 'Valid ist ein nuetzliches Wort, wenn Tickets kontrolliert werden.'),
        mediaCaption: "Ticketschalter, kleines Papierticket, Stadtziel auf dem Display.",
        songSeed: { genre: 'sunny indie pop', mood: 'ticket ready' },
        visualNotes: 'Warm ticket edge, destination text, simple one-ticket counter.',
      }),
      wistful: createA1P3VariantInput({
        targetText: "Sorry, I need a single ticket, please.",
        baseText: "Entschuldigung, ich brauche bitte ein einfaches Ticket.",
        meaning: "Eine ruhige Bitte um ein einfaches Einzelticket.",
        chunks: [
          chunk('sorry', 'Sorry', 'Entschuldigung'),
          chunk('i-need', 'I need', 'ich brauche'),
          chunk('a-single-ticket', 'a single ticket', 'ein einfaches Ticket'),
        ],
        targetChips: ['Sorry,', 'I need', 'a single ticket,', 'please.'],
        distractors: ['perhaps', 'return'],
        typeRecall: recall('Sorry, I need ', 'a single ticket', ', please.', ['a single ticket', 'a return ticket', 'perhaps', 'cash']),
        sceneCaption: "Wistful haelt die Ticketbitte klein und deutlich.",
        trophyWord: trophy('perhaps', 'vielleicht', 'Perhaps a single ticket.', 'Perhaps passt zum vorsichtigen Klaeren am Schalter.'),
        mediaCaption: "Ruhiger Automat, Einzelticket-Auswahl, Finger wartet vor dem Bildschirm.",
        songSeed: { genre: 'soft indie folk', mood: 'small ticket request' },
        visualNotes: 'Soft ticket selector, single-option glow, quiet machine light.',
      }),
      sharp: createA1P3VariantInput({
        targetText: "One single ticket to the center, please.",
        baseText: "Ein Einzelticket ins Zentrum, bitte.",
        meaning: "Eine knappe Bestellung fuer ein Einzelticket.",
        chunks: [
          chunk('one-single-ticket', 'One single ticket', 'ein Einzelticket'),
          chunk('to-the-center', 'to the center', 'ins Zentrum'),
          chunk('please', 'please', 'bitte'),
        ],
        targetChips: ['One single ticket', 'to the center,', 'please.'],
        distractors: ['single', 'cash'],
        typeRecall: recall('One ', 'single ticket', ' to the center, please.', ['single ticket', 'return ticket', 'single', 'cash']),
        sceneCaption: "Sharp sagt Tickettyp und Ziel in einem Zug.",
        trophyWord: trophy('single', 'einfach', 'Single ticket.', 'Single ist kurz und praktisch fuer Ticketarten.'),
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
      de: "Du fragst, wann ein Ort schliesst, damit du den Besuch planen kannst.",
    },
    pedagogicalGoal: "Ask about closing time using a short A1 time question.",
    variants: {
      bright: createA1P3VariantInput({
        targetText: "What time does it close today, please?",
        baseText: "Um wie viel Uhr schliesst es heute bitte?",
        meaning: "Eine freundliche Frage nach der heutigen Schliesszeit.",
        chunks: [
          chunk('what-time', 'What time', 'um wie viel Uhr'),
          chunk('does-it-close', 'does it close', 'schliesst es'),
          chunk('today', 'today', 'heute'),
        ],
        targetChips: ['What time', 'does it close', 'today,', 'please?'],
        distractors: ['closing', 'open'],
        typeRecall: recall('What time does it ', 'close today', ', please?', ['close today', 'open today', 'closing', 'later']),
        sceneCaption: "Bright fragt nach der Zeit und macht Planung leichter.",
        trophyWord: trophy('closing', 'Schliessung', 'Closing time, please.', 'Closing ist direkt mit Oeffnungszeiten verbunden und alltagstauglich.'),
        mediaCaption: "Museumseingang, Oeffnungszeiten auf einem Schild, Tageslicht wird spaeter.",
        songSeed: { genre: 'light acoustic pop', mood: 'closing time plan' },
        visualNotes: 'Warm clock highlight, closing-time row, friendly schedule card.',
      }),
      wistful: createA1P3VariantInput({
        targetText: "Sorry, does it close early today?",
        baseText: "Entschuldigung, schliesst es heute bitte frueh?",
        meaning: "Eine vorsichtige Frage, ob du dich beeilen musst.",
        chunks: [
          chunk('sorry', 'Sorry', 'Entschuldigung'),
          chunk('does-it-close', 'does it close', 'schliesst es'),
          chunk('early-today', 'early today', 'heute frueh'),
        ],
        targetChips: ['Sorry,', 'does it close', 'early today?'],
        distractors: ['early', 'open'],
        typeRecall: recall('Sorry, does it ', 'close early', ' today?', ['close early', 'open late', 'early', 'today']),
        sceneCaption: "Wistful fragt behutsam, ob noch genug Zeit bleibt.",
        trophyWord: trophy('early', 'frueh', 'Early today?', 'Early ist schlicht und hilfreich fuer Oeffnungszeiten.'),
        mediaCaption: "Leises Eingangsschild, fruehe Schliesszeit markiert, ein Blick zur Uhr.",
        songSeed: { genre: 'soft indie folk', mood: 'early close' },
        visualNotes: 'Muted clock face, soft early label, gentle time pressure.',
      }),
      sharp: createA1P3VariantInput({
        targetText: "What time does this place close?",
        baseText: "Um wie viel Uhr schliesst dieser Ort bitte?",
        meaning: "Eine direkte Frage nach der Schliesszeit des Ortes.",
        chunks: [
          chunk('what-time', 'What time', 'um wie viel Uhr'),
          chunk('does-this-place-close', 'does this place close', 'schliesst dieser Ort'),
        ],
        targetChips: ['What time', 'does this place', 'close?'],
        distractors: ['closed', 'open'],
        typeRecall: recall('What time does this place ', 'close', '?', ['close', 'open', 'closed', 'late']),
        sceneCaption: "Sharp holt die Schliesszeit und entscheidet sofort.",
        trophyWord: trophy('closed', 'geschlossen', 'Closed at six.', 'Closed ist das klare Gegenstueck zu open und wichtig fuer Planung.'),
        mediaCaption: "Schwarz-weisses Oeffnungszeitenschild, Schliesszeit hart unterstrichen.",
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
        trophyWord: trophy('corner', 'Ecke', 'On the corner.', 'Corner ist ein konkretes A1-Wegwort fuer Staedte.'),
        mediaCaption: "Helle Strassenecke, kleines Ladenschild, Ziel direkt am Eckhaus.",
        songSeed: { genre: 'sunny indie pop', mood: 'corner landmark' },
        visualNotes: 'Warm corner outline, shop sign glow, simple landmark frame.',
      }),
      wistful: createA1P3VariantInput({
        targetText: "Sorry, is the cafe at the next corner?",
        baseText: "Entschuldigung, ist das Cafe bitte an der naechsten Ecke?",
        meaning: "Eine vorsichtige Frage nach der naechsten Ecke als Ziel.",
        chunks: [
          chunk('sorry', 'Sorry', 'Entschuldigung'),
          chunk('is-the-cafe', 'is the cafe', 'ist das Cafe'),
          chunk('at-the-next-corner', 'at the next corner', 'an der naechsten Ecke'),
        ],
        targetChips: ['Sorry,', 'is the cafe', 'at the next corner?'],
        distractors: ['quiet', 'station'],
        typeRecall: recall('Sorry, is the cafe ', 'at the next corner', '?', ['at the next corner', 'near the station', 'quiet', 'street']),
        sceneCaption: "Wistful fragt nach dem Cafe und bleibt bei einem ruhigen Merkpunkt.",
        trophyWord: trophy('quiet', 'ruhig', 'Quiet corner.', 'Quiet passt zu einer leisen Orientierung ohne Druck.'),
        mediaCaption: "Weiche Strassenecke, Cafe-Schild im Fenster, naechster Block sichtbar.",
        songSeed: { genre: 'soft indie folk', mood: 'quiet corner' },
        visualNotes: 'Soft cafe sign, muted corner edge, slow next-block marker.',
      }),
      sharp: createA1P3VariantInput({
        targetText: "Meet me at the corner.",
        baseText: "Treffen Sie mich bitte an der Ecke.",
        meaning: "Eine klare Ortsangabe fuer einen Treffpunkt.",
        chunks: [
          chunk('meet-me', 'Meet me', 'treffen Sie mich'),
          chunk('at-the-corner', 'at the corner', 'an der Ecke'),
        ],
        targetChips: ['Meet me', 'at the corner.'],
        distractors: ['corner', 'later'],
        typeRecall: recall('Meet me ', 'at the corner', '.', ['at the corner', 'at the station', 'corner', 'later']),
        sceneCaption: "Sharp setzt die Ecke als Treffpunkt und bleibt knapp.",
        trophyWord: trophy('corner', 'Ecke', 'Corner meeting.', 'Corner ist fuer klare Treffpunkte ein starkes Basiswort.'),
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
      de: "Du entscheidest, ob du zu Fuss gehst oder ein Taxi nimmst.",
    },
    pedagogicalGoal: "Ask about a simple transport choice with walking and taxi language.",
    variants: {
      bright: createA1P3VariantInput({
        targetText: "Should we walk there or take a taxi?",
        baseText: "Sollen wir bitte zu Fuss gehen oder ein Taxi nehmen?",
        meaning: "Eine warme Frage zwischen zwei einfachen Wegen.",
        chunks: [
          chunk('should-we-walk', 'Should we walk', 'sollen wir zu Fuss gehen'),
          chunk('there', 'there', 'dorthin'),
          chunk('or-take-a-taxi', 'or take a taxi', 'oder ein Taxi nehmen'),
        ],
        targetChips: ['Should we walk', 'there', 'or take a taxi?'],
        distractors: ['walkable', 'bus'],
        typeRecall: recall('Should we ', 'walk there', ' or take a taxi?', ['walk there', 'drive there', 'walkable', 'bus']),
        sceneCaption: "Bright macht die Wahl zwischen Laufen und Taxi leicht.",
        trophyWord: trophy('walkable', 'zu Fuss machbar', 'It is walkable.', 'Walkable ist praktisch, wenn Entfernung und Energie zusammenkommen.'),
        mediaCaption: "Stadtkarte, Fussweg und Taxispur nebeneinander, freundlicher Entscheidmoment.",
        songSeed: { genre: 'light acoustic pop', mood: 'walk or taxi' },
        visualNotes: 'Warm split route, walking icon, taxi line kept secondary.',
      }),
      wistful: createA1P3VariantInput({
        targetText: "Maybe we can walk, or take a taxi?",
        baseText: "Vielleicht koennen wir bitte zu Fuss gehen oder ein Taxi nehmen?",
        meaning: "Eine sanfte Wahl, wenn beide Wege moeglich sind.",
        chunks: [
          chunk('maybe-we-can-walk', 'Maybe we can walk', 'vielleicht koennen wir zu Fuss gehen'),
          chunk('or-take-a-taxi', 'or take a taxi', 'oder ein Taxi nehmen'),
        ],
        targetChips: ['Maybe we can walk,', 'or take a taxi?'],
        distractors: ['gentle', 'bus'],
        typeRecall: recall('Maybe ', 'we can walk', ', or take a taxi?', ['we can walk', 'we can drive', 'gentle', 'bus']),
        sceneCaption: "Wistful laesst die Wahl offen, ohne unsicher zu werden.",
        trophyWord: trophy('gentle', 'sanft', 'Gentle choice.', 'Gentle passt zur vorsichtigen Transportentscheidung.'),
        mediaCaption: "Ruhiger Strassenrand, Taxi in der Ferne, Gehweg bleibt offen.",
        songSeed: { genre: 'soft indie folk', mood: 'gentle choice' },
        visualNotes: 'Soft split path, quiet taxi light, low-pressure choice marker.',
      }),
      sharp: createA1P3VariantInput({
        targetText: "Walk or taxi?",
        baseText: "Zu Fuss oder Taxi, bitte?",
        meaning: "Eine sehr knappe Wahl zwischen zwei Optionen.",
        chunks: [
          chunk('walk', 'Walk', 'zu Fuss'),
          chunk('or-taxi', 'or taxi', 'oder Taxi'),
        ],
        targetChips: ['Walk', 'or taxi?'],
        distractors: ['taxi', 'bus'],
        typeRecall: recall('', 'Walk or taxi', '?', ['Walk or taxi', 'Bus or train', 'taxi', 'bus']),
        sceneCaption: "Sharp reduziert die Entscheidung auf zwei klare Optionen.",
        trophyWord: trophy('taxi', 'Taxi', 'Taxi now.', 'Taxi ist ein direktes Transportwort fuer schnelle Entscheidungen.'),
        mediaCaption: "Zwei harte Symbole: Fussweg links, Taxi rechts, Entscheidung in der Mitte.",
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
        baseText: "Entschuldigung, ich habe meine Haltestelle verpasst. Koennten Sie mir bitte helfen?",
        meaning: "Eine freundliche Reparatur, wenn du zu weit gefahren bist.",
        chunks: [
          chunk('sorry', 'Sorry', 'Entschuldigung'),
          chunk('i-missed-my-stop', 'I missed my stop', 'ich habe meine Haltestelle verpasst'),
          chunk('could-you-help-me', 'Could you help me', 'koennten Sie mir helfen'),
        ],
        targetChips: ['Sorry,', 'I missed my stop.', 'Could you help me?'],
        distractors: ['helped', 'ticket'],
        typeRecall: recall('Sorry, I ', 'missed my stop', '. Could you help me?', ['missed my stop', 'found my stop', 'helped', 'ticket']),
        sceneCaption: "Bright macht aus dem Fehler sofort eine Bitte um Hilfe.",
        trophyWord: trophy('helped', 'geholfen', 'You helped me.', 'Helped schliesst die kleine Verkehrspanne warm ab.'),
        mediaCaption: "Bus faehrt weiter, Haltestelle im Rueckfenster, freundliche Nachfrage im Gang.",
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
        trophyWord: trophy('lost', 'verloren', 'I am lost.', 'Lost ist A1-nuetzlich, solange es schlicht und nicht dramatisch bleibt.'),
        mediaCaption: "Leiser Businnenraum, vertraute Haltestelle schon hinter dem Fenster.",
        songSeed: { genre: 'soft indie folk', mood: 'soft recovery' },
        visualNotes: 'Muted rear-window stop sign, small uncertainty pulse, calm recovery cue.',
      }),
      sharp: createA1P3VariantInput({
        targetText: "I missed my stop. What now?",
        baseText: "Ich habe meine Haltestelle verpasst. Was jetzt bitte?",
        meaning: "Eine direkte Fehleransage mit sofortiger naechster Frage.",
        chunks: [
          chunk('i-missed-my-stop', 'I missed my stop', 'ich habe meine Haltestelle verpasst'),
          chunk('what-now', 'What now', 'was jetzt'),
        ],
        targetChips: ['I missed my stop.', 'What now?'],
        distractors: ['missed', 'later'],
        typeRecall: recall('I ', 'missed my stop', '. What now?', ['missed my stop', 'missed the train', 'missed', 'later']),
        sceneCaption: "Sharp benennt das Problem und fragt nach dem naechsten Schritt.",
        trophyWord: trophy('missed', 'verpasst', 'Missed stop.', 'Missed ist genau das Fehlerwort fuer diesen Verkehrsmoment.'),
        mediaCaption: "Klare Haltestellenliste, Ziel schon uebersprungen, Blick zur naechsten Ausstiegstuer.",
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

function createA1P3VariantInput(input: A1P3VariantInput) {
  return input
}

function createA1P2VariantInput(input: A1P2VariantInput) {
  return input
}

function createA1P2Variant(input: A1P2VariantInput): GuidedLessonVibeVariant {
  const chunkItems = input.chunks.map((phraseChunk) => lessonItem(
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
      de: "Im Caf? fragst du, ob jemand Englisch spricht.",
    },
    pedagogicalGoal: "Ask whether someone speaks English before continuing a conversation, using one short A1-safe English phrase.",
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: "Polite follow-up",
      situation: "Im Caf? bittest du jemanden, etwas noch einmal oder langsamer zu sagen.",
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
      de: "Im Caf? bittest du jemanden, etwas noch einmal oder langsamer zu sagen.",
    },
    pedagogicalGoal: "Recover politely when speech is too fast by asking for repetition or slower delivery.",
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: "Where is...?",
      situation: "Auf der Stra?e fragst du nach dem Bahnhof oder einer Richtung.",
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
      de: "Auf der Stra?e fragst du nach dem Bahnhof oder einer Richtung.",
    },
    pedagogicalGoal: "Ask a simple where-question for directions and recognize core direction words.",
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: "I'd like...",
      situation: "Im Caf? oder Restaurant bestellst du ein einfaches Getr?nk.",
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
      de: "Im Caf? oder Restaurant bestellst du ein einfaches Getr?nk.",
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
      situation: "Im Small Talk sagst du etwas Einfaches ?ber einen Ort.",
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
      de: "Im Small Talk sagst du etwas Einfaches ?ber einen Ort.",
    },
    pedagogicalGoal: "Make a short positive comment about a place using A1 small-talk language.",
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: "Tomorrow at seven",
      situation: "Beim Planen best?tigst du morgen um sieben.",
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
      de: "Beim Planen best?tigst du morgen um sieben.",
    },
    pedagogicalGoal: "Confirm a simple future plan with day and time language.",
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: "Thank you, goodbye",
      situation: "Du schlie?t die Szene mit Dank und Abschied ab.",
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
      de: "Du schlie?t die Szene mit Dank und Abschied ab.",
    },
    pedagogicalGoal: "End a practical interaction with a short thank-you and goodbye phrase.",
    modeSet: 'guided-today-v0',
    steps: GUIDED_TODAY_STEPS,
    estimatedMinutes: 5,
    fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
    status: 'active',
    nextLessonTeaser: {
      title: "Guided Today Path Overview V1",
      situation: "Wiederhole die zehn praktischen A1-Szenen und w?hle die n?chste Lektion.",
    },
    vibeVariants: {
      bright: brightLesson010,
      wistful: wistfulLesson010,
      sharp: sharpLesson010,
    },
  },
  ...a1Practical2Lessons,
  ...a1Practical3Lessons,
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
