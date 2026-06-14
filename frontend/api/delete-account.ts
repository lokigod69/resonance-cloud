import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { requireSupabaseUser } from './_shared/auth'
import { corsHeaders } from './_shared/cors'
import { ApiError, apiErrorResponse, errorResponse, jsonResponse } from './_shared/http'

type StorageBucket =
  | 'profile-avatars'
  | 'voice-samples'
  | 'tts-pronunciations'
  | 'guided-tts'
  | 'videos'
  | 'audio'
  | 'pipeline-events'

type StorageFailure = {
  bucket: StorageBucket
  objectPath?: string
  phase: 'collect' | 'remove'
  error: string
}

type StorageCleanupSummary = {
  attempted: number
  deleted: number
  failed: StorageFailure[]
}

type StorageListItem = {
  name: string
  id?: string | null
  metadata?: Record<string, unknown> | null
}

type WordStorageRow = {
  id: string
  video_url: string | null
  thumbnail_url: string | null
  video_url_b: string | null
  thumbnail_url_b: string | null
  suno_storage_url: string | null
  suno_storage_url_b: string | null
}

type PipelineEventRow = {
  response_ref: string | null
}

type WordTtsAssetRow = {
  word_id: string
  tts_asset_id: string
}

type LinkedWordOwnerRow = {
  id: string
  user_id: string | null
}

type TtsAssetRow = {
  id: string
  storage_bucket: string | null
  storage_path: string | null
}

const STORAGE_BUCKETS: StorageBucket[] = [
  'profile-avatars',
  'voice-samples',
  'tts-pronunciations',
  'guided-tts',
  'videos',
  'audio',
  'pipeline-events',
]

const PREFIX_SCANNED_BUCKETS: StorageBucket[] = ['videos', 'audio']

const PUBLIC_STORAGE_URL_MARKER = '/storage/v1/object/public/'
const STORAGE_REMOVE_BATCH_SIZE = 100
const QUERY_PAGE_SIZE = 1000

type AdminClient = SupabaseClient

function getSupabaseAdminEnv() {
  return {
    url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  }
}

function createSupabaseAdminClient(): AdminClient {
  const { url, serviceKey } = getSupabaseAdminEnv()
  if (!url || !serviceKey) {
    throw new ApiError(500, 'Account deletion is not configured')
  }

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

function deleteAccountCorsHeaders(req?: Request): HeadersInit {
  return {
    ...corsHeaders(req),
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
  }
}

function withDeleteAccountCors(req: Request, response: Response): Response {
  response.headers.set('Access-Control-Allow-Methods', 'DELETE, OPTIONS')
  const localHeaders = deleteAccountCorsHeaders(req) as Record<string, string>
  for (const [key, value] of Object.entries(localHeaders)) {
    if (!response.headers.has(key)) {
      response.headers.set(key, value)
    }
  }
  return response
}

export async function OPTIONS(req: Request): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: deleteAccountCorsHeaders(req),
  })
}

export async function DELETE(req: Request): Promise<Response> {
  try {
    const user = await requireSupabaseUser(req)
    const admin = createSupabaseAdminClient()

    await clearInviteCodeCreatorReferences(admin, user.id)
    const storageCleanup = await deleteAccountStorageObjects(admin, user.id)

    const { error } = await admin.auth.admin.deleteUser(user.id)
    if (error) {
      throw new ApiError(502, 'Unable to delete account', {
        storageCleanup,
      })
    }

    return withDeleteAccountCors(req, jsonResponse(req, {
      success: true,
      storageCleanup,
    }))
  } catch (error) {
    if (error instanceof ApiError) {
      return withDeleteAccountCors(req, apiErrorResponse(req, error))
    }
    console.error('[delete-account] Account deletion failed', error)
    return withDeleteAccountCors(req, errorResponse(req, 500, 'Unable to delete account'))
  }
}

async function clearInviteCodeCreatorReferences(admin: AdminClient, userId: string): Promise<void> {
  const { error } = await admin
    .from('invite_codes')
    .update({ created_by: null })
    .eq('created_by', userId)

  if (error) {
    console.error('[delete-account] invite_codes.created_by cleanup failed', error)
    throw new ApiError(500, 'Unable to prepare account deletion')
  }
}

async function deleteAccountStorageObjects(admin: AdminClient, userId: string): Promise<StorageCleanupSummary> {
  const objectsByBucket = createBucketPathMap()
  const failures: StorageFailure[] = []

  addStoragePath(objectsByBucket, 'profile-avatars', `${userId}/avatar.jpg`)

  await collectPrefixOwnedObjects(admin, userId, objectsByBucket, failures)
  const wordRows = await collectWordStorageObjects(admin, userId, objectsByBucket, failures)
  await collectPipelineEventObjects(admin, userId, objectsByBucket, failures)
  await collectExclusivePronunciationObjects(admin, userId, wordRows.map(row => row.id), objectsByBucket, failures)

  let attempted = 0
  let deleted = 0
  for (const bucket of STORAGE_BUCKETS) {
    const objectPaths = Array.from(objectsByBucket[bucket]).filter(isSafeStoragePath)
    attempted += objectPaths.length
    for (const batch of chunks(objectPaths, STORAGE_REMOVE_BATCH_SIZE)) {
      try {
        const { error } = await admin.storage.from(bucket).remove(batch)
        if (error) {
          const message = storageErrorMessage(error)
          for (const objectPath of batch) {
            failures.push({ bucket, objectPath, phase: 'remove', error: message })
          }
          continue
        }
      } catch (error) {
        const message = storageErrorMessage(error)
        for (const objectPath of batch) {
          failures.push({ bucket, objectPath, phase: 'remove', error: message })
        }
        continue
      }
      deleted += batch.length
    }
  }

  return { attempted, deleted, failed: failures }
}

function createBucketPathMap(): Record<StorageBucket, Set<string>> {
  return STORAGE_BUCKETS.reduce((acc, bucket) => {
    acc[bucket] = new Set<string>()
    return acc
  }, {} as Record<StorageBucket, Set<string>>)
}

async function collectPrefixOwnedObjects(
  admin: AdminClient,
  userId: string,
  objectsByBucket: Record<StorageBucket, Set<string>>,
  failures: StorageFailure[],
): Promise<void> {
  for (const bucket of PREFIX_SCANNED_BUCKETS) {
    try {
      const paths = await listStoragePaths(admin, bucket, userId)
      for (const path of paths) {
        addStoragePath(objectsByBucket, bucket, path)
      }
    } catch (error) {
      failures.push({
        bucket,
        objectPath: `${userId}/`,
        phase: 'collect',
        error: storageErrorMessage(error),
      })
    }
  }
}

async function collectWordStorageObjects(
  admin: AdminClient,
  userId: string,
  objectsByBucket: Record<StorageBucket, Set<string>>,
  failures: StorageFailure[],
): Promise<WordStorageRow[]> {
  try {
    const rows = await fetchAll<WordStorageRow>(() => admin
      .from('words')
      .select('id,video_url,thumbnail_url,video_url_b,thumbnail_url_b,suno_storage_url,suno_storage_url_b')
      .eq('user_id', userId))

    for (const row of rows) {
      addStorageUrl(objectsByBucket, 'videos', row.video_url)
      addStorageUrl(objectsByBucket, 'videos', row.thumbnail_url)
      addStorageUrl(objectsByBucket, 'videos', row.video_url_b)
      addStorageUrl(objectsByBucket, 'videos', row.thumbnail_url_b)
      addStorageUrl(objectsByBucket, 'audio', row.suno_storage_url)
      addStorageUrl(objectsByBucket, 'audio', row.suno_storage_url_b)
    }

    return rows
  } catch (error) {
    failures.push({
      bucket: 'videos',
      phase: 'collect',
      error: storageErrorMessage(error),
    })
    failures.push({
      bucket: 'audio',
      phase: 'collect',
      error: storageErrorMessage(error),
    })
    return []
  }
}

async function collectPipelineEventObjects(
  admin: AdminClient,
  userId: string,
  objectsByBucket: Record<StorageBucket, Set<string>>,
  failures: StorageFailure[],
): Promise<void> {
  try {
    const rows = await fetchAll<PipelineEventRow>(() => admin
      .from('pipeline_events')
      .select('response_ref')
      .eq('user_id', userId)
      .not('response_ref', 'is', null))

    for (const row of rows) {
      addStoragePath(objectsByBucket, 'pipeline-events', row.response_ref)
    }
  } catch (error) {
    failures.push({
      bucket: 'pipeline-events',
      phase: 'collect',
      error: storageErrorMessage(error),
    })
  }
}

async function collectExclusivePronunciationObjects(
  admin: AdminClient,
  userId: string,
  wordIds: string[],
  objectsByBucket: Record<StorageBucket, Set<string>>,
  failures: StorageFailure[],
): Promise<void> {
  if (wordIds.length === 0) return

  try {
    const userLinks = await fetchRowsInChunks<WordTtsAssetRow>(
      wordIds,
      ids => admin
        .from('word_tts_assets')
        .select('word_id,tts_asset_id')
        .in('word_id', ids),
    )
    const candidateAssetIds = unique(userLinks.map(row => row.tts_asset_id).filter(Boolean))
    if (candidateAssetIds.length === 0) return

    const allLinks = await fetchRowsInChunks<WordTtsAssetRow>(
      candidateAssetIds,
      ids => admin
        .from('word_tts_assets')
        .select('word_id,tts_asset_id')
        .in('tts_asset_id', ids),
    )
    const linkedWordIds = unique(allLinks.map(row => row.word_id).filter(Boolean))
    const linkedWords = await fetchRowsInChunks<LinkedWordOwnerRow>(
      linkedWordIds,
      ids => admin
        .from('words')
        .select('id,user_id')
        .in('id', ids),
    )

    const ownerByWordId = new Map(linkedWords.map(row => [row.id, row.user_id]))
    const linksByAssetId = groupBy(allLinks, row => row.tts_asset_id)
    const exclusiveAssetIds = candidateAssetIds.filter(assetId => {
      const links = linksByAssetId.get(assetId) ?? []
      return links.length > 0 && links.every(link => ownerByWordId.get(link.word_id) === userId)
    })
    if (exclusiveAssetIds.length === 0) return

    const assets = await fetchRowsInChunks<TtsAssetRow>(
      exclusiveAssetIds,
      ids => admin
        .from('tts_assets')
        .select('id,storage_bucket,storage_path')
        .in('id', ids),
    )

    await deleteWordTtsLinks(admin, wordIds, exclusiveAssetIds)
    await deleteTtsAssets(admin, exclusiveAssetIds)

    for (const asset of assets) {
      if (asset.storage_bucket === 'tts-pronunciations') {
        addStoragePath(objectsByBucket, 'tts-pronunciations', asset.storage_path)
      }
    }
  } catch (error) {
    failures.push({
      bucket: 'tts-pronunciations',
      phase: 'collect',
      error: storageErrorMessage(error),
    })
  }
}

async function deleteWordTtsLinks(
  admin: AdminClient,
  wordIds: string[],
  assetIds: string[],
): Promise<void> {
  for (const wordIdChunk of chunks(unique(wordIds), QUERY_PAGE_SIZE)) {
    for (const assetIdChunk of chunks(unique(assetIds), QUERY_PAGE_SIZE)) {
      const { error } = await admin
        .from('word_tts_assets')
        .delete()
        .in('word_id', wordIdChunk)
        .in('tts_asset_id', assetIdChunk)

      if (error) throw error
    }
  }
}

async function deleteTtsAssets(
  admin: AdminClient,
  assetIds: string[],
): Promise<void> {
  for (const assetIdChunk of chunks(unique(assetIds), QUERY_PAGE_SIZE)) {
    const { error } = await admin
      .from('tts_assets')
      .delete()
      .in('id', assetIdChunk)

    if (error) throw error
  }
}

async function listStoragePaths(
  admin: AdminClient,
  bucket: StorageBucket,
  prefix: string,
): Promise<string[]> {
  const paths: string[] = []
  let offset = 0

  while (true) {
    const { data, error } = await admin.storage
      .from(bucket)
      .list(prefix, {
        limit: QUERY_PAGE_SIZE,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      })

    if (error) throw error
    const items = (data ?? []) as StorageListItem[]

    for (const item of items) {
      const objectPath = prefix ? `${prefix}/${item.name}` : item.name
      if (isStorageFolder(item)) {
        paths.push(...await listStoragePaths(admin, bucket, objectPath))
      } else {
        paths.push(objectPath)
      }
    }

    if (items.length < QUERY_PAGE_SIZE) break
    offset += QUERY_PAGE_SIZE
  }

  return paths
}

function isStorageFolder(item: StorageListItem): boolean {
  return item.id === null || item.metadata === null
}

async function fetchAll<T>(makeQuery: () => {
  range: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message?: string } | null }>
}): Promise<T[]> {
  const rows: T[] = []
  let offset = 0

  while (true) {
    const { data, error } = await makeQuery().range(offset, offset + QUERY_PAGE_SIZE - 1)
    if (error) throw error
    const page = data ?? []
    rows.push(...page)
    if (page.length < QUERY_PAGE_SIZE) break
    offset += QUERY_PAGE_SIZE
  }

  return rows
}

async function fetchRowsInChunks<T>(
  values: string[],
  makeQuery: (chunk: string[]) => {
    range: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message?: string } | null }>
  },
): Promise<T[]> {
  const rows: T[] = []
  for (const chunk of chunks(unique(values), QUERY_PAGE_SIZE)) {
    if (chunk.length === 0) continue
    let offset = 0
    while (true) {
      const { data, error } = await makeQuery(chunk).range(offset, offset + QUERY_PAGE_SIZE - 1)
      if (error) throw error
      const page = data ?? []
      rows.push(...page)
      if (page.length < QUERY_PAGE_SIZE) break
      offset += QUERY_PAGE_SIZE
    }
  }
  return rows
}

function addStorageUrl(
  objectsByBucket: Record<StorageBucket, Set<string>>,
  expectedBucket: StorageBucket,
  value: string | null,
): void {
  const parsed = parseStorageObjectUrl(value)
  if (!parsed || parsed.bucket !== expectedBucket) return
  addStoragePath(objectsByBucket, parsed.bucket, parsed.objectPath)
}

function addStoragePath(
  objectsByBucket: Record<StorageBucket, Set<string>>,
  bucket: StorageBucket,
  objectPath: string | null | undefined,
): void {
  const trimmed = objectPath?.trim()
  if (!trimmed || !isSafeStoragePath(trimmed)) return
  objectsByBucket[bucket].add(trimmed)
}

function parseStorageObjectUrl(value: string | null | undefined): { bucket: StorageBucket; objectPath: string } | null {
  if (!value) return null

  let pathname: string
  try {
    pathname = new URL(value).pathname
  } catch {
    return null
  }

  const markerIndex = pathname.indexOf(PUBLIC_STORAGE_URL_MARKER)
  if (markerIndex < 0) return null

  const storagePath = pathname.slice(markerIndex + PUBLIC_STORAGE_URL_MARKER.length)
  const slashIndex = storagePath.indexOf('/')
  if (slashIndex <= 0) return null

  const rawBucket = storagePath.slice(0, slashIndex)
  const bucket = STORAGE_BUCKETS.find(candidate => candidate === rawBucket)
  if (!bucket) return null

  const encodedObjectPath = storagePath.slice(slashIndex + 1)
  try {
    return {
      bucket,
      objectPath: decodeURIComponent(encodedObjectPath),
    }
  } catch {
    return null
  }
}

function isSafeStoragePath(value: string): boolean {
  if (
    !value
    || value.trim() !== value
    || value.startsWith('/')
    || value.includes('\\')
    || value.includes('\0')
    || value.includes('?')
    || value.includes('#')
    || /^[a-z][a-z0-9+.-]*:\/\//i.test(value)
    || value.startsWith('data:')
  ) {
    return false
  }

  const segments = value.split('/')
  if (segments.some(segment => segment.length === 0)) return false

  return segments.every(segment => {
    let decoded = segment
    try {
      decoded = decodeURIComponent(segment)
    } catch {
      return false
    }
    return decoded !== '.' && decoded !== '..' && !decoded.includes('/')
  })
}

function chunks<T>(values: T[], size: number): T[][] {
  const result: T[][] = []
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size))
  }
  return result
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values))
}

function groupBy<T>(values: T[], keyFn: (value: T) => string): Map<string, T[]> {
  const grouped = new Map<string, T[]>()
  for (const value of values) {
    const key = keyFn(value)
    const bucket = grouped.get(key)
    if (bucket) {
      bucket.push(value)
    } else {
      grouped.set(key, [value])
    }
  }
  return grouped
}

function storageErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message
  }
  return String(error)
}
