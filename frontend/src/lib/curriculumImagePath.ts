export function normalizeCurriculumTerm(term: string): string {
  return term
    .toLowerCase()
    .normalize('NFKD')
    .replace(/ß/g, 'ss')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function curriculumEntryImagePath(
  languageIso: string,
  categorySlug: string,
  term: string,
): string {
  return `/curriculum/categories/${languageIso}/${categorySlug}/entries/${normalizeCurriculumTerm(term)}.webp`
}

export function curriculumCategoryHeroPath(
  languageIso: string,
  categorySlug: string,
): string {
  return `/curriculum/categories/${languageIso}/${categorySlug}/hero.webp`
}
