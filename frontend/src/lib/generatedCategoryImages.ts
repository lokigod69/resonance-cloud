import {
  GENERATED_CATEGORY_IMAGE_CATEGORIES,
  GENERATED_CATEGORY_IMAGE_HERO_TERMS,
  type GeneratedCategoryImageCategory,
} from '@/data/generatedCategoryImageAvailability'
import { normalizeCurriculumTerm } from './curriculumImagePath'

function normalizeCategoryId(categoryId: string): string {
  return categoryId.trim().toLowerCase()
}

export function hasGeneratedCategoryImages(categoryId: string | null | undefined): categoryId is GeneratedCategoryImageCategory {
  return typeof categoryId === 'string' && GENERATED_CATEGORY_IMAGE_CATEGORIES.has(normalizeCategoryId(categoryId))
}

export function generatedCategoryEntryImagePath(
  languageIso: string,
  categoryId: string,
  term: string,
): string | null {
  const normalizedCategoryId = normalizeCategoryId(categoryId)
  if (!hasGeneratedCategoryImages(normalizedCategoryId)) return null

  return `/curriculum/generated-categories/${languageIso}/${normalizedCategoryId}/entries/${normalizeCurriculumTerm(term)}.webp`
}

export function generatedCategoryHeroImagePath(
  languageIso: string,
  categoryId: string,
): string | null {
  const normalizedCategoryId = normalizeCategoryId(categoryId)
  if (!hasGeneratedCategoryImages(normalizedCategoryId)) return null

  const heroTerm = GENERATED_CATEGORY_IMAGE_HERO_TERMS[normalizedCategoryId]
  return generatedCategoryEntryImagePath(languageIso, normalizedCategoryId, heroTerm)
}
