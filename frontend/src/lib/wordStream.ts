import type { SelectedCategoryVocabularyItem, StaticCategoryTargetLanguageCode } from '@/data/categories'

// wordStream — the pure model behind the Home Word Stream
// (docs/Product/FABLE_WORD_STREAM_PLAN.md).
//
// New words in the learner's target language drift in from the horizon; this
// module decides WHICH words, in WHAT order, and remembers what the learner
// has already let pass. Everything here is side-effect free and runs under
// plain tsx (no supabase, no import.meta.env) so the model is unit-testable
// in isolation — the hook and the renderer own the I/O and the clock.

export type StreamWord = {
  /** Stable thematic-library concept id, e.g. `animals.dog`. */
  conceptId: string
  categorySlug: string
  categoryLabelKey: string
  categoryEmoji: string
  level: number
  targetTerm: string
  helperTerm: string
  partOfSpeech: string
  englishTerm: string
  targetLanguageCode: StaticCategoryTargetLanguageCode
  targetLanguageName: string
  helperLanguageCode: StaticCategoryTargetLanguageCode
  helperLanguageName: string
  thumbnailUrl: string | null
  /** `lower(btrim(term))` — the SRS lemma key (`compute_word_states`). */
  lemmaKey: string
}

export type StreamCategorySource = {
  slug: string
  labelKey: string
  emoji: string
  items: SelectedCategoryVocabularyItem[]
}

/** The RPC's `lower(btrim(w.word))`, plus NFC so composed and decomposed
 * forms of the same accented word compare equal. */
export function normalizeStreamLemma(term: string): string {
  return term.trim().normalize('NFC').toLowerCase()
}

/** FNV-1a 32-bit — small, stable, dependency-free. */
export function hashSeed(input: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash >>> 0
}

/** Deterministic unit in [0, 1) for a (seed, key) pair. */
export function seededUnit(seed: number, key: string): number {
  return hashSeed(`${seed}:${key}`) / 0x100000000
}

/** One order per learner, language and UTC day: a fresh stream every day, a
 * stable one across reloads within it. */
export function streamSeed(userId: string, langCode: string, utcDay: string): number {
  return hashSeed(`${userId}|${langCode}|${utcDay}`)
}

const LEVEL_JITTER = 2.5
const SAME_AS_GLOSS_PENALTY = 1.5

export type BuildStreamPoolInput = {
  sources: StreamCategorySource[]
  /** Lemma keys the learner already holds in this language (any deck). */
  knownLemmaKeys: ReadonlySet<string>
  /** Concept ids the learner let pass within the TTL. */
  passedConceptIds: ReadonlySet<string>
  seed: number
  /** Thematic-library picture for a concept, when the manifest knows one. */
  resolveImage?: (word: { categorySlug: string; englishTerm: string }) => string | null
}

/** The ordered candidate pool: every translated concept the learner does not
 * have and did not pass, sorted so levels 1–3 mix at the front and harder
 * words surface later. Deduped by lemma (the same target term can live in
 * two categories — the first by order wins). */
export function buildStreamPool({ sources, knownLemmaKeys, passedConceptIds, seed, resolveImage }: BuildStreamPoolInput): StreamWord[] {
  const scored: Array<{ word: StreamWord; key: number }> = []
  for (const source of sources) {
    for (const item of source.items) {
      const targetTranslation = item.translations[item.targetLanguage]
      if (!targetTranslation || targetTranslation.isFallback) continue
      const targetTerm = item.targetTerm.trim()
      if (!targetTerm) continue
      const lemmaKey = normalizeStreamLemma(targetTerm)
      if (knownLemmaKeys.has(lemmaKey) || passedConceptIds.has(item.conceptId)) continue
      const helperTerm = item.helperTerm.trim()
      const englishTerm = item.translations.en.term.trim()
      const sameAsGloss = normalizeStreamLemma(helperTerm) === lemmaKey
      const key = item.level + seededUnit(seed, item.conceptId) * LEVEL_JITTER + (sameAsGloss ? SAME_AS_GLOSS_PENALTY : 0)
      scored.push({
        key,
        word: {
          conceptId: item.conceptId,
          categorySlug: source.slug,
          categoryLabelKey: source.labelKey,
          categoryEmoji: source.emoji,
          level: item.level,
          targetTerm,
          helperTerm,
          partOfSpeech: item.part_of_speech,
          englishTerm,
          targetLanguageCode: item.targetLanguage,
          targetLanguageName: item.targetLanguageName,
          helperLanguageCode: item.helperLanguage,
          helperLanguageName: item.helperLanguageName,
          thumbnailUrl: resolveImage?.({ categorySlug: source.slug, englishTerm }) ?? null,
          lemmaKey,
        },
      })
    }
  }
  scored.sort((a, b) => (a.key !== b.key ? a.key - b.key : a.word.conceptId < b.word.conceptId ? -1 : 1))
  const seen = new Set<string>()
  const pool: StreamWord[] = []
  for (const { word } of scored) {
    if (seen.has(word.lemmaKey)) continue
    seen.add(word.lemmaKey)
    pool.push(word)
  }
  return pool
}

/** Ring index: the stream is endless by construction. */
export function poolIndexAt(cursor: number, poolLength: number): number {
  if (poolLength <= 0) return 0
  const index = cursor % poolLength
  return index < 0 ? index + poolLength : index
}

// ── The per-learner store (localStorage, user + language scoped) ───────────

export const WORD_STREAM_STORE_VERSION = 1
export const WORD_STREAM_PASS_TTL_DAYS = 14

export type WordStreamStore = {
  schemaVersion: typeof WORD_STREAM_STORE_VERSION
  /** UTC day the cursor belongs to; a new day resets it. */
  day: string
  /** Words consumed from today's ordered pool (drifted past, passed, kept). */
  cursor: number
  /** conceptId → ISO timestamp of the pass. */
  passed: Record<string, string>
}

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export function wordStreamStoreKey(userId: string, langCode: string): string {
  return `lingwave_word_stream_v${WORD_STREAM_STORE_VERSION}_${userId}_${langCode}`
}

export function emptyWordStreamStore(day: string): WordStreamStore {
  return { schemaVersion: WORD_STREAM_STORE_VERSION, day, cursor: 0, passed: {} }
}

/** Read, and normalize against `day` / `nowMs`: a stale day resets the cursor
 * (the order changed with the seed), passes older than the TTL fall away.
 * Never throws — a corrupt or unavailable store is an empty one. */
export function readWordStreamStore(storage: StorageLike | null, key: string, day: string, nowMs: number): WordStreamStore {
  let parsed: unknown = null
  try {
    const raw = storage?.getItem(key)
    parsed = raw ? JSON.parse(raw) : null
  } catch {
    parsed = null
  }
  const store = emptyWordStreamStore(day)
  if (!parsed || typeof parsed !== 'object') return store
  const candidate = parsed as Partial<WordStreamStore>
  if (candidate.schemaVersion !== WORD_STREAM_STORE_VERSION) return store
  if (candidate.day === day && typeof candidate.cursor === 'number' && Number.isFinite(candidate.cursor) && candidate.cursor >= 0) {
    store.cursor = Math.trunc(candidate.cursor)
  }
  const ttlMs = WORD_STREAM_PASS_TTL_DAYS * 86_400_000
  if (candidate.passed && typeof candidate.passed === 'object') {
    for (const [conceptId, iso] of Object.entries(candidate.passed)) {
      if (typeof iso !== 'string') continue
      const at = Date.parse(iso)
      if (!Number.isFinite(at) || nowMs - at > ttlMs) continue
      store.passed[conceptId] = iso
    }
  }
  return store
}

export function writeWordStreamStore(storage: StorageLike | null, key: string, store: WordStreamStore): void {
  try {
    storage?.setItem(key, JSON.stringify(store))
  } catch {
    // Quota or private mode — the stream still runs, it just forgets.
  }
}

export function passedConceptIdsOf(store: WordStreamStore): Set<string> {
  return new Set(Object.keys(store.passed))
}

// ── Motion (pure helpers the renderer samples every frame) ─────────────────

/** Depth run: words are born near the horizon and slip past the near edge.
 * The exit depth sits beside the buoys' nearest slot (z ≈ 8) — deeper than
 * that the label's last seconds would play under the mobile bottom nav. */
export const STREAM_Z_SPAWN = 34
export const STREAM_Z_EXIT = 7.5

export type StreamLayout = {
  /** World-X lanes — screen x follows the projection, so words fan outward
   * as they approach. */
  lanes: readonly number[]
  maxAlive: number
  lifetimeMs: number
  /** Desktop spread from horizon to near edge, as fractions of the viewport
   * half-width. Mobile keeps the established world-lane projection. */
  viewportSpread?: readonly [number, number]
}

export const STREAM_MOBILE_LAYOUT: StreamLayout = { lanes: [-1.15, 0, 1.15], maxAlive: 4, lifetimeMs: 24_000 }
export const STREAM_DESKTOP_LAYOUT: StreamLayout = { lanes: [-4.4, -2.2, 0, 2.2, 4.4], maxAlive: 8, lifetimeMs: 30_000, viewportSpread: [0.58, 0.8] }

/** Horizontal placement has its own responsive envelope. Wider monitors
 * gain usable water at every depth, while words still fan out as they arrive. */
export function streamScreenXAt(layout: StreamLayout, lane: number, progress: number, width: number, focal: number): number {
  const laneX = layout.lanes[lane] ?? 0
  if (!layout.viewportSpread) return width / 2 + laneX * focal / streamDepthAt(progress)
  let extent = 1
  for (const value of layout.lanes) extent = Math.max(extent, Math.abs(value))
  const p = Math.max(0, Math.min(1, progress))
  const [far, near] = layout.viewportSpread
  return width / 2 + laneX / extent * width / 2 * (far + (near - far) * p)
}

/** Depth at progress p ∈ [0, 1], linear in 1/z so the SCREEN speed reads as
 * constant — linear z would park a word at the horizon for half its life. */
export function streamDepthAt(progress: number): number {
  const p = progress < 0 ? 0 : progress > 1 ? 1 : progress
  const inv = 1 / STREAM_Z_SPAWN + (1 / STREAM_Z_EXIT - 1 / STREAM_Z_SPAWN) * p
  return 1 / inv
}

/** Continuous label scale — nothing snaps between size bands. The floor keeps
 * a far word at the buoys' far-band size (13 px on a 15 px base); the ceiling
 * lands the near end beside the buoys' near band. */
export function streamScaleAt(progress: number): number {
  const p = progress < 0 ? 0 : progress > 1 ? 1 : progress
  return 0.87 + 0.36 * p
}

/** Fade in over the first 10 %, out over the last 8 %. */
export function streamOpacityAt(progress: number): number {
  if (progress <= 0) return 0
  if (progress >= 1) return 0
  if (progress < 0.1) return progress / 0.1
  if (progress > 0.92) return (1 - progress) / 0.08
  return 1
}

/** One spawn per `lifetime / maxAlive` keeps the water at its budget and
 * consecutive words at least 1/maxAlive of the depth run apart. */
export function streamSpawnIntervalMs(layout: StreamLayout): number {
  return layout.lifetimeMs / layout.maxAlive
}

/** Round-robin lanes with a seeded skip so the choreography never reads as a
 * conveyor: usually the next lane, sometimes the one after. */
export function nextStreamLane(previousLane: number, laneCount: number, unit: number): number {
  if (laneCount <= 1) return 0
  const step = unit < 0.7 ? 1 : 2
  return (previousLane + step) % laneCount
}

/** Fixed depths for the reduced-motion layout: `count` words spread evenly
 * across the run, nearest first. */
export function streamStillProgressSlots(count: number): number[] {
  if (count <= 0) return []
  const slots: number[] = []
  for (let i = 0; i < count; i++) slots.push(0.88 - (0.7 * i) / Math.max(1, count - 1 || 1))
  return count === 1 ? [0.6] : slots
}
