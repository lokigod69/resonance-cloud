export type TutorialId = 'generate' | 'dashboard-pointer'
export type TutorialKey = `${string}.v${number}`
export type TFunction = (key: string, vars?: Record<string, string | number>) => string

export interface TutorialDefinition {
  id: TutorialId
  versionedKey: TutorialKey
  steps: import('driver.js').DriveStep[]
  completionTitleKey: string
  completionBodyKey: string
  completionDismissKey: string
}
