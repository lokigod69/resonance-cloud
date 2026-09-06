import {
  getGuidedPathLessonIds,
  getGuidedPathLessons,
  getGuidedTodayPathOptions,
  resolveGuidedLessonVariant,
  type GuidedLesson,
  type GuidedPathMetadata,
  type GuidedTargetLanguage,
} from '@/data/guidedLessons'
import type { ActiveGuidedVibeId } from '@/data/guidedVibes'
import type { TodayProgressState } from '@/lib/todayProgress'

export const GUIDED_CHECKPOINT_ITEM_COUNT = 8
export const GUIDED_SEGMENT_REVIEW_ITEM_COUNT = 5

export type GuidedSegmentReviewNumber = 1 | 2

export type GuidedCheckpointPlanItem = {
  lesson: GuidedLesson
  lessonId: string
  pathId: string
  vibe: ActiveGuidedVibeId
}

export type GuidedCheckpointPlan = {
  vibe: ActiveGuidedVibeId
  checkpointIndex: number
  completedPathCount: number
  pathId?: string
  segment?: GuidedSegmentReviewNumber
  items: GuidedCheckpointPlanItem[]
}

export type GuidedCheckpointReviewedItem = {
  lessonId: string
  pathId: string
  vibe: ActiveGuidedVibeId
  firstTryCorrect: boolean
  needsReview: boolean
}

export type GuidedCheckpointRecord = {
  completedAt: string
  itemsReviewed: number
  itemsCorrectFirstTry: number
  items: GuidedCheckpointReviewedItem[]
}

export type GuidedCheckpointScope = {
  userId: string
  targetLanguage: GuidedTargetLanguage
  vibe: ActiveGuidedVibeId
}

export type GuidedSegmentReviewScope = {
  userId: string
  pathId: string
  segment: GuidedSegmentReviewNumber
  vibe: ActiveGuidedVibeId
}

export type GuidedCheckpointWriteResult = {
  record: GuidedCheckpointRecord
  saved: boolean
  alreadyCompleted: boolean
}

export type GuidedCheckpointDraftMode = 'checkpoint' | 'path-check' | 'segment-review'

export type GuidedCheckpointDraft = {
  schemaVersion: 1
  mode: GuidedCheckpointDraftMode
  pathId: string
  segment?: GuidedSegmentReviewNumber
  targetLanguage: GuidedTargetLanguage
  vibe: ActiveGuidedVibeId
  checkpointIndex: number
  completedPathCount: number
  itemIndex: number
  phase: 'type' | 'speak'
  planItems: Array<Pick<GuidedCheckpointPlanItem, 'lessonId' | 'pathId' | 'vibe'>>
  reviewedItems: GuidedCheckpointReviewedItem[]
  updatedAt: string
}

export type GuidedCheckpointDraftScope = Pick<
  GuidedCheckpointDraft,
  'mode' | 'pathId' | 'segment' | 'targetLanguage' | 'vibe'
> & { userId: string }

type RandomSource = () => number

export function guidedCheckpointKey(scope: GuidedCheckpointScope, checkpointIndex: number) {
  return `guided_checkpoint_v2_${encodeURIComponent(scope.userId)}_${scope.targetLanguage}_${scope.vibe}_${checkpointIndex}`
}

export function countCompletedGuidedCheckpointPaths(
  progress: TodayProgressState,
  targetLanguage: GuidedTargetLanguage,
  vibe: ActiveGuidedVibeId,
  pathOptions: GuidedPathMetadata[] = getGuidedTodayPathOptions(),
) {
  return getCompletedGuidedCheckpointPathIds(progress, targetLanguage, vibe, pathOptions).length
}

export function hasPendingGuidedCheckpoint(
  progress: TodayProgressState,
  scope: GuidedCheckpointScope,
  checkpointCount = getGuidedCheckpointCount(scope),
  pathOptions: GuidedPathMetadata[] = getGuidedTodayPathOptions(),
) {
  return countCompletedGuidedCheckpointPaths(progress, scope.targetLanguage, scope.vibe, pathOptions) > checkpointCount
}

export function buildGuidedCheckpointPlan(
  progress: TodayProgressState,
  scope: GuidedCheckpointScope,
  random: RandomSource = Math.random,
  pathOptions: GuidedPathMetadata[] = getGuidedTodayPathOptions(),
): GuidedCheckpointPlan | undefined {
  const completedPathIds = getCompletedGuidedCheckpointPathIds(progress, scope.targetLanguage, scope.vibe, pathOptions)
  if (completedPathIds.length === 0) return undefined

  const eligibleByPath = new Map<string, GuidedCheckpointPlanItem[]>()
  for (const pathId of completedPathIds) {
    const items = getGuidedPathLessons(pathId)
      .filter((lesson) => isLessonCompletedInVibe(progress, pathId, lesson.id, scope.vibe))
      .map((lesson) => {
        const resolvedLesson = resolveGuidedLessonVariant(lesson, scope.vibe)
        return {
          lesson: resolvedLesson,
          lessonId: resolvedLesson.id,
          pathId,
          vibe: scope.vibe,
        }
      })

    if (items.length > 0) {
      eligibleByPath.set(pathId, items)
    }
  }

  const totalEligible = Array.from(eligibleByPath.values())
    .reduce((total, items) => total + items.length, 0)
  if (totalEligible < GUIDED_CHECKPOINT_ITEM_COUNT) return undefined

  const quotas = getCheckpointPathQuotas(completedPathIds)
  const selected: GuidedCheckpointPlanItem[] = []
  const selectedKeys = new Set<string>()
  const pathBuckets: Array<{ pathId: string; items: GuidedCheckpointPlanItem[] }> = []

  for (const pathId of completedPathIds) {
    const pool = shuffle(eligibleByPath.get(pathId) ?? [], random)
    const quota = quotas.get(pathId) ?? 0
    const items = pool.slice(0, quota)
    pathBuckets.push({ pathId, items })
    for (const item of items) {
      selected.push(item)
      selectedKeys.add(checkpointItemKey(item))
    }
  }

  if (selected.length < GUIDED_CHECKPOINT_ITEM_COUNT) {
    const remaining = shuffle(
      Array.from(eligibleByPath.values())
        .flat()
        .filter((item) => !selectedKeys.has(checkpointItemKey(item))),
      random,
    )

    for (const item of remaining) {
      if (selected.length >= GUIDED_CHECKPOINT_ITEM_COUNT) break
      selected.push(item)
      selectedKeys.add(checkpointItemKey(item))
      const bucket = pathBuckets.find((entry) => entry.pathId === item.pathId)
      if (bucket) bucket.items.push(item)
    }
  }

  return {
    vibe: scope.vibe,
    checkpointIndex: getNextGuidedCheckpointIndex(scope),
    completedPathCount: completedPathIds.length,
    items: interleavePathBuckets(pathBuckets, random).slice(0, GUIDED_CHECKPOINT_ITEM_COUNT),
  }
}

export function buildGuidedPathCheckPlan(
  pathId: string,
  vibe: ActiveGuidedVibeId,
  random: RandomSource = Math.random,
  itemCount = GUIDED_CHECKPOINT_ITEM_COUNT,
): GuidedCheckpointPlan | undefined {
  const items = getGuidedPathLessons(pathId).map((lesson) => {
    const resolvedLesson = resolveGuidedLessonVariant(lesson, vibe)
    return {
      lesson: resolvedLesson,
      lessonId: resolvedLesson.id,
      pathId,
      vibe,
    }
  })

  if (items.length < itemCount) return undefined

  return {
    vibe,
    checkpointIndex: 0,
    completedPathCount: 1,
    items: shuffle(items, random).slice(0, itemCount),
  }
}

export function buildGuidedSegmentReviewPlan(
  progress: TodayProgressState,
  pathId: string,
  segment: number,
  vibe: ActiveGuidedVibeId,
  random: RandomSource = Math.random,
  itemCount = GUIDED_SEGMENT_REVIEW_ITEM_COUNT,
): GuidedCheckpointPlan | undefined {
  void progress
  void random
  const segmentDefinition = getGuidedSegmentReviewDefinition(segment)
  if (!segmentDefinition) return undefined

  const items = getGuidedPathLessons(pathId)
    .filter((lesson) => (
      lesson.lessonNumber >= segmentDefinition.startLesson
      && lesson.lessonNumber <= segmentDefinition.endLesson
    ))
    .sort((left, right) => left.lessonNumber - right.lessonNumber)
    .map((lesson) => {
      const resolvedLesson = resolveGuidedLessonVariant(lesson, vibe)
      return {
        lesson: resolvedLesson,
        lessonId: resolvedLesson.id,
        pathId,
        vibe,
      }
    })

  if (items.length === 0) return undefined

  return {
    vibe,
    checkpointIndex: 0,
    completedPathCount: 0,
    pathId,
    segment: segmentDefinition.segment,
    items: items.slice(0, itemCount),
  }
}

export function getGuidedCheckpointCount(scope: GuidedCheckpointScope) {
  if (!scope.userId) return 0
  return getGuidedCheckpointIndexes(scope).length
}

export function getNextGuidedCheckpointIndex(scope: GuidedCheckpointScope) {
  const indexes = getGuidedCheckpointIndexes(scope)
  if (indexes.length === 0) return 0
  return Math.max(...indexes) + 1
}

export function readGuidedCheckpointRecord(
  scope: GuidedCheckpointScope,
  checkpointIndex: number,
): GuidedCheckpointRecord | undefined {
  if (!scope.userId || !canUseLocalStorage()) return undefined

  try {
    const raw = window.localStorage.getItem(guidedCheckpointKey(scope, checkpointIndex))
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as GuidedCheckpointRecord
    if (!isGuidedCheckpointRecord(parsed, scope.vibe)) return undefined
    return parsed
  } catch {
    return undefined
  }
}

export function completeGuidedCheckpoint(
  scope: GuidedCheckpointScope,
  checkpointIndex: number,
  items: GuidedCheckpointReviewedItem[],
  completedAt: Date = new Date(),
): GuidedCheckpointWriteResult {
  const record: GuidedCheckpointRecord = {
    completedAt: completedAt.toISOString(),
    itemsReviewed: items.length,
    itemsCorrectFirstTry: items.filter((item) => item.firstTryCorrect).length,
    items: items.map((item) => ({
      lessonId: item.lessonId,
      pathId: item.pathId,
      vibe: item.vibe,
      firstTryCorrect: item.firstTryCorrect,
      needsReview: item.needsReview,
    })),
  }

  if (!scope.userId || !canUseLocalStorage()) return { record, saved: false, alreadyCompleted: false }

  try {
    const existing = readGuidedCheckpointRecord(scope, checkpointIndex)
    if (existing) return { record: existing, saved: true, alreadyCompleted: true }
    window.localStorage.setItem(
      guidedCheckpointKey(scope, checkpointIndex),
      JSON.stringify(record),
    )
  } catch {
    return { record, saved: false, alreadyCompleted: false }
  }

  return { record, saved: true, alreadyCompleted: false }
}

export function guidedSegmentReviewKey(
  scope: GuidedSegmentReviewScope,
) {
  return `guided_segment_review_v2_${encodeURIComponent(scope.userId)}_${encodeURIComponent(scope.pathId)}_${scope.vibe}_${scope.segment}`
}

export function readGuidedSegmentReviewRecord(
  scope: GuidedSegmentReviewScope,
): GuidedCheckpointRecord | undefined {
  if (!scope.userId || !canUseLocalStorage()) return undefined

  try {
    const raw = window.localStorage.getItem(guidedSegmentReviewKey(scope))
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as GuidedCheckpointRecord
    if (!isGuidedCheckpointRecord(parsed, scope.vibe)) return undefined
    return parsed
  } catch {
    return undefined
  }
}

export function completeGuidedSegmentReview(
  scope: GuidedSegmentReviewScope,
  items: GuidedCheckpointReviewedItem[],
  completedAt: Date = new Date(),
): GuidedCheckpointWriteResult {
  const record: GuidedCheckpointRecord = {
    completedAt: completedAt.toISOString(),
    itemsReviewed: items.length,
    itemsCorrectFirstTry: items.filter((item) => item.firstTryCorrect).length,
    items: items.map((item) => ({
      lessonId: item.lessonId,
      pathId: item.pathId,
      vibe: item.vibe,
      firstTryCorrect: item.firstTryCorrect,
      needsReview: item.needsReview,
    })),
  }

  if (!scope.userId || !canUseLocalStorage()) return { record, saved: false, alreadyCompleted: false }

  try {
    const existing = readGuidedSegmentReviewRecord(scope)
    if (existing) return { record: existing, saved: true, alreadyCompleted: true }
    window.localStorage.setItem(
      guidedSegmentReviewKey(scope),
      JSON.stringify(record),
    )
  } catch {
    return { record, saved: false, alreadyCompleted: false }
  }

  return { record, saved: true, alreadyCompleted: false }
}

export function guidedCheckpointDraftKey(scope: GuidedCheckpointDraftScope) {
  const segment = scope.segment ?? 0
  return `guided_checkpoint_draft_v1_${encodeURIComponent(scope.userId)}_${scope.targetLanguage}_${scope.vibe}_${scope.mode}_${encodeURIComponent(scope.pathId)}_${segment}`
}

export function readGuidedCheckpointDraft(
  scope: GuidedCheckpointDraftScope,
): GuidedCheckpointDraft | undefined {
  if (!scope.userId || !canUseLocalStorage()) return undefined

  try {
    const raw = window.localStorage.getItem(guidedCheckpointDraftKey(scope))
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as unknown
    return isGuidedCheckpointDraft(parsed, scope) ? parsed : undefined
  } catch {
    return undefined
  }
}

export function writeGuidedCheckpointDraft(
  scope: GuidedCheckpointDraftScope,
  draft: GuidedCheckpointDraft,
): boolean {
  if (!scope.userId || !canUseLocalStorage() || !isGuidedCheckpointDraft(draft, scope)) return false

  try {
    window.localStorage.setItem(guidedCheckpointDraftKey(scope), JSON.stringify(draft))
    return true
  } catch {
    return false
  }
}

export function clearGuidedCheckpointDraft(scope: GuidedCheckpointDraftScope): boolean {
  if (!scope.userId || !canUseLocalStorage()) return false

  try {
    window.localStorage.removeItem(guidedCheckpointDraftKey(scope))
    return true
  } catch {
    return false
  }
}

export function restoreGuidedCheckpointPlan(draft: GuidedCheckpointDraft): GuidedCheckpointPlan | undefined {
  const items: GuidedCheckpointPlanItem[] = []
  for (const reference of draft.planItems) {
    const definition = getGuidedPathLessons(reference.pathId)
      .find((lesson) => lesson.id === reference.lessonId && lesson.targetLanguage === draft.targetLanguage)
    if (!definition) return undefined
    const lesson = resolveGuidedLessonVariant(definition, reference.vibe)
    items.push({
      lesson,
      lessonId: lesson.id,
      pathId: lesson.pathId,
      vibe: reference.vibe,
    })
  }

  if (items.length === 0 || draft.itemIndex >= items.length) return undefined
  return {
    vibe: draft.vibe,
    checkpointIndex: draft.checkpointIndex,
    completedPathCount: draft.completedPathCount,
    pathId: draft.mode === 'checkpoint' ? undefined : draft.pathId,
    segment: draft.mode === 'segment-review' ? draft.segment : undefined,
    items,
  }
}

function getGuidedSegmentReviewDefinition(segment: number): { segment: GuidedSegmentReviewNumber; startLesson: number; endLesson: number } | undefined {
  if (segment === 1) return { segment: 1, startLesson: 1, endLesson: 5 }
  if (segment === 2) return { segment: 2, startLesson: 6, endLesson: 10 }
  return undefined
}

function getCompletedGuidedCheckpointPathIds(
  progress: TodayProgressState,
  targetLanguage: GuidedTargetLanguage,
  vibe: ActiveGuidedVibeId,
  pathOptions: GuidedPathMetadata[],
) {
  return pathOptions
    .filter((path) => path.targetLanguage === targetLanguage)
    .map((path) => path.id)
    .filter((pathId) => {
      const lessonIds = getGuidedPathLessonIds(pathId)
      return lessonIds.length > 0
        && lessonIds.every((lessonId) => isLessonCompletedInVibe(progress, pathId, lessonId, vibe))
    })
}

function isLessonCompletedInVibe(
  progress: TodayProgressState,
  pathId: string,
  lessonId: string,
  vibe: ActiveGuidedVibeId,
) {
  return Boolean(progress.courses[pathId]?.lessons[lessonId]?.vibeCompletions?.[vibe]?.completedAt)
}

function getCheckpointPathQuotas(pathIds: string[]) {
  const quotas = new Map<string, number>()
  if (pathIds.length === 0) return quotas

  if (pathIds.length === 1) {
    quotas.set(pathIds[0]!, GUIDED_CHECKPOINT_ITEM_COUNT)
    return quotas
  }

  if (pathIds.length === 2) {
    for (const pathId of pathIds) quotas.set(pathId, GUIDED_CHECKPOINT_ITEM_COUNT / 2)
    return quotas
  }

  if (pathIds.length === 3) {
    quotas.set(pathIds[0]!, 3)
    quotas.set(pathIds[1]!, 3)
    quotas.set(pathIds[2]!, 2)
    return quotas
  }

  const floor = Math.floor(GUIDED_CHECKPOINT_ITEM_COUNT / pathIds.length)
  let remainder = GUIDED_CHECKPOINT_ITEM_COUNT % pathIds.length
  for (const pathId of pathIds) {
    quotas.set(pathId, floor)
  }

  for (let index = pathIds.length - 1; index >= 0 && remainder > 0; index -= 1) {
    const pathId = pathIds[index]!
    quotas.set(pathId, (quotas.get(pathId) ?? 0) + 1)
    remainder -= 1
  }

  return quotas
}

function interleavePathBuckets(
  buckets: Array<{ pathId: string; items: GuidedCheckpointPlanItem[] }>,
  random: RandomSource,
) {
  const remaining = shuffle(
    buckets
      .filter((bucket) => bucket.items.length > 0)
      .map((bucket) => ({
        pathId: bucket.pathId,
        items: shuffle(bucket.items, random),
      })),
    random,
  )
  const result: GuidedCheckpointPlanItem[] = []
  let lastPathId = ''

  while (remaining.some((bucket) => bucket.items.length > 0)) {
    const candidates = remaining
      .filter((bucket) => bucket.items.length > 0)
      .sort((left, right) => right.items.length - left.items.length)
    const preferred = candidates.find((bucket) => bucket.pathId !== lastPathId) ?? candidates[0]
    const item = preferred?.items.shift()
    if (!item) break
    result.push(item)
    lastPathId = item.pathId
  }

  return result
}

function shuffle<T>(items: T[], random: RandomSource) {
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    const current = copy[index]!
    copy[index] = copy[swapIndex]!
    copy[swapIndex] = current
  }
  return copy
}

function checkpointItemKey(item: Pick<GuidedCheckpointPlanItem, 'lessonId' | 'pathId' | 'vibe'>) {
  return `${item.pathId}:${item.lessonId}:${item.vibe}`
}

function getGuidedCheckpointIndexes(scope: GuidedCheckpointScope) {
  if (!canUseLocalStorage()) return []

  const prefix = `${guidedCheckpointKey(scope, 0).slice(0, -1)}`
  const indexes: number[] = []

  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index)
      if (!key?.startsWith(prefix)) continue
      const checkpointIndex = Number.parseInt(key.slice(prefix.length), 10)
      if (
        Number.isInteger(checkpointIndex)
        && checkpointIndex >= 0
        && key === guidedCheckpointKey(scope, checkpointIndex)
        && readGuidedCheckpointRecord(scope, checkpointIndex)
      ) {
        indexes.push(checkpointIndex)
      }
    }
  } catch {
    return []
  }

  return indexes.sort((left, right) => left - right)
}

function isGuidedCheckpointRecord(
  value: GuidedCheckpointRecord,
  vibe: ActiveGuidedVibeId,
): value is GuidedCheckpointRecord {
  return typeof value.completedAt === 'string'
    && typeof value.itemsReviewed === 'number'
    && typeof value.itemsCorrectFirstTry === 'number'
    && Array.isArray(value.items)
    && value.items.every((item) => (
      typeof item.lessonId === 'string'
      && typeof item.pathId === 'string'
      && item.vibe === vibe
      && typeof item.firstTryCorrect === 'boolean'
      && typeof item.needsReview === 'boolean'
    ))
}

function isGuidedCheckpointDraft(
  value: unknown,
  scope: GuidedCheckpointDraftScope,
): value is GuidedCheckpointDraft {
  if (!isRecord(value) || value.schemaVersion !== 1) return false
  if (
    value.mode !== scope.mode
    || value.pathId !== scope.pathId
    || value.segment !== scope.segment
    || value.targetLanguage !== scope.targetLanguage
    || value.vibe !== scope.vibe
  ) return false
  if (!Number.isInteger(value.checkpointIndex) || (value.checkpointIndex as number) < 0) return false
  if (!Number.isInteger(value.completedPathCount) || (value.completedPathCount as number) < 0) return false
  if (!Number.isInteger(value.itemIndex) || (value.itemIndex as number) < 0) return false
  if (value.phase !== 'type' && value.phase !== 'speak') return false
  if (typeof value.updatedAt !== 'string' || !Array.isArray(value.planItems) || !Array.isArray(value.reviewedItems)) return false
  if ((value.itemIndex as number) >= value.planItems.length) return false

  return value.planItems.every((item) => (
    isRecord(item)
    && typeof item.lessonId === 'string'
    && typeof item.pathId === 'string'
    && item.vibe === scope.vibe
  )) && value.reviewedItems.every((item) => isGuidedCheckpointReviewedItem(item, scope.vibe))
}

function isGuidedCheckpointReviewedItem(value: unknown, vibe: ActiveGuidedVibeId): value is GuidedCheckpointReviewedItem {
  return isRecord(value)
    && typeof value.lessonId === 'string'
    && typeof value.pathId === 'string'
    && value.vibe === vibe
    && typeof value.firstTryCorrect === 'boolean'
    && typeof value.needsReview === 'boolean'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function canUseLocalStorage() {
  if (typeof window === 'undefined') return false
  try {
    return typeof window.localStorage !== 'undefined'
  } catch {
    return false
  }
}
