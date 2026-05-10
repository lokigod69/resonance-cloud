export type TutorialId = 'generate'
export type TutorialKey = `${TutorialId}.v${number}`
export type TFunction = (key: string, vars?: Record<string, string | number>) => string

export interface TutorialDefinition {
  id: TutorialId
  versionedKey: TutorialKey
  steps: import('driver.js').DriveStep[]
  completionTitleKey: string
  completionBodyKey: string
  completionDismissKey: string
}
