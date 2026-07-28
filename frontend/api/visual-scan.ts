import { optionsResponse } from './_shared/cors'
import { requireSupabaseUser, type AuthenticatedUser } from './_shared/auth'
import { ApiError, apiErrorResponse, errorResponse, jsonResponse, readJsonWithLimit } from './_shared/http'
import { consumeApiQuota } from './_shared/quota'
import { consumeFeatureAllowance, recordFeatureUsage, resolveEntitlements } from './_shared/entitlements'
import { geminiVisionCost } from './_shared/usageCost'
import { writeUsageEvent, type UsageEventInput } from './_shared/usageEvents'
import {
  createGeminiVisualScanProvider,
  GEMINI_VISION_MODEL,
  type GeminiVisionUsageLike,
  type VisualScanConfidence,
  type VisualScanItem,
  type VisualScanKind,
  type VisualScanProvider,
  type VisualScanProviderResult,
  type VisualScanRequest,
  type VisualScanResponse,
  type VisualScanSafety,
} from './_shared/visualScanProvider'

export type { VisualScanProvider } from './_shared/visualScanProvider'

const VISUAL_SCAN_BODY_MAX_BYTES = 2 * 1024 * 1024
const MAX_IMAGE_BASE64_LENGTH = 1_900_000
const MAX_DECODED_IMAGE_BYTES = 1_450_000
const MAX_LANGUAGE_LENGTH = 50
const MAX_LEVEL_LENGTH = 24
const MAX_TEXT_FIELD_LENGTH = 320
const MAX_EXAMPLE_LENGTH = 600
const MAX_ITEMS = 8

type HandlerDeps = {
  requireUser: (req: Request) => Promise<AuthenticatedUser>
  consumeQuota: (userId: string) => Promise<unknown>
  /** Tier allowance debit (optional so contract tests with custom deps keep the pre-tier behavior). */
  consumeAllowance?: (userId: string) => Promise<void>
  writeUsage: (input: UsageEventInput) => Promise<void>
  provider: VisualScanProvider
}

// One scan = one allowance unit, debited at request time (the debit IS the
// authorization; a rare provider failure after debit costs the user one scan —
// accepted for v1, the daily quota rail keeps abuse bounded either way).
async function consumeLensAllowance(userId: string): Promise<void> {
  const entitlements = await resolveEntitlements(userId)
  if (entitlements.isAdmin) {
    await recordFeatureUsage(userId, 'lens_scans', entitlements.periodKey, 1)
    return
  }

  const debit = await consumeFeatureAllowance(
    userId,
    'lens_scans',
    entitlements.periodKey,
    1,
    entitlements.grants.lensScans,
  )
  if (!debit.allowed) {
    throw new ApiError(403, 'Lens allowance is used up', {
      code: entitlements.plan === 'free' ? 'lens_trial_exhausted' : 'lens_allowance_exhausted',
      plan: entitlements.plan,
      used: debit.used,
      limit: entitlements.grants.lensScans,
    })
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readString(value: unknown, field: string, maxLength: number, required = true): string {
  if (value === undefined || value === null) {
    if (required) throw new ApiError(400, `${field} is required`)
    return ''
  }
  if (typeof value !== 'string') throw new ApiError(400, `${field} must be a string`)
  const trimmed = value.trim()
  if (required && !trimmed) throw new ApiError(400, `${field} is required`)
  if (trimmed.length > maxLength) throw new ApiError(400, `${field} is too long`)
  return trimmed
}

function stripDataUrl(value: string): string {
  const match = value.match(/^data:image\/(?:jpeg|jpg);base64,(.+)$/i)
  return match ? match[1] : value
}

function decodedBase64Length(value: string): number {
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(value) || value.length % 4 !== 0) {
    throw new ApiError(422, 'image is malformed')
  }
  const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0
  return (value.length / 4) * 3 - padding
}

function validateBody(raw: unknown): VisualScanRequest {
  if (!isObject(raw)) throw new ApiError(400, 'Request body must be an object')
  const allowedKeys = new Set(['image', 'targetLanguage', 'baseLanguage', 'level', 'hint'])
  for (const key of Object.keys(raw)) {
    if (!allowedKeys.has(key)) throw new ApiError(400, `Unexpected field: ${key}`)
  }

  const image = stripDataUrl(readString(raw.image, 'image', MAX_IMAGE_BASE64_LENGTH))
  if (image.length > MAX_IMAGE_BASE64_LENGTH) throw new ApiError(413, 'image is too large')
  const decodedLength = decodedBase64Length(image)
  if (decodedLength < 20) throw new ApiError(422, 'image is too small')
  if (decodedLength > MAX_DECODED_IMAGE_BYTES) throw new ApiError(413, 'image is too large')

  let hint: VisualScanRequest['hint']
  if (raw.hint !== undefined && raw.hint !== null) {
    if (raw.hint !== 'object' && raw.hint !== 'text') throw new ApiError(400, 'hint is invalid')
    hint = raw.hint
  }

  return {
    image,
    targetLanguage: readString(raw.targetLanguage, 'targetLanguage', MAX_LANGUAGE_LENGTH),
    baseLanguage: readString(raw.baseLanguage, 'baseLanguage', MAX_LANGUAGE_LENGTH),
    level: readString(raw.level, 'level', MAX_LEVEL_LENGTH, false) || undefined,
    hint,
  }
}

function isKind(value: unknown): value is VisualScanKind {
  return value === 'object' || value === 'text' || value === 'menu' || value === 'scene' || value === 'unsupported'
}

function isSafety(value: unknown): value is VisualScanSafety {
  return value === 'person' || value === 'sensitive_document'
}

function normalizeConfidence(value: unknown): VisualScanConfidence {
  if (value === 'high' || value === 'medium' || value === 'low') return value
  return 'medium'
}

function cleanOptionalString(value: unknown, maxLength = MAX_TEXT_FIELD_LENGTH): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, maxLength) : undefined
}

function normalizeItem(raw: unknown): VisualScanItem | null {
  if (!isObject(raw)) return null
  const targetText = cleanOptionalString(raw.target_text)
  const baseText = cleanOptionalString(raw.base_text)
  if (!targetText || !baseText) return null

  const alternates = Array.isArray(raw.alternates)
    ? raw.alternates.flatMap((alternate) => {
      if (!isObject(alternate)) return []
      const target_text = cleanOptionalString(alternate.target_text)
      const base_text = cleanOptionalString(alternate.base_text)
      return target_text && base_text ? [{ target_text, base_text }] : []
    }).slice(0, 2)
    : []

  return {
    target_text: targetText,
    base_text: baseText,
    ...(cleanOptionalString(raw.transliteration) ? { transliteration: cleanOptionalString(raw.transliteration) } : {}),
    ...(cleanOptionalString(raw.ipa) ? { ipa: cleanOptionalString(raw.ipa) } : {}),
    ...(cleanOptionalString(raw.pos) ? { pos: cleanOptionalString(raw.pos) } : {}),
    ...(cleanOptionalString(raw.article) ? { article: cleanOptionalString(raw.article) } : {}),
    ...(cleanOptionalString(raw.example, MAX_EXAMPLE_LENGTH) ? { example: cleanOptionalString(raw.example, MAX_EXAMPLE_LENGTH) } : {}),
    ...(cleanOptionalString(raw.example_gloss, MAX_EXAMPLE_LENGTH) ? { example_gloss: cleanOptionalString(raw.example_gloss, MAX_EXAMPLE_LENGTH) } : {}),
    confidence: normalizeConfidence(raw.confidence),
    ...(alternates.length ? { alternates } : {}),
  }
}

function normalizeProviderResponse(raw: unknown): VisualScanResponse {
  if (!isObject(raw)) throw new ApiError(422, 'Vision model returned malformed JSON')
  if (!isKind(raw.kind)) throw new ApiError(422, 'Vision model returned unsupported kind')

  const safety = raw.safety === null || raw.safety === undefined
    ? null
    : isSafety(raw.safety)
      ? raw.safety
      : null

  if (safety) {
    return { kind: raw.kind === 'unsupported' ? 'unsupported' : raw.kind, safety, items: [] }
  }

  const maxItems = raw.kind === 'text' || raw.kind === 'menu' ? MAX_ITEMS : 1
  const items = Array.isArray(raw.items)
    ? raw.items.flatMap((item) => {
      const normalized = normalizeItem(item)
      return normalized ? [normalized] : []
    }).slice(0, maxItems)
    : []

  if (raw.kind !== 'unsupported' && items.length === 0) {
    throw new ApiError(422, 'Vision model returned no usable lexical items')
  }

  return { kind: raw.kind, safety: null, items }
}

function usageFromResult(raw: unknown): GeminiVisionUsageLike | null {
  return isObject(raw) && isObject(raw.usage) ? raw.usage : null
}

function modelFromResult(raw: unknown): { provider: string; model: string } {
  if (isObject(raw)) {
    const provider = typeof raw.provider === 'string' ? raw.provider : 'gemini'
    const model = typeof raw.model === 'string' ? raw.model : GEMINI_VISION_MODEL
    return { provider, model }
  }
  return { provider: 'gemini', model: GEMINI_VISION_MODEL }
}

function createDefaultDeps(): HandlerDeps {
  return {
    requireUser: requireSupabaseUser,
    consumeQuota: (userId) => consumeApiQuota(userId, 'visual_scan'),
    consumeAllowance: consumeLensAllowance,
    writeUsage: writeUsageEvent,
    provider: createGeminiVisualScanProvider(),
  }
}

export function createVisualScanPostHandler(deps: HandlerDeps = createDefaultDeps()) {
  return async function POST(req: Request): Promise<Response> {
    let body: VisualScanRequest
    let userId = ''
    try {
      const user = await deps.requireUser(req)
      userId = user.id
      const rawBody = await readJsonWithLimit<unknown>(req, VISUAL_SCAN_BODY_MAX_BYTES)
      body = validateBody(rawBody)
      await deps.consumeQuota(user.id)
      if (deps.consumeAllowance) {
        await deps.consumeAllowance(user.id)
      }
    } catch (error) {
      if (error instanceof ApiError) return apiErrorResponse(req, error)
      console.error('[visual-scan] request gate failed:', error instanceof Error ? error.message : error)
      return errorResponse(req, 400, 'Invalid request')
    }

    const startedAt = Date.now()
    try {
      const rawResult: VisualScanProviderResult = await deps.provider.scan(body)
      const result = normalizeProviderResponse(rawResult)
      const usage = usageFromResult(rawResult)
      const cost = geminiVisionCost(usage)
      const model = modelFromResult(rawResult)
      await deps.writeUsage({
        userId,
        feature: 'lens',
        stage: 'visual_scan',
        status: 'success',
        modelProvider: model.provider,
        modelName: model.model,
        costUsd: cost.costUsd,
        tokensIn: cost.tokensIn,
        tokensOut: cost.tokensOut,
        images: 1,
        latencyMs: Date.now() - startedAt,
        metadata: { kind: result.kind, safety: result.safety, items_returned: result.items.length },
      })
      return jsonResponse(req, result, 200)
    } catch (error) {
      const status = error instanceof ApiError ? error.status : 502
      const message = error instanceof ApiError ? error.message : 'Vision service unavailable'
      await deps.writeUsage({
        userId,
        feature: 'lens',
        stage: 'visual_scan',
        status: status === 422 ? 'partial' : 'failed',
        modelProvider: 'gemini',
        modelName: GEMINI_VISION_MODEL,
        images: 1,
        latencyMs: Date.now() - startedAt,
        errorType: error instanceof Error ? error.message.slice(0, 80) : 'unknown',
      })
      if (error instanceof ApiError) return apiErrorResponse(req, error)
      console.error('[visual-scan] provider failed:', error instanceof Error ? error.message : error)
      return errorResponse(req, 502, message)
    }
  }
}

export async function OPTIONS(req?: Request): Promise<Response> {
  return optionsResponse(req)
}

export const POST = createVisualScanPostHandler()
