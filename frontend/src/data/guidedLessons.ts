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

export type GuidedLesson = {
  id: string
  courseId: string
  courseTitle: string
  level: 'A1'
  sequence: number
  baseLanguage: 'German'
  targetLanguage: 'English'
  pathMetadata: GuidedPathMetadata
  lessonMetadata: GuidedLessonMetadata
  title: string
  situation: {
    en: string
    de: string
  }
  corePhrase: {
    targetText: string
    baseText: string
  }
  phraseChunks: PhraseChunk[]
  lessonItems: LessonItem[]
  lessonMedia: GuidedLessonMedia
  build: {
    targetText: string
    chips: string[]
  }
  typeRecall: {
    before: string
    answer: string
    after: string
    acceptedAnswers: string[]
  }
  nextLessonTeaser: {
    title: string
    situation: string
  }
}

export const GUIDED_LESSONS: GuidedLesson[] = [
  {
    id: 'english-a1-practical-001-first-contact',
    courseId: 'english-a1-practical',
    courseTitle: 'English A1 Practical',
    level: 'A1',
    sequence: 1,
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
    corePhrase: {
      targetText: 'Excuse me, do you speak English?',
      baseText: 'Entschuldigung, sprechen Sie Englisch?',
    },
    phraseChunks: [
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
    lessonMedia: {
      type: 'image',
      url: '',
      caption: 'Eine erste höfliche Frage, bevor ein Gespräch beginnt.',
    },
    build: {
      targetText: 'Excuse me, do you speak English?',
      chips: ['Excuse me,', 'please', 'do you speak', 'thank you', 'English?'],
    },
    typeRecall: {
      before: 'Excuse me, do you speak ',
      answer: 'English',
      after: '?',
      acceptedAnswers: ['English', 'english'],
    },
    nextLessonTeaser: {
      title: 'Polite follow-up',
      situation: 'Bitte jemanden, das langsam zu wiederholen.',
    },
  },
]

export function getCurrentGuidedLesson() {
  return GUIDED_LESSONS[0]
}

export function normalizeGuidedAnswer(answer: string) {
  return answer.trim().replace(/\s+/g, ' ').toLowerCase()
}

export function guidedAnswerMatches(input: string, acceptedAnswers: string[]) {
  const normalizedInput = normalizeGuidedAnswer(input)
  if (!normalizedInput) return false
  return acceptedAnswers.some((answer) => normalizeGuidedAnswer(answer) === normalizedInput)
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

function uniqueLessonItems(items: LessonItem[]) {
  const seen = new Set<string>()
  return items.filter((item) => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}
