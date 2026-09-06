import {
  ACTIVE_GUIDED_VIBE_IDS,
  DEFAULT_GUIDED_VIBE_ID,
  isActiveGuidedVibeId,
  type ActiveGuidedVibeId,
  type GuidedVibeId,
} from '@/data/guidedVibes'
import type { TodayProgressState } from '@/lib/todayProgress'
import { GUIDED_PATH_LESSON_IDS, GUIDED_PATH_OPTIONS } from './guided-runtime/pathIndex'

export type LessonMediaType = 'image' | 'video' | 'music_video'

export type GuidedTargetLanguage = 'English' | 'Spanish' | 'Italian' | 'French' | 'Portuguese' | 'German' | 'Cebuano' | 'Indonesian' | 'Polish' | 'Korean' | 'Russian' | 'Japanese'
export type GuidedBaseLanguage = 'German' | 'English'
export type GuidedBaseContentLocale = 'en' | 'de'
export type GuidedBaseContentText = Partial<Record<GuidedBaseContentLocale, string>>
export type GuidedSpeakLocale = 'en-US' | 'en-GB' | 'es-ES' | 'it-IT' | 'fr-FR' | 'pt-BR' | 'de-DE' | 'ceb-PH' | 'id-ID' | 'pl-PL' | 'ko-KR' | 'ru-RU' | 'ja-JP'

export const GUIDED_BASE_LANGUAGE_TO_CONTENT_LOCALE: Partial<Record<string, GuidedBaseContentLocale>> = {
  English: 'en',
  German: 'de',
} satisfies Partial<Record<string, GuidedBaseContentLocale>>

export function guidedBaseLanguageToContentLocale(
  baseLanguage: string | null | undefined,
): GuidedBaseContentLocale | undefined {
  return baseLanguage ? GUIDED_BASE_LANGUAGE_TO_CONTENT_LOCALE[baseLanguage] : undefined
}

export function guidedContentLocaleToBaseLanguage(locale: GuidedBaseContentLocale): GuidedBaseLanguage {
  return locale === 'de' ? 'German' : 'English'
}

export function isGuidedBaseContentText(value: unknown): value is GuidedBaseContentText {
  return typeof value === 'object' && value !== null
}

export function resolveGuidedBaseContent(
  value: GuidedBaseContentText | undefined,
  options: {
    preferredBaseLanguage?: string | null
    authoredBaseLanguage: GuidedBaseLanguage
  },
): {
  text: string
  locale: GuidedBaseContentLocale
  language: GuidedBaseLanguage
  isFallback: boolean
} {
  const authoredLocale = guidedBaseLanguageToContentLocale(options.authoredBaseLanguage) ?? 'en'
  const preferredLocale = guidedBaseLanguageToContentLocale(options.preferredBaseLanguage)

  const preferredText = preferredLocale ? value?.[preferredLocale]?.trim() : undefined
  if (preferredLocale && preferredText) {
    return {
      text: value?.[preferredLocale] ?? '',
      locale: preferredLocale,
      language: guidedContentLocaleToBaseLanguage(preferredLocale),
      isFallback: false,
    }
  }

  const authoredText = value?.[authoredLocale]?.trim()
  if (authoredText) {
    return {
      text: value?.[authoredLocale] ?? '',
      locale: authoredLocale,
      language: guidedContentLocaleToBaseLanguage(authoredLocale),
      isFallback: preferredLocale !== undefined && preferredLocale !== authoredLocale,
    }
  }

  const fallbackLocale = (['en', 'de'] as const).find((locale) => value?.[locale]?.trim()) ?? authoredLocale
  return {
    text: value?.[fallbackLocale] ?? '',
    locale: fallbackLocale,
    language: guidedContentLocaleToBaseLanguage(fallbackLocale),
    isFallback: fallbackLocale !== preferredLocale,
  }
}

export type GuidedLessonMedia = {
  type: LessonMediaType
  url: string
  posterUrl?: string
  caption: GuidedBaseContentText
}

export type GuidedLessonLevel = 'A1' | 'A2' | 'B1'

export type GuidedPathMetadata = {
  id: string
  title: string
  shortTitle: string
  subtitle: GuidedBaseContentText
  level: GuidedLessonLevel
  baseLanguage: GuidedBaseLanguage
  targetLanguage: GuidedTargetLanguage
  estimatedMinutes: number
}

export type GuidedLessonMetadata = {
  id: string
  sequence: number
  title: GuidedBaseContentText
}

export type PhraseChunk = {
  id: string
  targetText: string
  baseText: GuidedBaseContentText
}

export type GuidedMatchPair = PhraseChunk

export type LessonItem = {
  id: string
  targetText: string
  baseText: GuidedBaseContentText
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

export type GuidedLessonStep =
  | 'scene'
  | 'matchPairs'
  | 'pattern'
  | 'build'
  | 'type'
  | 'complication'
  | 'rolePlay'
  | 'speak'
  | 'review'
  | 'complete'

export type GuidedLessonTrophyWord = {
  word: string
  meaning: GuidedBaseContentText
  example: string
  whyThisWord: GuidedBaseContentText
}

export type GuidedLessonSongSeed = {
  genre: string
  mood: string
}

export type GuidedLessonPlaceholderMedia = {
  type?: LessonMediaType
  url?: string
  posterUrl?: string
  caption?: GuidedBaseContentText
}

/**
 * B1 episode types (docs/Product/FABLE_B1_LEARNING_PATH_DESIGN.md §3).
 * A B1 lesson is a four-turn episode them/you/them/you: dialogue[1] (you₁) is
 * the corePhrase (built, spoken, TTS-anchored) and dialogue[3] (you₂) is the
 * complication cloze's full text. A1/A2 lessons never carry these fields.
 */
export type GuidedDialogueTurn = {
  speaker: 'them' | 'you'
  targetText: string
  baseText: GuidedBaseContentText
}

export type GuidedPatternExample = {
  targetText: string
  baseText: GuidedBaseContentText
  /** exact substring of targetText that carries the anchor form (rendered highlighted) */
  highlight: string
}

export type GuidedPatternSpotlight = {
  /** anchor name shown as a chip, e.g. 'Perfekt' — kept in the target language's grammar term */
  label: string
  /** one base-language sentence, no metalanguage beyond the label's term */
  rule: GuidedBaseContentText
  examples: GuidedPatternExample[]
}

export type GuidedClozeBlankKind = 'form' | 'connector' | 'choice'

export type GuidedClozeBlank = {
  kind: GuidedClozeBlankKind
  /** canonical answer; multi-word (≤ 3 words) allowed for clause-final form blanks */
  answer: string
  acceptedAnswers: string[]
  /** lemma cue shown for form blanks, e.g. 'verlieren' */
  cue?: string
  /** choice blanks: exactly 4 same-category chips (incl. the answer); typed kinds: 4 fallback chips revealed on a miss */
  choices: string[]
}

export type GuidedClozeSegment =
  | { type: 'text'; text: string }
  | { type: 'blank'; blank: GuidedClozeBlank }

export type GuidedCloze = {
  /** segments concatenate (answers in place of blanks) to dialogue[3].targetText */
  segments: GuidedClozeSegment[]
}

/** One interlocutor per lesson; all four turns agree. Supersedes A2's per-path register lock at B1. */
export type GuidedRegister = 'Sie' | 'du'

export type GuidedLessonVibeVariant = {
  contentStatus: 'final' | 'draft'
  corePhrase: {
    targetText: string
    baseText: GuidedBaseContentText
  }
  meaning: GuidedBaseContentText
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
    baseCue: GuidedBaseContentText
    targetPhrase: string
    displayAnswer?: string
    targetAnswer?: string
    acceptedAnswers?: string[]
    requiredTokens?: string[]
    optionalTokens?: string[]
    maxRecordingSeconds?: number
    language: GuidedSpeakLocale
    passingThreshold: number
  }
  sceneCaption: GuidedBaseContentText
  trophyWord: GuidedLessonTrophyWord
  videoUrl?: string
  placeholderMedia?: GuidedLessonPlaceholderMedia
  songSeed?: GuidedLessonSongSeed
  visualNotes?: string
  /** B1 only (validated mandatory there): the four-turn episode + its steps' data */
  dialogue?: GuidedDialogueTurn[]
  pattern?: GuidedPatternSpotlight
  cloze?: GuidedCloze
  register?: GuidedRegister
}

export type GuidedLessonDefinition = {
  id: string
  pathId: string
  courseTitle: string
  level: GuidedLessonLevel
  lessonNumber: number
  baseLanguage: GuidedBaseLanguage
  targetLanguage: GuidedTargetLanguage
  pathMetadata: GuidedPathMetadata
  lessonMetadata: GuidedLessonMetadata
  title: GuidedBaseContentText
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
    title: GuidedBaseContentText
    situation: GuidedBaseContentText
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
  sceneCaption: GuidedBaseContentText
  songSeed?: GuidedLessonSongSeed
  dialogue?: GuidedDialogueTurn[]
  pattern?: GuidedPatternSpotlight
  cloze?: GuidedCloze
  register?: GuidedRegister
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

export function resolveGuidedLessonEffectiveBaseLanguage(
  lesson: GuidedLesson,
  preferredBaseLanguage?: string | null,
): GuidedBaseLanguage {
  return resolveGuidedBaseContent(lesson.corePhrase.baseText, {
    preferredBaseLanguage,
    authoredBaseLanguage: lesson.baseLanguage,
  }).language
}


type GuidedLanguageModule = {
  GUIDED_LANGUAGE_LESSONS: GuidedLessonDefinition[]
}

const GUIDED_LANGUAGE_LOADERS: Record<GuidedTargetLanguage, () => Promise<GuidedLanguageModule>> = {
  English: () => import('./guided-runtime/english'),
  Spanish: () => import('./guided-runtime/spanish'),
  Italian: () => import('./guided-runtime/italian'),
  French: () => import('./guided-runtime/french'),
  Portuguese: () => import('./guided-runtime/portuguese'),
  German: () => import('./guided-runtime/german'),
  Cebuano: () => import('./guided-runtime/cebuano'),
  Indonesian: () => import('./guided-runtime/indonesian'),
  Polish: () => import('./guided-runtime/polish'),
  Korean: () => import('./guided-runtime/korean'),
  Russian: () => import('./guided-runtime/russian'),
  Japanese: () => import('./guided-runtime/japanese'),
}

export const GUIDED_LESSONS: GuidedLessonDefinition[] = []

const loadedGuidedLanguages = new Set<GuidedTargetLanguage>()
const guidedLanguagePromises = new Map<GuidedTargetLanguage, Promise<void>>()

export function resolveGuidedTargetLanguage(language: string | null | undefined): GuidedTargetLanguage | undefined {
  const normalized = (language ?? '').trim().toLowerCase()
  if (normalized === 'bisaya') return 'Cebuano'
  return (Object.keys(GUIDED_LANGUAGE_LOADERS) as GuidedTargetLanguage[])
    .find((candidate) => candidate.toLowerCase() === normalized)
}

export function isGuidedLanguageLoaded(language: string | null | undefined): boolean {
  const resolved = resolveGuidedTargetLanguage(language)
  return resolved ? loadedGuidedLanguages.has(resolved) : false
}

export async function loadGuidedLessonsForLanguage(language: string | null | undefined): Promise<GuidedTargetLanguage> {
  const resolved = resolveGuidedTargetLanguage(language)
  if (!resolved) throw new Error(`Unsupported guided language: ${language ?? ''}`)
  if (loadedGuidedLanguages.has(resolved)) return resolved

  const inFlight = guidedLanguagePromises.get(resolved)
  if (inFlight) {
    await inFlight
    return resolved
  }

  const request = GUIDED_LANGUAGE_LOADERS[resolved]().then(({ GUIDED_LANGUAGE_LESSONS }) => {
    const knownIds = new Set(GUIDED_LESSONS.map((lesson) => lesson.id))
    for (const lesson of GUIDED_LANGUAGE_LESSONS) {
      if (!knownIds.has(lesson.id)) GUIDED_LESSONS.push(lesson)
    }
    loadedGuidedLanguages.add(resolved)
  }).finally(() => {
    guidedLanguagePromises.delete(resolved)
  })
  guidedLanguagePromises.set(resolved, request)
  await request
  return resolved
}

export async function loadGuidedLessonsForPath(pathId: string): Promise<GuidedTargetLanguage> {
  const path = getGuidedPathMetadata(pathId)
  if (!path) throw new Error(`Unknown guided path: ${pathId}`)
  return loadGuidedLessonsForLanguage(path.targetLanguage)
}

export async function loadAllGuidedLessons(): Promise<void> {
  const languages = Array.from(new Set(GUIDED_PATH_OPTIONS.map((path) => path.targetLanguage)))
  for (const language of languages) await loadGuidedLessonsForLanguage(language)
}

export function getCurrentGuidedLesson(vibeId?: GuidedVibeId | string | null) {
  const defaultPathId = GUIDED_PATH_OPTIONS[0]?.id
  const lesson = defaultPathId ? getGuidedPathLessons(defaultPathId)[0] : undefined
  if (!lesson) {
    throw new Error('No Guided Today lesson is loaded. Call loadGuidedLessonsForLanguage first.')
  }
  return resolveGuidedLessonVariant(lesson, vibeId)
}

export function getGuidedTodayPathOptions(): GuidedPathMetadata[] {
  return GUIDED_PATH_OPTIONS
}

export function getGuidedPathMetadata(pathId: string): GuidedPathMetadata | undefined {
  return getGuidedTodayPathOptions().find((metadata) => metadata.id === pathId)
}

export function getGuidedPathLessonIds(pathId: string): readonly string[] {
  return GUIDED_PATH_LESSON_IDS[pathId] ?? []
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
  Portuguese: ['pt-BR'],
  German: ['de-DE'],
  Cebuano: ['ceb-PH'],
  Indonesian: ['id-ID'],
  Polish: ['pl-PL'],
  Korean: ['ko-KR'],
  Russian: ['ru-RU'],
  Japanese: ['ja-JP'],
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
    dialogue: variant.dialogue,
    pattern: variant.pattern,
    cloze: variant.cloze,
    register: variant.register,
  }
}

/** The full cloze text (answers in place): must equal dialogue[3].targetText for B1 lessons. */
export function getGuidedClozeText(cloze: GuidedCloze): string {
  return cloze.segments
    .map((segment) => (segment.type === 'text' ? segment.text : segment.blank.answer))
    .join('')
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
  // B1 anchors lexis from the WHOLE episode before the pattern step (design doc
  // §3.2 step 2) — lessonItems carry those 6–8 items; A1/A2 keep chunk pairs.
  const source = lesson.level === 'B1' ? lesson.lessonItems : lesson.phraseChunks
  return source.map((entry) => ({
    id: entry.id,
    targetText: entry.targetText,
    baseText: entry.baseText,
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
