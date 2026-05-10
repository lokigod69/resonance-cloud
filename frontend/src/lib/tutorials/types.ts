export type TutorialId = 'generate' | 'dashboard-pointer'
export type TutorialKey = `${string}.v${number}`
export type TFunction = (key: string, vars?: Record<string, string | number>) => string
export type GenerateTutorialStepId =
  | 'language'
  | 'product'
  | 'category'
  | 'manual'
  | 'action-choice'
  | 'complete'
export type TutorialStepId = GenerateTutorialStepId | 'dashboard-welcome' | 'dashboard-generate'

export type TutorialDriveStep = import('driver.js').DriveStep & {
  tutorialStepId?: TutorialStepId
}

export interface GenerateTutorialSnapshot {
  skin: 'classic' | 'glassy'
  hasExistingDeck: boolean
  existingDeckType: 'video' | 'card' | null
  step: number
  language: string | null
  productLane: string | null
  wordCount: number
}

export interface GenerateTutorialController {
  resetForTutorial: () => Promise<void> | void
  prepareTutorialStep: (stepId: GenerateTutorialStepId) => Promise<boolean> | boolean
  getTutorialStateSnapshot: () => GenerateTutorialSnapshot
}

export interface TutorialDefinition {
  id: TutorialId
  versionedKey: TutorialKey
  steps: TutorialDriveStep[]
  completionTitleKey: string
  completionBodyKey: string
  completionDismissKey: string
}
