import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { isStaticCategoryLanguage, resolveStaticCategoryTargetLanguageCode } from '@/data/staticCategoryLanguages'
import { trackLearningAction } from '@/lib/analytics'
import { utcDayKey } from '@/lib/dailyHabits'
import { curriculumEntryImagePath } from '@/lib/curriculumImagePath'
import { getPublicWebOrigin } from '@/lib/publicOrigins'
import { generatedCategoryEntryImagePath } from '@/lib/generatedCategoryImages'
import {
  buildStaticThematicPlaybackQuery,
  fetchStaticThematicPlayback,
  getStaticThematicAudio,
  getStaticThematicVoiceProfileKeys,
} from '@/lib/staticThematicAudio'
import {
  buildStreamPool,
  passedConceptIdsOf,
  readWordStreamStore,
  streamSeed,
  wordStreamStoreKey,
  writeWordStreamStore,
  type StreamCategorySource,
  type StreamWord,
  type WordStreamStore,
} from '@/lib/wordStream'

// useWordStream — the Home Word Stream's data side
// (docs/Product/FABLE_WORD_STREAM_PLAN.md §1).
//
// Loads the thematic library lazily (the translation table is ~2 MB and must
// never sit on the home's critical path), builds today's ordered pool of
// words the learner does not have yet, remembers what they let pass, counts
// what they kept today against their daily goal, and keeps a tapped word via
// `submit_word_stream_save`. The renderer owns the clock; this hook owns the
// truth.
//
// The pool is built ONCE per (sources, seed, first-ready known lemmas) so the
// renderer's ring index stays meaningful across refetches; words the learner
// keeps or passes mid-session are excluded live through `isAvailable`.

export type WordStreamStatus = 'loading' | 'ready' | 'unsupported'

export type StreamKeepResult = {
  deckId: string
  wordId: string | null
  /** False when the deck already held the word (skipped by word_slug). */
  inserted: boolean
}

export type StreamConsumeReason = 'passed' | 'kept'

export type UseWordStreamArgs = {
  userId: string
  /** Canonical target language value ('German'). */
  language: string
  /** Profile base language ('English' | 'German' | …) — the gloss language. */
  baseLanguage: string | null | undefined
  /** Lemma keys the learner holds in this language (useWordStates.data). */
  knownLemmaKeys: ReadonlySet<string>
  /** True once useWordStates has fetched for the current language. */
  knownReady: boolean
  dailyGoal: number
  enabled: boolean
}

export type UseWordStreamResult = {
  status: WordStreamStatus
  pool: StreamWord[]
  /** Today's persisted cursor at load — where the renderer resumes. */
  startCursor: number
  /** Today's order seed — changes with the UTC day; key the renderer on it. */
  seed: number
  langCode: string
  streamDeckId: string | null
  /** Words kept today in this language; null until the count has landed. */
  keptToday: number | null
  goal: number
  isAvailable: (word: StreamWord) => boolean
  /** Pool words that could still spawn (not kept, passed, or held). */
  availableCount: number
  /** The renderer reports its ring index as it walks; persisted for resume. */
  advanceCursor: (index: number) => void
  consume: (word: StreamWord, reason: StreamConsumeReason) => void
  keep: (word: StreamWord, input: { deckName: string; ttsAudioUrl: string | null }) => Promise<StreamKeepResult>
  /** The static recording for a word, when the language has one — cached. */
  resolveAudio: (word: StreamWord) => Promise<string | null>
}

type CategoriesModule = typeof import('@/data/categories')

let categoriesModulePromise: Promise<CategoriesModule> | null = null
function loadCategories(): Promise<CategoriesModule> {
  categoriesModulePromise ??= import('@/data/categories')
  return categoriesModulePromise
}

/** Thrown by `keep` when the RPC is not deployed yet (pre-migration). */
export class WordStreamUnavailableError extends Error {
  constructor() {
    super('submit_word_stream_save is not available')
    this.name = 'WordStreamUnavailableError'
  }
}

function isMissingFunctionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const code = (error as { code?: unknown }).code
  const message = String((error as { message?: unknown }).message ?? '')
  return code === 'PGRST202' || code === '42883' || /could not find the function/i.test(message)
}

function storageOrNull(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
}

// Sheet-visible pictures come from the generated manifest only (never a URL
// that may 404); the STORED thumbnail mirrors the Library importer so a stream
// deck behaves exactly like an imported level deck.
function displayImageFor(word: { categorySlug: string; englishTerm: string }): string | null {
  return generatedCategoryEntryImagePath('en', word.categorySlug, word.englishTerm)
}

export function useWordStream({
  userId,
  language,
  baseLanguage,
  knownLemmaKeys,
  knownReady,
  dailyGoal,
  enabled,
}: UseWordStreamArgs): UseWordStreamResult {
  const [sources, setSources] = useState<{ key: string; langCode: string; sources: StreamCategorySource[] | null } | null>(null)

  // ── Library load: once per (language, base) ──────────────────────────────
  const sourcesKey = `${language}|${baseLanguage ?? ''}`
  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    const targetCode = resolveStaticCategoryTargetLanguageCode(language)
    const helperCode = resolveStaticCategoryTargetLanguageCode(baseLanguage ?? 'English')
    // The resolver falls back to 'en' for unknown languages; a language the
    // library does not carry, or a gloss in the same language, has no stream —
    // decided BEFORE the ~2 MB library is fetched, so those learners never
    // download it.
    if (!isStaticCategoryLanguage(language) || targetCode === helperCode) {
      const timer = window.setTimeout(() => setSources({ key: sourcesKey, langCode: targetCode, sources: null }), 0)
      return () => window.clearTimeout(timer)
    }
    void loadCategories().then((mod) => {
      if (cancelled) return
      const built: StreamCategorySource[] = []
      for (const group of mod.getPublicCategoryGroups()) {
        for (const category of group.categories) {
          if (!category.staticWordLevels?.length) continue
          const slug = category.id ?? category.name
          built.push({
            slug,
            labelKey: category.labelKey,
            emoji: category.emoji,
            items: mod.getStaticCategorySelectedItems(category, Number.MAX_SAFE_INTEGER, undefined, language, baseLanguage ?? 'English', {
              dedupeTargetTerms: false,
            }),
          })
        }
      }
      setSources({ key: sourcesKey, langCode: targetCode, sources: built })
    })
    return () => {
      cancelled = true
    }
  }, [baseLanguage, enabled, language, sourcesKey])

  const sourcesReady = sources?.key === sourcesKey ? sources : null
  const langCode = sourcesReady?.langCode ?? ''

  // ── UTC day: state, refreshed on wake-ups (never a midnight timer) ───────
  const [utcDay, setUtcDay] = useState(() => utcDayKey(new Date()))
  useEffect(() => {
    const onWake = () => {
      if (document.hidden) return
      const today = utcDayKey(new Date())
      setUtcDay((prev) => (prev === today ? prev : today))
    }
    window.addEventListener('focus', onWake)
    document.addEventListener('visibilitychange', onWake)
    return () => {
      window.removeEventListener('focus', onWake)
      document.removeEventListener('visibilitychange', onWake)
    }
  }, [])

  // ── Store ────────────────────────────────────────────────────────────────
  const storeKey = langCode ? wordStreamStoreKey(userId, langCode) : null
  const storeRef = useRef<{ key: string; store: WordStreamStore } | null>(null)
  const [storeLoaded, setStoreLoaded] = useState<{ key: string; day: string; cursor: number; passed: Set<string> } | null>(null)
  useEffect(() => {
    if (!storeKey) return
    const store = readWordStreamStore(storageOrNull(), storeKey, utcDay, Date.now())
    storeRef.current = { key: storeKey, store }
    setStoreLoaded({ key: storeKey, day: utcDay, cursor: store.cursor, passed: passedConceptIdsOf(store) })
  }, [storeKey, utcDay])
  const storeCurrent = storeLoaded && storeLoaded.key === storeKey && storeLoaded.day === utcDay ? storeLoaded : null

  const persist = useCallback(() => {
    const entry = storeRef.current
    if (!entry) return
    writeWordStreamStore(storageOrNull(), entry.key, entry.store)
  }, [])

  // ── Pool: once per (sources, seed, passed-at-load, first-ready known) ────
  const seed = langCode ? streamSeed(userId, langCode, utcDay) : 0
  const poolKey = `${sourcesKey}|${utcDay}|${storeCurrent ? 'store' : ''}`
  // The pool is built from the held lemmas as they stood when the SRS FIRST
  // reported for this key. `knownReady` flips false for the duration of every
  // refetch (tab focus, sheet close) — that transient must never unbuild the
  // stream, so readiness is latched per key (derived-state-from-props pattern)
  // and the snapshot memo deliberately omits `knownLemmaKeys`. Later changes
  // flow through `isAvailable`, so the renderer's ring index keeps meaning.
  const [readyKey, setReadyKey] = useState<string | null>(null)
  if (knownReady && readyKey !== poolKey) setReadyKey(poolKey)
  const knownAtBuild = useMemo(
    () => (readyKey === poolKey ? (new Set(knownLemmaKeys) as ReadonlySet<string>) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [readyKey, poolKey],
  )

  // Passed words are NOT removed from the pool: they are skipped live through
  // `isAvailable`, so today's order — and the persisted cursor into it — stays
  // stable across reloads within the day.
  const storeReady = storeCurrent !== null
  const pool = useMemo(() => {
    if (!sourcesReady?.sources || !storeReady || !knownAtBuild) return []
    return buildStreamPool({
      sources: sourcesReady.sources,
      knownLemmaKeys: knownAtBuild,
      passedConceptIds: new Set(),
      seed,
      resolveImage: displayImageFor,
    })
  }, [knownAtBuild, seed, sourcesReady, storeReady])

  // Live exclusions: passed (persisted, 14-day TTL) and kept this session,
  // plus whatever the SRS now reports as held (a keep in another tab, a
  // Library import).
  const [sessionExcluded, setSessionExcluded] = useState<Set<string>>(() => new Set())
  useEffect(() => {
    setSessionExcluded(new Set())
  }, [poolKey])
  const passedIds = storeCurrent?.passed
  const isAvailable = useCallback(
    (word: StreamWord) =>
      !sessionExcluded.has(word.lemmaKey)
      && !knownLemmaKeys.has(word.lemmaKey)
      && !(passedIds?.has(word.conceptId) ?? false),
    [knownLemmaKeys, passedIds, sessionExcluded],
  )
  // How many pool words could still spawn — when this reaches zero and the
  // last word has drifted, the sea hands back to the buoys.
  const availableCount = useMemo(() => pool.reduce((n, word) => (isAvailable(word) ? n + 1 : n), 0), [isAvailable, pool])

  // ── Kept today + stream deck (server truth) ──────────────────────────────
  const [kept, setKept] = useState<{ key: string; count: number | null; deckId: string | null }>({ key: '', count: null, deckId: null })
  const keptKey = `${userId}|${language}|${utcDay}`
  // A keep that resolves while the count is still in flight would be
  // overwritten by the pre-insert number: each keep bumps the epoch, a
  // fetch started under an older epoch is dropped, and a keep that finds no
  // settled count asks for a fresh one.
  const countEpochRef = useRef(0)
  const [countReload, setCountReload] = useState(0)
  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    const epoch = countEpochRef.current
    const dayStart = `${utcDay}T00:00:00.000Z`
    void Promise.all([
      supabase
        .from('words')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('metadata->>origin', 'word_stream')
        .eq('metadata->>target_language', language)
        .gte('created_at', dayStart),
      supabase
        .from('decks')
        .select('id')
        .eq('user_id', userId)
        .eq('source_kind', 'stream')
        .eq('target_language', language)
        .order('created_at', { ascending: true })
        .limit(1),
    ]).then(([countResult, deckResult]) => {
      if (cancelled || epoch !== countEpochRef.current) return
      setKept({
        key: keptKey,
        count: countResult.error ? null : countResult.count ?? 0,
        deckId: deckResult.data?.[0]?.id ?? null,
      })
    })
    return () => {
      cancelled = true
    }
  }, [countReload, enabled, keptKey, language, userId, utcDay])
  const keptCurrent = kept.key === keptKey ? kept : { key: keptKey, count: null, deckId: null }
  // Read by `keep` after its await — state as of the latest render, not the
  // closure the keep started in.
  const keptRef = useRef(keptCurrent)
  keptRef.current = keptCurrent

  // ── Audio: one static_tts_playback lookup per concept, cached ────────────
  const audioCacheRef = useRef<Map<string, Promise<string | null>>>(new Map())
  const resolveAudio = useCallback((word: StreamWord): Promise<string | null> => {
    const cacheKey = `${word.targetLanguageCode}:${word.conceptId}`
    const cached = audioCacheRef.current.get(cacheKey)
    if (cached) return cached
    const voiceProfileKeys = getStaticThematicVoiceProfileKeys({
      targetLanguageCode: word.targetLanguageCode,
      categorySlug: word.categorySlug,
    })
    const promise: Promise<string | null> = !voiceProfileKeys?.length
      ? Promise.resolve(null)
      : fetchStaticThematicPlayback(supabase, buildStaticThematicPlaybackQuery({
          targetLanguageCode: word.targetLanguageCode,
          categorySlug: word.categorySlug,
          levelNumber: word.level,
          conceptIds: [word.conceptId],
          voiceProfileKeys,
        }))
          .then((lookup) => {
            for (const voiceProfileKey of voiceProfileKeys) {
              const row = getStaticThematicAudio(lookup, word.conceptId, voiceProfileKey)
              if (row?.public_url) return row.public_url
            }
            return null
          })
          .catch(() => null)
    audioCacheRef.current.set(cacheKey, promise)
    return promise
  }, [])

  // ── Consume / keep ───────────────────────────────────────────────────────
  // The cursor is the renderer's ring index into today's ordered pool — the
  // renderer reports it as it walks; a reload resumes from there.
  const advanceCursor = useCallback((index: number) => {
    const entry = storeRef.current
    if (!entry || !Number.isFinite(index) || index < 0) return
    if (entry.store.cursor === index) return
    entry.store.cursor = index
    persist()
    setStoreLoaded((prev) => (prev && prev.key === entry.key && prev.cursor !== index ? { ...prev, cursor: index } : prev))
  }, [persist])

  const consume = useCallback((word: StreamWord, reason: StreamConsumeReason) => {
    const entry = storeRef.current
    if (entry && reason === 'passed') {
      entry.store.passed[word.conceptId] = new Date().toISOString()
      persist()
      // The reactive copy too — a base-language change rebuilds the pool and
      // clears the session set, and the pass must survive that.
      setStoreLoaded((prev) => {
        if (!prev || prev.key !== entry.key || prev.passed.has(word.conceptId)) return prev
        const passed = new Set(prev.passed)
        passed.add(word.conceptId)
        return { ...prev, passed }
      })
    }
    setSessionExcluded((prev) => {
      if (prev.has(word.lemmaKey)) return prev
      const next = new Set(prev)
      next.add(word.lemmaKey)
      return next
    })
  }, [persist])

  const keep = useCallback(async (word: StreamWord, input: { deckName: string; ttsAudioUrl: string | null }): Promise<StreamKeepResult> => {
    const metadata: Record<string, unknown> = {
      source: 'static_thematic_library',
      category_slug: word.categorySlug,
      level: word.level,
      entry_id: word.conceptId,
      concept_id: word.conceptId,
      source_category_slug: word.categorySlug,
      source_level_number: word.level,
      source_concept_id: word.conceptId,
      source_target_language_code: word.targetLanguageCode,
      english_term: word.englishTerm,
      target_language: word.targetLanguageName,
      target_language_code: word.targetLanguageCode,
      helper_language: word.helperLanguageName,
      helper_language_code: word.helperLanguageCode,
    }
    if (input.ttsAudioUrl) metadata.static_tts_public_url = input.ttsAudioUrl
    // Stored absolute: the iOS bundle strips /curriculum, and a bare path
    // written from the web would 404 on device wherever a surface renders
    // the row's url without re-wrapping it.
    const thumbnailPath = word.thumbnailUrl ?? curriculumEntryImagePath('en', word.categorySlug, word.englishTerm)
    const thumbnailUrl = /^https?:\/\//i.test(thumbnailPath)
      ? thumbnailPath
      : `${getPublicWebOrigin()}${thumbnailPath.startsWith('/') ? '' : '/'}${thumbnailPath}`

    const { data, error } = await supabase.rpc('submit_word_stream_save', {
      p_target_language: language,
      p_base_language: baseLanguage ?? 'English',
      p_deck_name: input.deckName,
      p_items: [{
        word: word.targetTerm,
        translation: word.helperTerm,
        pos: word.partOfSpeech,
        tts_audio_url: input.ttsAudioUrl,
        thumbnail_url: thumbnailUrl,
        metadata,
      }],
    })
    if (error) {
      if (isMissingFunctionError(error)) throw new WordStreamUnavailableError()
      throw new Error(error.message)
    }
    const result = (data ?? {}) as { deck_id?: string; inserted?: number; skipped?: number; word_ids?: string[] }
    if (!result.deck_id) throw new Error('Word Stream save returned no deck')
    const inserted = Number(result.inserted ?? 0) > 0
    const wordId = Array.isArray(result.word_ids) && typeof result.word_ids[0] === 'string' ? result.word_ids[0] : null

    // A keep that resolves across the UTC boundary must not republish the old
    // day's count under the new key — null until the day's count is fetched.
    countEpochRef.current += 1
    const settled = keptRef.current.key === keptKey && keptRef.current.count !== null
    setKept((prev) => ({
      key: keptKey,
      count: prev.key === keptKey && prev.count !== null ? prev.count + (inserted ? 1 : 0) : null,
      deckId: result.deck_id ?? prev.deckId,
    }))
    if (!settled) setCountReload((n) => n + 1)
    if (inserted) {
      trackLearningAction('stream_keep', {
        level: word.level,
        category_slug: word.categorySlug,
        language_code: word.targetLanguageCode,
      })
    }
    return { deckId: result.deck_id, wordId, inserted }
  }, [baseLanguage, keptKey, language])

  const status: WordStreamStatus = !enabled || !sourcesReady
    ? 'loading'
    : sourcesReady.sources === null
      ? 'unsupported'
      : storeCurrent && knownAtBuild
        ? 'ready'
        : 'loading'

  return {
    status,
    pool,
    startCursor: storeCurrent?.cursor ?? 0,
    seed,
    langCode,
    streamDeckId: keptCurrent.deckId,
    keptToday: keptCurrent.count,
    goal: dailyGoal,
    isAvailable,
    availableCount,
    advanceCursor,
    consume,
    keep,
    resolveAudio,
  }
}
