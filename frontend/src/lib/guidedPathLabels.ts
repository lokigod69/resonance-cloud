import type { GuidedPathMetadata } from '@/data/guidedLessons'
import { createT } from '@/lib/translations'

const LESSON_NUMBER_PATTERN = /-(\d+)$/
type TranslationFn = ReturnType<typeof createT>
type FormatGuidedPathLabelOptions = {
  includeLanguage?: boolean
}

export function formatGuidedPathLabel(
  path: GuidedPathMetadata | undefined,
  t: TranslationFn = createT('en'),
  options: FormatGuidedPathLabelOptions = {},
) {
  const includeLanguage = options.includeLanguage ?? true

  if (!path) return includeLanguage ? `${t('today.language.English')} A1` : 'A1'

  const numberMatch = path.id.match(LESSON_NUMBER_PATTERN)
  const language = t(`today.language.${path.targetLanguage}`)
  const prefix = includeLanguage ? `${language} ` : ''

  if (numberMatch?.[1]) {
    return `${prefix}A1 P${numberMatch[1]}`
  }

  return includeLanguage
    ? path.shortTitle.replace(path.targetLanguage, language)
    : path.shortTitle.replace(new RegExp(`^${path.targetLanguage}\\s*`, 'i'), '')
}

export function formatGuidedPathFullTitle(path: GuidedPathMetadata | undefined, t: TranslationFn = createT('en')) {
  const language = t(`today.language.${path?.targetLanguage ?? 'English'}`)
  return `${language} A1 ${t('today.path.directoryGroupPractical')}`
}
