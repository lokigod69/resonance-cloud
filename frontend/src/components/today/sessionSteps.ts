import type { GuidedLessonLevel } from '@/data/guidedLessons'

export type TodaySessionStep =
  | 'scene'
  | 'matchPairs'
  | 'pattern'
  | 'build'
  | 'type'
  | 'complication'
  | 'rolePlay'
  | 'speak'
  | 'complete'

export const TODAY_SESSION_STEPS: TodaySessionStep[] = [
  'scene',
  'matchPairs',
  'build',
  'type',
  'speak',
  'complete',
]

/** B1's fixed 7-step episode session (design doc §3.2). */
export const TODAY_SESSION_STEPS_B1: TodaySessionStep[] = [
  'scene',
  'matchPairs',
  'pattern',
  'build',
  'complication',
  'rolePlay',
  'complete',
]

/**
 * Keyed on lesson.level, NOT the authored `steps` array — authored steps have
 * never been read and activating them would put ~2,400 frozen lessons in the
 * behavior path (design doc §4.2).
 */
export function getSessionSteps(lesson: { level: GuidedLessonLevel }, pairCount: number): TodaySessionStep[] {
  const steps = lesson.level === 'B1' ? TODAY_SESSION_STEPS_B1 : TODAY_SESSION_STEPS
  return pairCount >= 2 ? steps : steps.filter((step) => step !== 'matchPairs')
}

export function getResumeStepIndex(steps: TodaySessionStep[], saved?: TodaySessionStep): number {
  if (!saved) return 0
  const index = steps.indexOf(saved)
  // A draft from before single-pair matching was removed resumes after the scene.
  if (index < 0 && saved === 'matchPairs') return steps.indexOf('scene') + 1
  return Math.max(0, index)
}
