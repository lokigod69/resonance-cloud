import type { GuidedPathMetadata } from '@/data/guidedLessons'
import { createT } from '@/lib/translations'

const LESSON_NUMBER_PATTERN = /-(\d+)$/
type TranslationFn = ReturnType<typeof createT>

export function formatGuidedPathLabel(path: GuidedPathMetadata | undefined, t: TranslationFn = createT('en')) {
  if (!path) return `${t('today.language.English')} A1`
  const numberMatch = path.id.match(LESSON_NUMBER_PATTERN)
  const language = t(`today.language.${path.targetLanguage}`)
  if (numberMatch?.[1]) {
    return `${language} A1 P${numberMatch[1]}`
  }
  return path.shortTitle.replace(path.targetLanguage, language)
}

export function formatGuidedPathFullTitle(path: GuidedPathMetadata | undefined, t: TranslationFn = createT('en')) {
  const language = t(`today.language.${path?.targetLanguage ?? 'English'}`)
  return `${language} A1 ${t('today.path.directoryGroupPractical')}`
}
