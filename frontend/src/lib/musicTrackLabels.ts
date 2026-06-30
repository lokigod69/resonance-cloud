import { getDeckLanguageLabel } from './i18nDisplay'

export type MusicLabelTranslateFn = (key: string, vars?: Record<string, string | number>) => string

const LABEL_SEPARATOR = ' \u00b7 '

export function formatMusicDeckLabel(
  deckName: string,
  targetLanguage: string | null | undefined,
  t: MusicLabelTranslateFn,
): string {
  const baseName = deckName.trim()
  const languageLabel = getDeckLanguageLabel(targetLanguage, t)
  if (!languageLabel) return baseName
  return `${baseName}${LABEL_SEPARATOR}${languageLabel}`
}
