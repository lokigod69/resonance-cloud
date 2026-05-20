// Admin-controlled curriculum image set configuration loader and hook.
//
// Reads two Supabase tables:
//
//   curriculum_image_sets            - registry of available sets per language
//   curriculum_image_set_selections  - language default + per-category overrides
//
// Exposes:
//
//   loadCurriculumImageSetConfig(languageIso) → Promise<CurriculumImageSetConfig>
//   resolveActiveSetKey(config, languageIso, categorySlug?) → CurriculumImageSetKey
//   useActiveCurriculumImageSet(languageIso, categorySlug?) → { activeSetKey, isLoaded, refresh }
//
// The config is cached per languageIso to avoid a Supabase round-trip per card.
// Components on the same page share the same in-flight fetch via the cache.
//
// Image sets are a curriculum preview/rendering concern only. They are NOT
// a learner preference and they are NOT a deck identity dimension.

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { CurriculumImageSetKey } from '@/lib/curriculumImageSets'

export type ImageSetRecord = {
  language_iso: string
  set_key: CurriculumImageSetKey
  label: string
  description: string | null
  public_base_path: string
  manifest_path: string
  is_enabled: boolean
  sort_order: number
}

export type ImageSetSelection = {
  id: string
  language_iso: string
  category_slug: string | null
  active_set_key: CurriculumImageSetKey
  created_at?: string
  updated_at?: string
}

export type CurriculumImageSetConfig = {
  languageIso: string
  sets: ImageSetRecord[]
  selections: ImageSetSelection[]
  loadedAt: number
}

// Fallback used when no admin config has been seeded yet (clean install).
export const DEFAULT_ACTIVE_SET_KEY: CurriculumImageSetKey = 'A'

type CacheEntry = {
  promise: Promise<CurriculumImageSetConfig>
  bustToken: number
}

const configCache = new Map<string, CacheEntry>()
let globalBustToken = 0

function isCurriculumImageSetKey(value: unknown): value is CurriculumImageSetKey {
  return value === 'A' || value === 'C'
}

async function fetchConfig(languageIso: string): Promise<CurriculumImageSetConfig> {
  const [setsResult, selectionsResult] = await Promise.all([
    supabase
      .from('curriculum_image_sets')
      .select('language_iso, set_key, label, description, public_base_path, manifest_path, is_enabled, sort_order')
      .eq('language_iso', languageIso)
      .order('sort_order', { ascending: true }),
    supabase
      .from('curriculum_image_set_selections')
      .select('id, language_iso, category_slug, active_set_key, created_at, updated_at')
      .eq('language_iso', languageIso),
  ])

  const sets: ImageSetRecord[] = (setsResult.data ?? [])
    .filter((row) => isCurriculumImageSetKey(row.set_key))
    .map((row) => ({
      language_iso: row.language_iso,
      set_key: row.set_key as CurriculumImageSetKey,
      label: row.label,
      description: row.description,
      public_base_path: row.public_base_path,
      manifest_path: row.manifest_path,
      is_enabled: row.is_enabled,
      sort_order: row.sort_order ?? 0,
    }))

  const selections: ImageSetSelection[] = (selectionsResult.data ?? [])
    .filter((row) => isCurriculumImageSetKey(row.active_set_key))
    .map((row) => ({
      id: row.id,
      language_iso: row.language_iso,
      category_slug: row.category_slug,
      active_set_key: row.active_set_key as CurriculumImageSetKey,
      created_at: row.created_at ?? undefined,
      updated_at: row.updated_at ?? undefined,
    }))

  return {
    languageIso,
    sets,
    selections,
    loadedAt: Date.now(),
  }
}

export function loadCurriculumImageSetConfig(languageIso: string): Promise<CurriculumImageSetConfig> {
  const cached = configCache.get(languageIso)
  if (cached && cached.bustToken === globalBustToken) {
    return cached.promise
  }
  const promise = fetchConfig(languageIso).catch((err) => {
    configCache.delete(languageIso)
    throw err
  })
  configCache.set(languageIso, { promise, bustToken: globalBustToken })
  return promise
}

export function invalidateCurriculumImageSetConfigCache(): void {
  globalBustToken += 1
  configCache.clear()
}

export function resolveActiveSetKey(
  config: CurriculumImageSetConfig | null,
  languageIso: string,
  categorySlug?: string | null,
): CurriculumImageSetKey {
  if (!config) return DEFAULT_ACTIVE_SET_KEY

  const enabledSetKeys = new Set(
    config.sets.filter((s) => s.is_enabled && s.language_iso === languageIso).map((s) => s.set_key),
  )

  const isUsable = (key: CurriculumImageSetKey) => enabledSetKeys.has(key)

  if (categorySlug) {
    const override = config.selections.find(
      (s) => s.language_iso === languageIso && s.category_slug === categorySlug,
    )
    if (override && isUsable(override.active_set_key)) {
      return override.active_set_key
    }
  }

  const languageDefault = config.selections.find(
    (s) => s.language_iso === languageIso && s.category_slug === null,
  )
  if (languageDefault && isUsable(languageDefault.active_set_key)) {
    return languageDefault.active_set_key
  }

  if (isUsable('A')) return 'A'

  // Last-resort fallback when nothing has been seeded yet.
  return DEFAULT_ACTIVE_SET_KEY
}

export type UseActiveCurriculumImageSetResult = {
  activeSetKey: CurriculumImageSetKey
  isLoaded: boolean
  refresh: () => Promise<void>
  config: CurriculumImageSetConfig | null
}

export function useActiveCurriculumImageSet(
  languageIso: string,
  categorySlug?: string | null,
): UseActiveCurriculumImageSetResult {
  const [config, setConfig] = useState<CurriculumImageSetConfig | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  const refresh = useCallback(async () => {
    invalidateCurriculumImageSetConfigCache()
    const next = await loadCurriculumImageSetConfig(languageIso)
    setConfig(next)
    setIsLoaded(true)
  }, [languageIso])

  useEffect(() => {
    let cancelled = false
    loadCurriculumImageSetConfig(languageIso)
      .then((c) => {
        if (cancelled) return
        setConfig(c)
        setIsLoaded(true)
      })
      .catch((err) => {
        if (cancelled) return
        console.warn('[curriculumImageSetConfig] load failed; falling back to Set A.', err)
        setConfig(null)
        setIsLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [languageIso])

  const activeSetKey = resolveActiveSetKey(config, languageIso, categorySlug ?? null)

  return { activeSetKey, isLoaded, refresh, config }
}
