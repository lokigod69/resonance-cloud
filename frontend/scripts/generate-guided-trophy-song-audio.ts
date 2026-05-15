/**
 * Prototype one-off KIE/Suno audio generation for Guided Trophy Songs.
 *
 * Run from frontend: npx tsx scripts/generate-guided-trophy-song-audio.ts
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { GUIDED_TROPHY_SONGS } from '../src/data/guidedTrophySongs.ts'

type ManifestEntry = {
  catalogId: string
  pathId: string
  segment: number
  vibe: string
  songStyleLabel: string
  musicCaption: string
  kieTaskId: string | null
  providerStatus: 'pending' | 'success' | 'error'
  candidateAProviderUrl: string | null
  candidateBProviderUrl?: string | null
  candidateAPublicUrl: string | null
  candidateBPublicUrl?: string | null
  activeCandidate: 'A'
  generatedAt: string
  error?: string | null
}

type Manifest = {
  generatedAt: string
  entries: ManifestEntry[]
}

const KIE_API_BASE = 'https://api.kie.ai/api/v1'
const POLL_INTERVAL_MS = 10_000
const MAX_POLL_MS = 15 * 60_000
const TARGET_IDS = new Set([
  'english-a1-practical-1-segment-1-bright-trophy-song',
  'english-a1-practical-1-segment-2-bright-trophy-song',
  'english-a1-practical-1-segment-1-wistful-trophy-song',
  'english-a1-practical-1-segment-2-wistful-trophy-song',
  'english-a1-practical-1-segment-1-sharp-trophy-song',
  'english-a1-practical-1-segment-2-sharp-trophy-song',
])

const manifestPath = fileURLToPath(new URL('../public/guided/trophy-songs/a1p1/manifest.json', import.meta.url))
const envPath = fileURLToPath(new URL('../../.env', import.meta.url))
const apiKey = loadKieApiKey()
const manifest = readManifest()

// Local Windows certificate revocation checks can fail for KIE/CDN while browser/curl works.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

async function main() {
  const rows = GUIDED_TROPHY_SONGS.filter((row) => TARGET_IDS.has(row.id))
  if (rows.length !== TARGET_IDS.size) {
    throw new Error(`Expected ${TARGET_IDS.size} target rows, found ${rows.length}`)
  }

  for (const row of rows) {
    assertProviderSafe(row.id, row.providerLyrics, row.displayLyrics, row.lyricsTranslationDe)
    const existing = getEntry(row.id)
    const candidateAPath = localCandidatePath(row.id, 'A')
    if (existing?.providerStatus === 'success' && existsSync(candidateAPath)) {
      console.log(`${row.id}: already has local candidate A, skipping submit`)
      continue
    }

    if (existing?.kieTaskId) {
      console.log(`${row.id}: reusing existing task ${existing.kieTaskId}`)
      continue
    }

    const taskId = await submitWithSingleRetry(row)
    upsertEntry({
      catalogId: row.id,
      pathId: row.pathId,
      segment: row.segment,
      vibe: row.vibe,
      songStyleLabel: row.songStyleLabel,
      musicCaption: row.musicCaption,
      kieTaskId: taskId,
      providerStatus: 'pending',
      candidateAProviderUrl: null,
      candidateBProviderUrl: null,
      candidateAPublicUrl: null,
      candidateBPublicUrl: null,
      activeCandidate: 'A',
      generatedAt: new Date().toISOString(),
      error: null,
    })
    writeManifest()
    console.log(`${row.id}: submitted ${taskId}`)
  }

  await pollPendingTasks()
  writeManifest()
}

async function submitWithSingleRetry(row: (typeof GUIDED_TROPHY_SONGS)[number]) {
  let lastError: unknown
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      return await submitRow(row)
    } catch (error) {
      lastError = error
      console.warn(`${row.id}: submit attempt ${attempt} failed technically: ${error instanceof Error ? error.message : String(error)}`)
      if (attempt === 2) break
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

async function submitRow(row: (typeof GUIDED_TROPHY_SONGS)[number]) {
  const payload = {
    prompt: row.providerLyrics,
    customMode: true,
    instrumental: false,
    model: 'V5_5',
    style: row.musicCaption.slice(0, 1000),
    title: row.id.slice(0, 80),
    vocalGender: 'f',
    callBackUrl: 'https://resonanz.pro/api/suno/callback',
  }

  const response = await fetch(`${KIE_API_BASE}/generate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`)
  }

  const result = await response.json() as { code?: number; data?: { taskId?: string } }
  if (result.code !== 200) {
    throw new Error(`KIE code ${result.code}: ${JSON.stringify(result).slice(0, 500)}`)
  }

  const taskId = result.data?.taskId
  if (!taskId) {
    throw new Error(`Missing taskId: ${JSON.stringify(result).slice(0, 500)}`)
  }
  return taskId
}

async function pollPendingTasks() {
  const startedAt = Date.now()
  while (Date.now() - startedAt < MAX_POLL_MS) {
    const pending = manifest.entries.filter((entry) => entry.providerStatus === 'pending' && entry.kieTaskId)
    if (pending.length === 0) return

    for (const entry of pending) {
      await pollEntry(entry)
      writeManifest()
    }

    if (manifest.entries.some((entry) => entry.providerStatus === 'pending')) {
      await sleep(POLL_INTERVAL_MS)
    }
  }

  for (const entry of manifest.entries.filter((candidate) => candidate.providerStatus === 'pending')) {
    entry.providerStatus = 'error'
    entry.error = `Timed out after ${MAX_POLL_MS / 1000}s waiting for KIE/Suno`
  }
}

async function pollEntry(entry: ManifestEntry) {
  const response = await fetch(`${KIE_API_BASE}/generate/record-info?taskId=${encodeURIComponent(entry.kieTaskId ?? '')}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!response.ok) {
    console.warn(`${entry.catalogId}: poll HTTP ${response.status}`)
    return
  }

  const result = await response.json() as {
    data?: {
      status?: string
      errorMessage?: string
      response?: { sunoData?: Array<{ audioUrl?: string; errorMessage?: string }> }
    }
  }
  const data = result.data ?? {}
  const status = String(data.status ?? '').toUpperCase()
  console.log(`${entry.catalogId}: provider status ${status || 'unknown'}`)

  if (status === 'SUCCESS') {
    const sunoData = data.response?.sunoData ?? []
    const audioA = sunoData[0]?.audioUrl ?? null
    const audioB = sunoData[1]?.audioUrl ?? null
    if (!audioA) {
      entry.providerStatus = 'error'
      entry.error = 'KIE/Suno returned SUCCESS without candidate A audioUrl'
      return
    }

    await downloadAudio(audioA, localCandidatePath(entry.catalogId, 'A'))
    entry.candidateAProviderUrl = audioA
    entry.candidateAPublicUrl = publicCandidateUrl(entry.catalogId, 'A')

    if (audioB) {
      await downloadAudio(audioB, localCandidatePath(entry.catalogId, 'B'))
      entry.candidateBProviderUrl = audioB
      entry.candidateBPublicUrl = publicCandidateUrl(entry.catalogId, 'B')
    }

    entry.providerStatus = 'success'
    entry.generatedAt = new Date().toISOString()
    entry.error = null
    return
  }

  if (['FAIL', 'FAILED', 'ERROR', 'CREATE_TASK_FAILED', 'GENERATE_AUDIO_FAILED', 'CALLBACK_EXCEPTION', 'SENSITIVE_WORD_ERROR'].includes(status)) {
    const nestedError = data.response?.sunoData?.[0]?.errorMessage
    entry.providerStatus = 'error'
    entry.error = data.errorMessage ?? nestedError ?? `KIE/Suno task failed with status ${status}`
  }
}

async function downloadAudio(url: string, targetPath: string) {
  mkdirSync(dirname(targetPath), { recursive: true })
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Download failed ${response.status}: ${url}`)
  }
  const bytes = new Uint8Array(await response.arrayBuffer())
  if (bytes.length === 0) {
    throw new Error(`Downloaded empty MP3: ${url}`)
  }
  writeFileSync(targetPath, bytes)
}

function assertProviderSafe(catalogId: string, providerLyrics: string, displayLyrics: string, lyricsTranslationDe: string) {
  if (providerLyrics.includes('<<') || providerLyrics.includes('>>')) {
    throw new Error(`${catalogId}: providerLyrics contains wrapper markers`)
  }
  if (displayLyrics.includes('<<') || displayLyrics.includes('>>')) {
    throw new Error(`${catalogId}: displayLyrics contains wrapper markers`)
  }
  if (!lyricsTranslationDe.trim()) {
    throw new Error(`${catalogId}: lyricsTranslationDe is missing`)
  }
}

function getEntry(catalogId: string) {
  return manifest.entries.find((entry) => entry.catalogId === catalogId)
}

function upsertEntry(entry: ManifestEntry) {
  const index = manifest.entries.findIndex((candidate) => candidate.catalogId === entry.catalogId)
  if (index >= 0) {
    manifest.entries[index] = entry
  } else {
    manifest.entries.push(entry)
  }
}

function localCandidatePath(catalogId: string, candidate: 'A' | 'B') {
  return fileURLToPath(new URL(`../public${publicCandidateUrl(catalogId, candidate)}`, import.meta.url))
}

function publicCandidateUrl(catalogId: string, candidate: 'A' | 'B') {
  return `/guided/trophy-songs/a1p1/${catalogId}/candidate-${candidate.toLowerCase()}.mp3`
}

function readManifest(): Manifest {
  if (!existsSync(manifestPath)) {
    return { generatedAt: new Date().toISOString(), entries: [] }
  }
  return JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest
}

function writeManifest() {
  manifest.generatedAt = new Date().toISOString()
  mkdirSync(dirname(manifestPath), { recursive: true })
  manifest.entries.sort((left, right) => left.catalogId.localeCompare(right.catalogId))
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
}

function loadKieApiKey() {
  const existing = process.env.KIE_API_KEY
  if (existing) return existing
  if (existsSync(envPath)) {
    const env = readFileSync(envPath, 'utf8')
    for (const line of env.split(/\r?\n/)) {
      const match = /^KIE_API_KEY=(.*)$/.exec(line)
      if (match?.[1]) return match[1].trim().replace(/^["']|["']$/g, '')
    }
  }
  throw new Error('KIE_API_KEY is not set')
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
