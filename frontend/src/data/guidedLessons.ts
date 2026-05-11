import {
  DEFAULT_GUIDED_VIBE_ID,
  isActiveGuidedVibeId,
  type ActiveGuidedVibeId,
  type GuidedVibeId,
} from '@/data/guidedVibes'

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

export const GUIDED_LESSONS: GuidedLessonDefinition[] = [
  {
    id: 'english-a1-practical-001-first-contact',
    pathId: 'english-a1-practical',
    courseTitle: 'English A1 Practical',
    level: 'A1',
    lessonNumber: 1,
    baseLanguage: 'German',
    targetLanguage: 'English',
    pathMetadata: {
      id: 'english-a1-practical',
      title: 'English A1 Practical',
      level: 'A1',
      baseLanguage: 'German',
      targetLanguage: 'English',
      estimatedMinutes: 5,
    },
    lessonMetadata: {
      id: 'english-a1-practical-001-first-contact',
      sequence: 1,
      title: 'First contact',
    },
    title: 'First contact',
    situation: {
      en: 'You need to politely ask if someone speaks English.',
      de: 'Du willst freundlich fragen, ob jemand Englisch spricht.',
    },
    pedagogicalGoal:
      'Ask whether someone speaks English before continuing a conversation, using one short A1-safe English phrase.',
    modeSet: 'guided-today-v0',
    steps: ['scene', 'matchPairs', 'build', 'type', 'speak', 'complete'],
    estimatedMinutes: 5,
    fallbackVibeId: 'bright',
    status: 'active',
    nextLessonTeaser: {
      title: 'Polite follow-up',
      situation: 'Bitte jemanden, das langsam zu wiederholen.',
    },
    vibeVariants: {
      bright: {
        contentStatus: 'final',
        corePhrase: {
          targetText: 'Excuse me, do you speak English?',
          baseText: 'Entschuldigung, sprechen Sie Englisch?',
        },
        meaning: 'A polite first question before continuing in English.',
        chunks: [
          { id: 'excuse-me', targetText: 'Excuse me', baseText: 'Entschuldigung' },
          { id: 'do-you-speak', targetText: 'do you speak', baseText: 'sprechen Sie' },
          { id: 'english', targetText: 'English', baseText: 'Englisch' },
        ],
        lessonItems: [
          { id: 'excuse-me', targetText: 'excuse me', baseText: 'Entschuldigung', acceptedAnswers: ['excuse me'], reviewDistractorIds: ['please', 'thank-you'] },
          { id: 'do-you-speak', targetText: 'do you speak', baseText: 'sprechen Sie', acceptedAnswers: ['do you speak'], reviewDistractorIds: ['english', 'please'] },
          { id: 'english', targetText: 'English', baseText: 'Englisch', acceptedAnswers: ['English', 'english'], reviewDistractorIds: ['please', 'thank-you'] },
          { id: 'please', targetText: 'please', baseText: 'bitte', acceptedAnswers: ['please'], reviewDistractorIds: ['thank-you', 'english'] },
          { id: 'thank-you', targetText: 'thank you', baseText: 'danke', acceptedAnswers: ['thank you', 'thanks'], reviewDistractorIds: ['please', 'english'] },
        ],
        build: {
          targetText: 'Excuse me, do you speak English?',
          chips: ['Excuse me,', 'do you speak', 'English?', 'please', 'thank you'],
        },
        typeRecall: {
          before: 'Excuse me, do you speak ',
          answer: 'English',
          after: '?',
          acceptedAnswers: ['English', 'english'],
          fallbackChoices: ['English', 'German', 'please', 'thank you'],
        },
        speakTarget: {
          baseCue: 'Entschuldigung, sprechen Sie Englisch?',
          targetPhrase: 'Excuse me, do you speak English?',
          language: 'en-US',
          passingThreshold: 0.8,
        },
        sceneCaption: 'Eine erste höfliche Frage, bevor ein Gespräch beginnt.',
        trophyWord: {
          word: 'please',
          meaning: 'bitte',
          example: 'Please speak slowly.',
          whyThisWord: 'Bright learners need a small courtesy word that keeps beginner requests warm.',
        },
        videoUrl: '/guided/english-a1-practical/lesson-001-first-contact.mp4',
        songSeed: {
          genre: 'light acoustic pop',
          mood: 'open and helpful',
        },
        visualNotes: 'Daylight, welcoming distance, friendly first contact.',
      },
      wistful: {
        contentStatus: 'draft',
        corePhrase: {
          targetText: 'Sorry, do you speak English?',
          baseText: 'Entschuldigung, sprechen Sie Englisch?',
        },
        meaning: 'A softer way to ask for English when you feel unsure.',
        chunks: [
          { id: 'sorry', targetText: 'Sorry', baseText: 'Entschuldigung' },
          { id: 'do-you-speak', targetText: 'do you speak', baseText: 'sprechen Sie' },
          { id: 'english', targetText: 'English', baseText: 'Englisch' },
        ],
        lessonItems: [
          { id: 'sorry', targetText: 'sorry', baseText: 'Entschuldigung', acceptedAnswers: ['sorry'], reviewDistractorIds: ['please', 'thank-you'] },
          { id: 'do-you-speak', targetText: 'do you speak', baseText: 'sprechen Sie', acceptedAnswers: ['do you speak'], reviewDistractorIds: ['english', 'please'] },
          { id: 'english', targetText: 'English', baseText: 'Englisch', acceptedAnswers: ['English', 'english'], reviewDistractorIds: ['please', 'thank-you'] },
          { id: 'please', targetText: 'please', baseText: 'bitte', acceptedAnswers: ['please'], reviewDistractorIds: ['thank-you', 'english'] },
          { id: 'thank-you', targetText: 'thank you', baseText: 'danke', acceptedAnswers: ['thank you', 'thanks'], reviewDistractorIds: ['please', 'english'] },
        ],
        build: {
          targetText: 'Sorry, do you speak English?',
          chips: ['Sorry,', 'do you speak', 'English?', 'please', 'thank you'],
        },
        typeRecall: {
          before: 'Sorry, do you speak ',
          answer: 'English',
          after: '?',
          acceptedAnswers: ['English', 'english'],
          fallbackChoices: ['English', 'German', 'please', 'thank you'],
        },
        speakTarget: {
          baseCue: 'Entschuldigung, sprechen Sie Englisch?',
          targetPhrase: 'Sorry, do you speak English?',
          language: 'en-US',
          passingThreshold: 0.8,
        },
        sceneCaption: 'Ein leiser erster Versuch, verstanden zu werden.',
        trophyWord: {
          word: 'sorry',
          meaning: 'Entschuldigung',
          example: 'Sorry, do you speak English?',
          whyThisWord: 'Wistful starts with a soft opener that lowers pressure without losing usefulness.',
        },
        placeholderMedia: {
          caption: 'Ein ruhiger Moment vor der ersten Frage.',
        },
        songSeed: {
          genre: 'soft indie folk',
          mood: 'quiet and searching',
        },
        visualNotes: 'Evening light, gentler contrast, more breathing room around the phrase.',
      },
      sharp: {
        contentStatus: 'draft',
        corePhrase: {
          targetText: 'Can you speak English?',
          baseText: 'Können Sie Englisch sprechen?',
        },
        meaning: 'A direct question that gets to the point quickly.',
        chunks: [
          { id: 'can-you', targetText: 'Can you', baseText: 'Können Sie' },
          { id: 'speak', targetText: 'speak', baseText: 'sprechen' },
          { id: 'english', targetText: 'English', baseText: 'Englisch' },
        ],
        lessonItems: [
          { id: 'can-you', targetText: 'can you', baseText: 'können Sie', acceptedAnswers: ['can you'], reviewDistractorIds: ['please', 'thank-you'] },
          { id: 'speak', targetText: 'speak', baseText: 'sprechen', acceptedAnswers: ['speak'], reviewDistractorIds: ['english', 'please'] },
          { id: 'english', targetText: 'English', baseText: 'Englisch', acceptedAnswers: ['English', 'english'], reviewDistractorIds: ['please', 'thank-you'] },
          { id: 'please', targetText: 'please', baseText: 'bitte', acceptedAnswers: ['please'], reviewDistractorIds: ['thank-you', 'english'] },
          { id: 'thank-you', targetText: 'thank you', baseText: 'danke', acceptedAnswers: ['thank you', 'thanks'], reviewDistractorIds: ['please', 'english'] },
        ],
        build: {
          targetText: 'Can you speak English?',
          chips: ['Can you', 'speak', 'English?', 'please', 'thank you'],
        },
        typeRecall: {
          before: 'Can you speak ',
          answer: 'English',
          after: '?',
          acceptedAnswers: ['English', 'english'],
          fallbackChoices: ['English', 'German', 'please', 'thank you'],
        },
        speakTarget: {
          baseCue: 'Können Sie Englisch sprechen?',
          targetPhrase: 'Can you speak English?',
          language: 'en-US',
          passingThreshold: 0.8,
        },
        sceneCaption: 'Eine klare Frage ohne Umwege.',
        trophyWord: {
          word: 'clear',
          meaning: 'klar',
          example: 'A clear question helps.',
          whyThisWord: 'Sharp rewards precision: the learner says what they need with no extra ornament.',
        },
        placeholderMedia: {
          caption: 'Eine knappe, klare Szene für eine direkte Frage.',
        },
        songSeed: {
          genre: 'minimal synth pulse',
          mood: 'focused and quick',
        },
        visualNotes: 'Higher contrast, tighter framing, crisp motion.',
      },
    },
  },
]

export function getCurrentGuidedLesson(vibeId?: GuidedVibeId | string | null) {
  const lesson = GUIDED_LESSONS[0]
  if (!lesson) {
    throw new Error('No Guided Today lesson is configured.')
  }
  return resolveGuidedLessonVariant(lesson, vibeId)
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
