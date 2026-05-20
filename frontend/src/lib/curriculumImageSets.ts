// Pure utilities for resolving a curriculum term to a static image-set asset.
//
// This module is intentionally free of React, localStorage, browser events,
// and Supabase. The "which set is active?" question is answered by
// curriculumImageSetConfig.ts (admin-controlled). This module only knows:
//
//   given a normalized term and a desired set key + per-set word availability,
//   what public asset path should we render, with fallback to Set A?
//
// Image sets are a curriculum preview/rendering concern only. They are NOT
// a learner preference and they are NOT a deck identity dimension.

import {
  CURRICULUM_IMAGE_SET_A_WORD_SET,
  CURRICULUM_IMAGE_SET_C_WORD_SET,
} from '@/data/curriculumImageSetAvailability'

export type CurriculumImageSetKey = 'A' | 'C'

export type CurriculumImageSetResolution = {
  requestedSet: CurriculumImageSetKey
  resolvedSet: CurriculumImageSetKey | null
  normalizedWord: string
  publicPath: string | null
  fallbackUsed: boolean
}

export type CurriculumImageSetAssetIndex = {
  has: (normalizedWord: string) => boolean
  publicBasePath: string
}

export function normalizeCurriculumImageSetWord(wordOrSlug: string): string {
  return wordOrSlug
    .toLowerCase()
    .normalize('NFKD')
    .replace(/ß/g, 'ss')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function defaultBasePath(set: CurriculumImageSetKey, languageIso: string): string {
  const folder = set === 'A' ? 'set-a' : 'set-c'
  return `/curriculum/${languageIso}/${folder}`
}

function defaultIndex(set: CurriculumImageSetKey, languageIso: string): CurriculumImageSetAssetIndex {
  const words = set === 'A' ? CURRICULUM_IMAGE_SET_A_WORD_SET : CURRICULUM_IMAGE_SET_C_WORD_SET
  return {
    has: (normalized) => words.has(normalized),
    publicBasePath: defaultBasePath(set, languageIso),
  }
}

export type ResolveCurriculumImageSetAssetOptions = {
  // The set the admin currently has active for this (language, category?).
  activeSetKey: CurriculumImageSetKey
  // Language ISO (currently 'en'; future-proofed for it/fr/...).
  languageIso?: string
  // Optional per-set asset indexes. When omitted, falls back to the static
  // word lists in curriculumImageSetAvailability.ts.
  indexBySet?: Partial<Record<CurriculumImageSetKey, CurriculumImageSetAssetIndex>>
}

export function resolveCurriculumImageSetAsset(
  wordOrSlug: string,
  options: ResolveCurriculumImageSetAssetOptions,
): CurriculumImageSetResolution {
  const languageIso = options.languageIso ?? 'en'
  const requestedSet = options.activeSetKey
  const normalizedWord = normalizeCurriculumImageSetWord(wordOrSlug)

  const indexA = options.indexBySet?.A ?? defaultIndex('A', languageIso)
  const indexC = options.indexBySet?.C ?? defaultIndex('C', languageIso)

  const tryResolve = (set: CurriculumImageSetKey): string | null => {
    const idx = set === 'A' ? indexA : indexC
    if (!idx.has(normalizedWord)) return null
    return `${idx.publicBasePath}/${normalizedWord}.webp`
  }

  if (requestedSet === 'C') {
    const cPath = tryResolve('C')
    if (cPath) {
      return {
        requestedSet,
        resolvedSet: 'C',
        normalizedWord,
        publicPath: cPath,
        fallbackUsed: false,
      }
    }
    const aPath = tryResolve('A')
    if (aPath) {
      return {
        requestedSet,
        resolvedSet: 'A',
        normalizedWord,
        publicPath: aPath,
        fallbackUsed: true,
      }
    }
  } else {
    const aPath = tryResolve('A')
    if (aPath) {
      return {
        requestedSet,
        resolvedSet: 'A',
        normalizedWord,
        publicPath: aPath,
        fallbackUsed: false,
      }
    }
  }

  return {
    requestedSet,
    resolvedSet: null,
    normalizedWord,
    publicPath: null,
    fallbackUsed: false,
  }
}
