import { corsHeaders, optionsResponse } from './_shared/cors'
import { ApiError, apiErrorResponse, errorResponse, jsonResponse, readJsonWithLimit, sanitizedProviderError } from './_shared/http'
import { requireSupabaseUser } from './_shared/auth'
import { consumeApiQuota } from './_shared/quota'
import { writeUsageEvent } from './_shared/usageEvents'
import { groqSttCost } from './_shared/usageCost'

type GuidedTranscribeBody = {
  audio_base64: string
  mime_type: string
  language?: 'en-US' | 'en-GB'
}

const GUIDED_TRANSCRIBE_BODY_MAX_BYTES = 4 * 1024 * 1024
const MAX_AUDIO_BASE64_LENGTH = 3_200_000
const MAX_DECODED_AUDIO_BYTES = 2.4 * 1024 * 1024
const SUPPORTED_MIME_TYPES = [
  'audio/webm',
  'audio/webm;codecs=opus',
  'audio/mp4',
  'audio/mp4;codecs=mp4a',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/ogg;codecs=opus',
]

export async function OPTIONS(req?: Request): Promise<Response> {
  return optionsResponse(req)
}

export function GET(req: Request): Response {
  return methodNotAllowed(req)
}

export function PUT(req: Request): Response {
  return methodNotAllowed(req)
}

export function PATCH(req: Request): Response {
  return methodNotAllowed(req)
}

export function DELETE(req: Request): Response {
  return methodNotAllowed(req)
}

export async function POST(req: Request): Promise<Response> {
  let body: GuidedTranscribeBody
  let userId = ''
  try {
    const rawBody = await readJsonWithLimit<unknown>(req, GUIDED_TRANSCRIBE_BODY_MAX_BYTES)
    body = validateGuidedTranscribeBody(rawBody)
    const user = await requireSupabaseUser(req)
    userId = user.id
    await consumeApiQuota(user.id, 'guided_transcribe')
  } catch (err) {
    if (err instanceof ApiError) return apiErrorResponse(req, err)
    console.error('[guided-transcribe] Request gate failed:', err instanceof Error ? err.message : err)
    return errorResponse(req, 400, 'Invalid request')
  }

  const groqKey = process.env.GROQ_API_KEY
  if (!groqKey) {
    return errorResponse(req, 500, 'Speech transcription service is not configured')
  }

  const startedAt = Date.now()
  try {
    const audioBuffer = Buffer.from(body.audio_base64, 'base64')
    const extension = getAudioExtension(body.mime_type)
    const audioBlob = new Blob([audioBuffer], { type: body.mime_type })
    const formData = new FormData()
    formData.append('file', audioBlob, `guided-today.${extension}`)
    formData.append('model', 'whisper-large-v3')
    // verbose_json returns the real audio `duration` (used for cost metering)
    // alongside `text` — json returns text only.
    formData.append('response_format', 'verbose_json')
    formData.append('language', 'en')

    const sttRes = await fetchWithTimeout('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${groqKey}` },
      body: formData,
    }, 15000)

    if (!sttRes.ok) {
      await writeUsageEvent({
        userId, feature: 'guided_transcribe', stage: 'guided', status: 'failed',
        modelProvider: 'groq', modelName: 'whisper-large-v3',
        latencyMs: Date.now() - startedAt, errorType: `http_${sttRes.status}`,
      })
      return sanitizedProviderError(req, 'Speech transcription service unavailable')
    }

    const sttJson = await sttRes.json() as { text?: string; duration?: number }
    const audioSeconds = typeof sttJson.duration === 'number' ? sttJson.duration : null
    await writeUsageEvent({
      userId, feature: 'guided_transcribe', stage: 'guided', status: 'success',
      modelProvider: 'groq', modelName: 'whisper-large-v3',
      audioSeconds, costUsd: groqSttCost(audioSeconds), latencyMs: Date.now() - startedAt,
    })
    return jsonResponse(req, { transcript: sttJson.text?.trim() ?? '' }, 200)
  } catch (err) {
    console.error('[guided-transcribe] STT failed:', err instanceof Error ? err.message : err)
    await writeUsageEvent({
      userId, feature: 'guided_transcribe', stage: 'guided', status: 'failed',
      modelProvider: 'groq', modelName: 'whisper-large-v3',
      latencyMs: Date.now() - startedAt, errorType: err instanceof Error ? err.name : 'unknown',
    })
    return sanitizedProviderError(req, 'Speech transcription service unavailable')
  }
}

function methodNotAllowed(req: Request): Response {
  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: {
      ...corsHeaders(req),
      Allow: 'POST, OPTIONS',
      'Content-Type': 'application/json',
    },
  })
}

function validateGuidedTranscribeBody(raw: unknown): GuidedTranscribeBody {
  if (!isObject(raw)) throw new ApiError(400, 'Request body must be an object')
  if ('history' in raw || 'transcript' in raw || 'messages' in raw) {
    throw new ApiError(400, 'Conversation history is not supported')
  }

  const audioBase64 = readString(raw.audio_base64, 'audio_base64', MAX_AUDIO_BASE64_LENGTH, true)
  const decodedLength = decodedBase64Length(audioBase64)
  if (decodedLength < 100) {
    throw new ApiError(400, 'audio_base64 is too small')
  }
  if (decodedLength > MAX_DECODED_AUDIO_BYTES) {
    throw new ApiError(413, 'audio_base64 is too large')
  }

  const mimeType = normalizeMimeType(readString(raw.mime_type, 'mime_type', 128, true))
  if (!isSupportedMimeType(mimeType)) {
    throw new ApiError(400, 'Unsupported mime_type')
  }

  let language: GuidedTranscribeBody['language']
  if (raw.language !== undefined) {
    const rawLanguage = readString(raw.language, 'language', 16, true)
    if (rawLanguage !== 'en-US' && rawLanguage !== 'en-GB') {
      throw new ApiError(400, 'Unsupported language')
    }
    language = rawLanguage
  }

  return {
    audio_base64: audioBase64,
    mime_type: mimeType,
    language,
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readString(value: unknown, field: string, maxLength: number, required = false): string {
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

function decodedBase64Length(value: string): number {
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(value) || value.length % 4 !== 0) {
    throw new ApiError(400, 'audio_base64 is malformed')
  }
  const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0
  return (value.length / 4) * 3 - padding
}

function normalizeMimeType(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '')
}

function isSupportedMimeType(mimeType: string): boolean {
  return SUPPORTED_MIME_TYPES.includes(mimeType)
    || mimeType.startsWith('audio/webm;codecs=')
    || mimeType.startsWith('audio/mp4;codecs=')
    || mimeType.startsWith('audio/ogg;codecs=')
}

function getAudioExtension(mimeType: string): 'webm' | 'mp4' | 'mp3' | 'wav' | 'ogg' {
  if (mimeType.includes('mp4')) return 'mp4'
  if (mimeType.includes('mpeg')) return 'mp3'
  if (mimeType.includes('wav')) return 'wav'
  if (mimeType.includes('ogg')) return 'ogg'
  return 'webm'
}

function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer))
}
