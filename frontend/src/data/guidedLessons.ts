import {
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

const GUIDED_TODAY_PATH_METADATA: GuidedPathMetadata = {
  id: 'english-a1-practical',
  title: 'English A1 Practical',
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
    before: "Hi there, do you speak ",
    answer: "English",
    after: "?",
    acceptedAnswers: ["English", "english"],
    fallbackChoices: ["English", "German", "delighted", "glad"],
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
    before: "How much is ",
    answer: "this",
    after: "? Lovely, thanks!",
    acceptedAnswers: ["this", "This"],
    fallbackChoices: ["this", "that", "splendid", "lovely"],
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
    before: "Hi, could you help me, ",
    answer: "please",
    after: "?",
    acceptedAnswers: ["please"],
    fallbackChoices: ["please", "lovely", "wonderful", "coffee"],
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
    before: "I love it ",
    answer: "here",
    after: ".",
    acceptedAnswers: ["here", "Here"],
    fallbackChoices: ["here", "there", "nice", "place"],
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
    before: "Sorry to ask — do you happen to speak ",
    answer: "English",
    after: "?",
    acceptedAnswers: ["English", "english"],
    fallbackChoices: ["English", "German", "gently", "perhaps"],
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
    before: "Just a small question — how much for ",
    answer: "this",
    after: "?",
    acceptedAnswers: ["this", "This"],
    fallbackChoices: ["this", "that", "perhaps", "slowly"],
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
    before: "Quick question — do you speak ",
    answer: "English",
    after: "?",
    acceptedAnswers: ["English", "english"],
    fallbackChoices: ["English", "German", "clear", "quick"],
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
    before: "Good place. I like ",
    answer: "it",
    after: ".",
    acceptedAnswers: ["it", "It"],
    fallbackChoices: ["it", "here", "place", "good"],
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

export const GUIDED_LESSONS: GuidedLessonDefinition[] = [
  {
    id: "english-a1-practical-001-first-contact",
    pathId: GUIDED_TODAY_PATH_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_METADATA.title,
    level: GUIDED_TODAY_PATH_METADATA.level,
    lessonNumber: 1,
    baseLanguage: GUIDED_TODAY_PATH_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_METADATA,
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
    pathId: GUIDED_TODAY_PATH_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_METADATA.title,
    level: GUIDED_TODAY_PATH_METADATA.level,
    lessonNumber: 2,
    baseLanguage: GUIDED_TODAY_PATH_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_METADATA,
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
    pathId: GUIDED_TODAY_PATH_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_METADATA.title,
    level: GUIDED_TODAY_PATH_METADATA.level,
    lessonNumber: 3,
    baseLanguage: GUIDED_TODAY_PATH_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_METADATA,
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
    pathId: GUIDED_TODAY_PATH_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_METADATA.title,
    level: GUIDED_TODAY_PATH_METADATA.level,
    lessonNumber: 4,
    baseLanguage: GUIDED_TODAY_PATH_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_METADATA,
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
    pathId: GUIDED_TODAY_PATH_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_METADATA.title,
    level: GUIDED_TODAY_PATH_METADATA.level,
    lessonNumber: 5,
    baseLanguage: GUIDED_TODAY_PATH_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_METADATA,
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
    pathId: GUIDED_TODAY_PATH_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_METADATA.title,
    level: GUIDED_TODAY_PATH_METADATA.level,
    lessonNumber: 6,
    baseLanguage: GUIDED_TODAY_PATH_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_METADATA,
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
    pathId: GUIDED_TODAY_PATH_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_METADATA.title,
    level: GUIDED_TODAY_PATH_METADATA.level,
    lessonNumber: 7,
    baseLanguage: GUIDED_TODAY_PATH_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_METADATA,
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
    pathId: GUIDED_TODAY_PATH_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_METADATA.title,
    level: GUIDED_TODAY_PATH_METADATA.level,
    lessonNumber: 8,
    baseLanguage: GUIDED_TODAY_PATH_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_METADATA,
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
    pathId: GUIDED_TODAY_PATH_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_METADATA.title,
    level: GUIDED_TODAY_PATH_METADATA.level,
    lessonNumber: 9,
    baseLanguage: GUIDED_TODAY_PATH_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_METADATA,
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
    pathId: GUIDED_TODAY_PATH_METADATA.id,
    courseTitle: GUIDED_TODAY_PATH_METADATA.title,
    level: GUIDED_TODAY_PATH_METADATA.level,
    lessonNumber: 10,
    baseLanguage: GUIDED_TODAY_PATH_METADATA.baseLanguage,
    targetLanguage: GUIDED_TODAY_PATH_METADATA.targetLanguage,
    pathMetadata: GUIDED_TODAY_PATH_METADATA,
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
]

export function getCurrentGuidedLesson(vibeId?: GuidedVibeId | string | null) {
  const lesson = getGuidedPathLessons(GUIDED_TODAY_PATH_METADATA.id)[0]
  if (!lesson) {
    throw new Error('No Guided Today lesson is configured.')
  }
  return resolveGuidedLessonVariant(lesson, vibeId)
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
