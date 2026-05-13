import {
  getGuidedPathLessons,
  getGuidedTodayPathOptions,
  resolveGuidedLessonVariant,
  type GuidedLesson,
  type GuidedPathMetadata,
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

type RandomSource = () => number

export function guidedCheckpointKey(vibe: ActiveGuidedVibeId, checkpointIndex: number) {
  return `guided_checkpoint_${vibe}_${checkpointIndex}`
}

export function countCompletedGuidedCheckpointPaths(
  progress: TodayProgressState,
  vibe: ActiveGuidedVibeId,
  pathOptions: GuidedPathMetadata[] = getGuidedTodayPathOptions(),
) {
  return getCompletedGuidedCheckpointPathIds(progress, vibe, pathOptions).length
}

export function hasPendingGuidedCheckpoint(
  progress: TodayProgressState,
  vibe: ActiveGuidedVibeId,
  checkpointCount = getGuidedCheckpointCount(vibe),
  pathOptions: GuidedPathMetadata[] = getGuidedTodayPathOptions(),
) {
  return countCompletedGuidedCheckpointPaths(progress, vibe, pathOptions) > checkpointCount
}

export function buildGuidedCheckpointPlan(
  progress: TodayProgressState,
  vibe: ActiveGuidedVibeId,
  random: RandomSource = Math.random,
  pathOptions: GuidedPathMetadata[] = getGuidedTodayPathOptions(),
): GuidedCheckpointPlan | undefined {
  const completedPathIds = getCompletedGuidedCheckpointPathIds(progress, vibe, pathOptions)
  if (completedPathIds.length === 0) return undefined

  const eligibleByPath = new Map<string, GuidedCheckpointPlanItem[]>()
  for (const pathId of completedPathIds) {
    const items = getGuidedPathLessons(pathId)
      .filter((lesson) => isLessonCompletedInVibe(progress, pathId, lesson.id, vibe))
      .map((lesson) => {
        const resolvedLesson = resolveGuidedLessonVariant(lesson, vibe)
        return {
          lesson: resolvedLesson,
          lessonId: resolvedLesson.id,
          pathId,
          vibe,
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
    vibe,
    checkpointIndex: getNextGuidedCheckpointIndex(vibe),
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
  const segmentDefinition = getGuidedSegmentReviewDefinition(segment)
  if (!segmentDefinition) return undefined

  const items = getGuidedPathLessons(pathId)
    .filter((lesson) => (
      lesson.lessonNumber >= segmentDefinition.startLesson
      && lesson.lessonNumber <= segmentDefinition.endLesson
      && isLessonCompletedInVibe(progress, pathId, lesson.id, vibe)
    ))
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
    items: shuffle(items, random).slice(0, itemCount),
  }
}

export function getGuidedCheckpointCount(vibe: ActiveGuidedVibeId) {
  return getGuidedCheckpointIndexes(vibe).length
}

export function getNextGuidedCheckpointIndex(vibe: ActiveGuidedVibeId) {
  const indexes = getGuidedCheckpointIndexes(vibe)
  if (indexes.length === 0) return 0
  return Math.max(...indexes) + 1
}

export function readGuidedCheckpointRecord(
  vibe: ActiveGuidedVibeId,
  checkpointIndex: number,
): GuidedCheckpointRecord | undefined {
  if (!canUseLocalStorage()) return undefined

  try {
    const raw = window.localStorage.getItem(guidedCheckpointKey(vibe, checkpointIndex))
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as GuidedCheckpointRecord
    if (!isGuidedCheckpointRecord(parsed, vibe)) return undefined
    return parsed
  } catch {
    return undefined
  }
}

export function completeGuidedCheckpoint(
  vibe: ActiveGuidedVibeId,
  items: GuidedCheckpointReviewedItem[],
  completedAt: Date = new Date(),
): GuidedCheckpointRecord {
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

  if (!canUseLocalStorage()) return record

  try {
    window.localStorage.setItem(
      guidedCheckpointKey(vibe, getNextGuidedCheckpointIndex(vibe)),
      JSON.stringify(record),
    )
  } catch {
    return record
  }

  return record
}

export function guidedSegmentReviewKey(
  pathId: string,
  segment: GuidedSegmentReviewNumber,
  vibe: ActiveGuidedVibeId,
) {
  return `guided_segment_review_${pathId}_${vibe}_${segment}`
}

export function readGuidedSegmentReviewRecord(
  pathId: string,
  segment: GuidedSegmentReviewNumber,
  vibe: ActiveGuidedVibeId,
): GuidedCheckpointRecord | undefined {
  if (!canUseLocalStorage()) return undefined

  try {
    const raw = window.localStorage.getItem(guidedSegmentReviewKey(pathId, segment, vibe))
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as GuidedCheckpointRecord
    if (!isGuidedCheckpointRecord(parsed, vibe)) return undefined
    return parsed
  } catch {
    return undefined
  }
}

export function completeGuidedSegmentReview(
  pathId: string,
  segment: GuidedSegmentReviewNumber,
  vibe: ActiveGuidedVibeId,
  items: GuidedCheckpointReviewedItem[],
  completedAt: Date = new Date(),
): GuidedCheckpointRecord {
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

  if (!canUseLocalStorage()) return record

  try {
    window.localStorage.setItem(
      guidedSegmentReviewKey(pathId, segment, vibe),
      JSON.stringify(record),
    )
  } catch {
    return record
  }

  return record
}

function getGuidedSegmentReviewDefinition(segment: number): { segment: GuidedSegmentReviewNumber; startLesson: number; endLesson: number } | undefined {
  if (segment === 1) return { segment: 1, startLesson: 1, endLesson: 5 }
  if (segment === 2) return { segment: 2, startLesson: 6, endLesson: 10 }
  return undefined
}

function getCompletedGuidedCheckpointPathIds(
  progress: TodayProgressState,
  vibe: ActiveGuidedVibeId,
  pathOptions: GuidedPathMetadata[],
) {
  return pathOptions
    .map((path) => path.id)
    .filter((pathId) => {
      const lessons = getGuidedPathLessons(pathId)
      return lessons.length > 0
        && lessons.every((lesson) => isLessonCompletedInVibe(progress, pathId, lesson.id, vibe))
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

function getGuidedCheckpointIndexes(vibe: ActiveGuidedVibeId) {
  if (!canUseLocalStorage()) return []

  const prefix = `guided_checkpoint_${vibe}_`
  const indexes: number[] = []

  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index)
      if (!key?.startsWith(prefix)) continue
      const checkpointIndex = Number.parseInt(key.slice(prefix.length), 10)
      if (Number.isInteger(checkpointIndex) && checkpointIndex >= 0) {
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

function canUseLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}
