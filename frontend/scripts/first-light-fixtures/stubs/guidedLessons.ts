/* eslint-disable */
// Stand-in for the ~2.8MB guided data module. Exposes exactly the surface the
// REAL useTodayMission consumes, driven from window.__scenario.guidedPaths.
//
// The optional top-level await reproduces a slow cold-cache chunk fetch, which
// is what the 800ms recall-first hero timeout (§5) is defined against.

import { scenario, type GuidedLessonStub } from './scenario'

const delayMs = scenario().guidedDelayMs ?? 0
if (delayMs > 0) {
  await new Promise((resolve) => setTimeout(resolve, delayMs))
}

function paths() {
  return scenario().guidedPaths ?? []
}

function pathById(pathId: string) {
  return paths().find((path) => path.id === pathId) ?? null
}

export function getGuidedTodayPathOptions(): any[] {
  return paths().map((path) => ({
    id: path.id,
    shortTitle: path.shortTitle,
    title: path.shortTitle,
    targetLanguage: path.targetLanguage,
  }))
}

export function getGuidedPathLessons(pathId: string): GuidedLessonStub[] {
  return pathById(pathId)?.lessons ?? []
}

export function getGuidedPathOverview(pathId: string, progress: any, _vibeId: string): any {
  const lessons = getGuidedPathLessons(pathId)
  const course = progress?.courses?.[pathId]
  const completedIds = new Set<string>(course?.completedLessonIds ?? [])
  const pinned = scenario().recommendedLessonId
  const recommended = (pinned ? lessons.find((lesson) => lesson.id === pinned) : undefined)
    ?? lessons.find((lesson) => !completedIds.has(lesson.id))
    ?? null
  return {
    pathId,
    lessons: lessons.map((lesson) => ({
      lesson,
      status: completedIds.has(lesson.id) ? 'completed' : 'new',
    })),
    recommendedLesson: recommended,
    selectedLesson: recommended ?? lessons[0] ?? null,
    totalLessons: lessons.length,
    completedCount: completedIds.size,
    isComplete: lessons.length > 0 && completedIds.size >= lessons.length,
  }
}

export function resolveGuidedBaseContent(value: any, _opts?: any): { text: string } {
  if (typeof value === 'string') return { text: value }
  return { text: value?.text ?? String(value ?? '') }
}

export const GUIDED_TARGET_LANGUAGE_SPEAK_LOCALES: Record<string, string[]> = {
  English: ['en-US'],
  German: ['de-DE'],
  French: ['fr-FR'],
  Spanish: ['es-ES'],
  Italian: ['it-IT'],
  Portuguese: ['pt-PT'],
  Polish: ['pl-PL'],
  Korean: ['ko-KR'],
  Cebuano: ['fil-PH'],
  Indonesian: ['id-ID'],
  Russian: ['ru-RU'],
  Japanese: ['ja-JP'],
}
