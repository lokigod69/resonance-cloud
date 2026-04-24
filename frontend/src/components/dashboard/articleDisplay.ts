const ARTICLE_LANGUAGE_CODES = new Set(['de', 'fr', 'it', 'es', 'pt'])
const ARTICLE_LANGUAGE_NAMES = new Set([
  'german',
  'deutsch',
  'french',
  'francais',
  'italian',
  'italiano',
  'spanish',
  'espanol',
  'portuguese',
  'portugues',
])

export function usesArticles(language?: string | null): boolean {
  if (!language) return false
  const normalized = language.trim().toLowerCase()
  if (!normalized) return false
  return ARTICLE_LANGUAGE_CODES.has(normalized.slice(0, 2)) || ARTICLE_LANGUAGE_NAMES.has(normalized)
}

export function getDisplayArticle(word: { article?: string | null; target_language?: string | null }): string | null {
  if (!usesArticles(word.target_language)) return null
  const article = word.article?.trim()
  if (!article || article.toLowerCase() === 'null') return null
  return article
}
