// Script Lab progress — per-script localStorage, guarded like lib/todayLanguage.ts.
//
// Key `scriptlab:v1:<scriptId>` holds { seenSymbolIds, quizBest }. Every read is
// resilient to a missing/blocked storage and to corrupt JSON: a bad value simply
// resolves to empty progress rather than throwing.

export type ScriptProgress = {
  seenSymbolIds: string[]
  quizBest: number | null
}

const STORAGE_PREFIX = 'scriptlab:v1:'

function storageKey(scriptId: string): string {
  return `${STORAGE_PREFIX}${scriptId}`
}

function canUseLocalStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function emptyProgress(): ScriptProgress {
  return { seenSymbolIds: [], quizBest: null }
}

function normalizeProgress(value: unknown): ScriptProgress {
  if (!value || typeof value !== 'object') return emptyProgress()
  const record = value as Record<string, unknown>
  const seenSymbolIds = Array.isArray(record.seenSymbolIds)
    ? record.seenSymbolIds.filter((id): id is string => typeof id === 'string')
    : []
  const quizBest =
    typeof record.quizBest === 'number' && Number.isFinite(record.quizBest) ? record.quizBest : null
  return { seenSymbolIds, quizBest }
}

function writeProgress(scriptId: string, progress: ScriptProgress): void {
  if (!canUseLocalStorage()) return
  try {
    window.localStorage.setItem(storageKey(scriptId), JSON.stringify(progress))
  } catch {
    return
  }
}

export function loadScriptProgress(scriptId: string): ScriptProgress {
  if (!canUseLocalStorage()) return emptyProgress()
  try {
    const raw = window.localStorage.getItem(storageKey(scriptId))
    if (!raw) return emptyProgress()
    return normalizeProgress(JSON.parse(raw))
  } catch {
    return emptyProgress()
  }
}

export function markSymbolSeen(scriptId: string, symbolId: string): ScriptProgress {
  const progress = loadScriptProgress(scriptId)
  if (progress.seenSymbolIds.includes(symbolId)) return progress
  const next: ScriptProgress = { ...progress, seenSymbolIds: [...progress.seenSymbolIds, symbolId] }
  writeProgress(scriptId, next)
  return next
}

export function recordQuizScore(scriptId: string, score: number): ScriptProgress {
  const progress = loadScriptProgress(scriptId)
  const quizBest = progress.quizBest === null ? score : Math.max(progress.quizBest, score)
  const next: ScriptProgress = { ...progress, quizBest }
  writeProgress(scriptId, next)
  return next
}
